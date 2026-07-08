/**
 * Builds data/wallet-pool.json from real, currently-active Ethereum wallets,
 * without needing Dune API access. Approach: pull recent senders to well-known
 * DEX/aggregator router contracts via Etherscan's free txlist endpoint, dedupe, and
 * filter out known contract addresses. Run once ahead of time (not during the live demo).
 *
 * Note: the host only analyzes Ethereum mainnet history (Etherscan-backed). Platforms
 * like Hyperliquid, Bluefin, and most perps venues live on their own chains/L2s with no
 * mainnet trade history to fetch, so "active trader" wallets here are sourced from
 * mainnet DEX aggregators (1inch, 0x, CoW) and Uniswap, which are the closest real,
 * verifiable proxy for sophisticated/high-volume on-chain traders available to this tool.
 *
 * Usage:
 *   tsx scripts/fetch-wallet-pool.ts            : top up the existing pool to TARGET_POOL_SIZE
 *   tsx scripts/fetch-wallet-pool.ts --fresh     : discard the existing pool, source an entirely new batch
 * Requires ETHERSCAN_API_KEY in host/.env or the environment.
 *
 * See scripts/pool-refill-watcher.mjs for the long-running process that calls this
 * automatically (with --fresh) once the guest agents have collectively cycled through
 * ~90% of the pool.
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dir, "../data/wallet-pool.json");
const TARGET_POOL_SIZE = 1000;
const PAGES_PER_CONTRACT = 4; // 4 * 300 = up to 1200 raw txs per contract

// Well-known DEX/aggregator router contracts: their recent callers are real, active trader EOAs.
const SOURCE_CONTRACTS = [
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router 02
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 Router 2
  "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // Uniswap Universal Router
  "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch Aggregation Router V5
  "0xDef1C0ded9bec7F1a1670819833240f027b25EfF", // 0x Exchange Proxy
  "0x9008D19f58AAbD9eD0D60971565AA8510560ab41", // CoW Protocol Settlement
];

const KNOWN_CONTRACTS = new Set(SOURCE_CONTRACTS.map((a) => a.toLowerCase()));

function loadEnvFallback() {
  const hostEnv = resolve(__dir, "../host/.env");
  if (existsSync(hostEnv)) {
    for (const line of readFileSync(hostEnv, "utf8").split("\n")) {
      const [k, ...rest] = line.trim().split("=");
      if (k && !k.startsWith("#") && !process.env[k]) process.env[k] = rest.join("=").trim();
    }
  }
}
loadEnvFallback();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Etherscan's account-level index has been observed returning "No transactions found"
// for addresses whose only activity is very recent (sync lag), then correcting itself
// minutes later. Sourcing senders from a window that ends a bit behind the chain tip
// (well-indexed by now) avoids the flakiest, freshest wallets. The window is computed
// relative to the CURRENT tip (not a fixed constant) so that a later --fresh refill run
// naturally slides forward and surfaces different candidates than the previous run,
// instead of rediscovering the exact same top senders every time.
const WINDOW_SIZE = 500_000;
const WINDOW_LAG = 200_000; // stay this far behind the tip to dodge sync-lag flakiness
const FALLBACK_START_BLOCK = "23000000";
const FALLBACK_END_BLOCK = "23500000";

async function fetchBlockWindow(): Promise<{ start: string; end: string }> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  try {
    const url = new URL("https://api.etherscan.io/v2/api");
    url.searchParams.set("chainid", "1");
    url.searchParams.set("module", "proxy");
    url.searchParams.set("action", "eth_blockNumber");
    url.searchParams.set("apikey", apiKey ?? "");
    const res = await fetch(url.toString());
    const json = await res.json();
    const tip = parseInt(json.result, 16);
    if (!tip || Number.isNaN(tip)) throw new Error("bad block number response");
    const end = tip - WINDOW_LAG;
    const start = end - WINDOW_SIZE;
    return { start: String(start), end: String(end) };
  } catch {
    return { start: FALLBACK_START_BLOCK, end: FALLBACK_END_BLOCK };
  }
}

async function fetchSendersPage(contractAddress: string, page: number, window: { start: string; end: string }): Promise<string[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY not set");

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", contractAddress);
  url.searchParams.set("startblock", window.start);
  url.searchParams.set("endblock", window.end);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("page", String(page));
  url.searchParams.set("offset", "300");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.status !== "1") return [];

  return json.result
    .map((tx: any) => tx.from as string)
    .filter((addr: string) => !!addr && !KNOWN_CONTRACTS.has(addr.toLowerCase()));
}

async function fetchSenders(contractAddress: string, window: { start: string; end: string }): Promise<string[]> {
  const all: string[] = [];
  for (let page = 1; page <= PAGES_PER_CONTRACT; page++) {
    const senders = await fetchSendersPage(contractAddress, page, window);
    all.push(...senders);
    if (senders.length === 0) break; // ran out of pages for this contract
    await sleep(250);
  }
  return all;
}

/** Confirms an address has real, stably-indexed token-transfer history before trusting it for the demo pool. */
async function verifyWalletHasHistory(address: string): Promise<boolean> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("address", address);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "5");
  url.searchParams.set("apikey", apiKey ?? "");

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url.toString());
    const json = await res.json();
    if (json.status === "1" && Array.isArray(json.result) && json.result.length > 0) return true;
    await sleep(1200);
  }
  return false;
}

function loadExistingPool(): string[] {
  if (!existsSync(OUT_PATH)) return [];
  try {
    return JSON.parse(readFileSync(OUT_PATH, "utf8"));
  } catch {
    return [];
  }
}

async function main() {
  const fresh = process.argv.includes("--fresh");
  const existing = fresh ? [] : loadExistingPool().map((a) => a.toLowerCase());
  const verified: string[] = [...existing];
  const seen = new Set(existing);
  console.log(
    fresh
      ? "Fresh mode — ignoring the existing pool, sourcing an entirely new batch."
      : `Starting from ${existing.length} already-verified wallet(s) in the existing pool.`
  );

  const window = await fetchBlockWindow();
  console.log(`Using block window ${window.start}-${window.end}`);

  const candidates = new Set<string>();
  for (const contract of SOURCE_CONTRACTS) {
    if (verified.length >= TARGET_POOL_SIZE) break;
    const senders = await fetchSenders(contract, window);
    for (const s of senders) {
      const lower = s.toLowerCase();
      if (!seen.has(lower)) candidates.add(lower);
    }
    console.log(`  ${contract}: ${senders.length} raw sender(s), ${candidates.size} new unique candidate(s) so far`);
  }
  console.log(`Found ${candidates.size} new candidate(s), verifying history...`);

  for (const addr of candidates) {
    if (verified.length >= TARGET_POOL_SIZE) break;
    await sleep(250); // stay well under Etherscan's free-tier rate limit
    if (await verifyWalletHasHistory(addr)) {
      verified.push(addr);
      seen.add(addr);
      console.log(`  verified ${addr} (${verified.length}/${TARGET_POOL_SIZE})`);
    }
  }

  writeFileSync(OUT_PATH, JSON.stringify(verified, null, 2));
  console.log(`Wrote ${verified.length} verified wallet address(es) to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
