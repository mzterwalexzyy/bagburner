/**
 * Builds data/wallet-pool.json from real, currently-active Ethereum wallets —
 * without needing Dune API access. Approach: pull recent senders to well-known
 * DEX router contracts via Etherscan's free txlist endpoint, dedupe, and filter
 * out known contract addresses. Run once ahead of time (not during the live demo).
 *
 * Usage: tsx scripts/fetch-wallet-pool.ts
 * Requires ETHERSCAN_API_KEY in host/.env or the environment.
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dir, "../data/wallet-pool.json");
const TARGET_POOL_SIZE = 50;

// Well-known DEX router contracts — their recent callers are real, active trader EOAs.
const SOURCE_CONTRACTS = [
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router 02
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 Router 2
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
// minutes later. Sourcing senders from an older block range (well-indexed by now)
// avoids the flakiest, freshest wallets.
const OLDER_START_BLOCK = "23000000";
const OLDER_END_BLOCK = "23500000";

async function fetchSenders(contractAddress: string): Promise<string[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY not set");

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", contractAddress);
  url.searchParams.set("startblock", OLDER_START_BLOCK);
  url.searchParams.set("endblock", OLDER_END_BLOCK);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "300");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.status !== "1") return [];

  return json.result
    .map((tx: any) => tx.from as string)
    .filter((addr: string) => !!addr && !KNOWN_CONTRACTS.has(addr.toLowerCase()));
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

async function main() {
  const candidates = new Set<string>();
  for (const contract of SOURCE_CONTRACTS) {
    const senders = await fetchSenders(contract);
    for (const s of senders) candidates.add(s.toLowerCase());
  }
  console.log(`Found ${candidates.size} candidate address(es), verifying history...`);

  const verified: string[] = [];
  for (const addr of candidates) {
    if (verified.length >= TARGET_POOL_SIZE) break;
    await sleep(250); // stay well under Etherscan's free-tier rate limit
    if (await verifyWalletHasHistory(addr)) {
      verified.push(addr);
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
