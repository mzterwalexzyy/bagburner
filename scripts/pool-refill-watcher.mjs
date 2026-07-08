/**
 * Long-running watcher (run under pm2 alongside the guest agents) that keeps the shared
 * wallet pool from going stale. Each guest's WalletCycler persists a monotonically
 * increasing `cursor` in data/logs/cursor-<guestId>.json — one increment per report cycle,
 * never reset, even though it wraps (via modulo) when picking the next wallet. Summed
 * across guests, that's exactly "how many total wallet-picks have happened since the pool
 * was last refreshed."
 *
 * Once that sum crosses REFILL_THRESHOLD (guests have collectively cycled through ~90% of
 * the pool), this fetches an entirely fresh batch of wallets (scripts/fetch-wallet-pool.ts
 * --fresh), resets every guest's cursor to 0, and restarts the guest pm2 processes so they
 * pick up the new pool from the top.
 *
 * Usage: node scripts/pool-refill-watcher.mjs
 * Expects: pm2-managed guest processes named bagburner-guest-0 .. bagburner-guest-<N-1>.
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dir, "..");
const LOGS_DIR = resolve(REPO_ROOT, "data/logs");
const POOL_PATH = resolve(REPO_ROOT, "data/wallet-pool.json");

const GUEST_COUNT = Number(process.env.GUEST_COUNT ?? "2");
const REFILL_THRESHOLD = Number(process.env.POOL_REFILL_THRESHOLD ?? "900");
const CHECK_INTERVAL_MS = Number(process.env.POOL_CHECK_INTERVAL_MS ?? "300000"); // 5 min

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cursorPath(guestId) {
  return resolve(LOGS_DIR, `cursor-${guestId}.json`);
}

function readCursor(guestId) {
  const path = cursorPath(guestId);
  if (!existsSync(path)) return 0;
  try {
    return JSON.parse(readFileSync(path, "utf8")).cursor ?? 0;
  } catch {
    return 0;
  }
}

function resetCursor(guestId) {
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
  writeFileSync(cursorPath(guestId), JSON.stringify({ cursor: 0 }));
}

function totalConsumed() {
  let sum = 0;
  for (let i = 0; i < GUEST_COUNT; i++) sum += readCursor(i);
  return sum;
}

function poolSize() {
  if (!existsSync(POOL_PATH)) return 0;
  try {
    return JSON.parse(readFileSync(POOL_PATH, "utf8")).length;
  } catch {
    return 0;
  }
}

async function refill() {
  console.log(`[pool-watcher] threshold hit — refilling pool (was ${poolSize()} wallet(s))...`);
  try {
    execSync("npx tsx scripts/fetch-wallet-pool.ts --fresh", {
      cwd: REPO_ROOT,
      stdio: "inherit",
      timeout: 30 * 60_000, // this walks thousands of Etherscan calls — give it room
    });
  } catch (err) {
    console.error("[pool-watcher] refill run failed:", err instanceof Error ? err.message : err);
    return; // leave cursors alone — try again next check rather than resetting on a failed refill
  }

  console.log(`[pool-watcher] refill complete — now ${poolSize()} wallet(s). Resetting cursors and restarting guests...`);
  for (let i = 0; i < GUEST_COUNT; i++) resetCursor(i);

  const guestNames = Array.from({ length: GUEST_COUNT }, (_, i) => `bagburner-guest-${i}`).join(" ");
  try {
    execSync(`pm2 restart ${guestNames}`, { stdio: "inherit", timeout: 60_000 });
    console.log("[pool-watcher] guests restarted on the refreshed pool.");
  } catch (err) {
    console.error("[pool-watcher] failed to restart guests — restart them manually:", err instanceof Error ? err.message : err);
  }
}

async function loop() {
  const consumed = totalConsumed();
  const size = poolSize();
  console.log(`[pool-watcher] checked — ${consumed} total wallet-pick(s) since last refill, threshold ${REFILL_THRESHOLD}, pool size ${size}`);
  if (consumed >= REFILL_THRESHOLD) {
    await refill();
  }
}

async function main() {
  console.log(
    `[pool-watcher] starting — watching ${GUEST_COUNT} guest(s), refill at ${REFILL_THRESHOLD} total picks, checking every ${CHECK_INTERVAL_MS}ms`
  );
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await loop().catch((err) => console.error("[pool-watcher] check failed:", err));
    await sleep(CHECK_INTERVAL_MS);
  }
}

main();
