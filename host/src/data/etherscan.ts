import "dotenv/config";
import type { Trade } from "../types.js";

const ETHERSCAN_API = "https://api.etherscan.io/v2/api";
const ETH_MAINNET_CHAINID = "1";
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

interface EtherscanNormalTx {
  hash: string;
  value: string;
}

interface EtherscanTokenTx {
  hash: string;
  timeStamp: string;
  contractAddress: string;
  tokenSymbol: string;
  tokenDecimal: string;
  value: string;
  from: string;
  to: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Etherscan's API is occasionally flaky/inconsistent between requests for the same
// address (has been observed returning "No transactions found" then real data moments
// later) — retry a couple of times before trusting an empty result.
async function etherscanCall(params: Record<string, string>, attempt = 1): Promise<any[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY is not set");
  const url = new URL(ETHERSCAN_API);
  url.searchParams.set("chainid", ETH_MAINNET_CHAINID);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (json.status !== "1") {
    if (json.message === "No transactions found") {
      if (attempt < 3) {
        await sleep(800 * attempt);
        return etherscanCall(params, attempt + 1);
      }
      return [];
    }
    if (attempt < 3) {
      await sleep(800 * attempt);
      return etherscanCall(params, attempt + 1);
    }
    throw new Error(`Etherscan error: ${json.message} — ${JSON.stringify(json.result).slice(0, 200)}`);
  }
  return json.result;
}

function fetchNormalTxs(address: string): Promise<EtherscanNormalTx[]> {
  return etherscanCall({ module: "account", action: "txlist", address, startblock: "0", endblock: "99999999", sort: "asc" });
}

function fetchTokenTxs(address: string): Promise<EtherscanTokenTx[]> {
  return etherscanCall({ module: "account", action: "tokentx", address, startblock: "0", endblock: "99999999", sort: "asc" });
}

/**
 * Builds a simplified trade list assuming ETH- or WETH-denominated DEX swaps.
 * Any tx that also moved native ETH or WETH is treated as that tx's "price leg" —
 * token-to-token swaps with no ETH/WETH leg on the same hash won't get a cost basis.
 * This is an MVP simplification, not general-purpose cost-basis tracking.
 */
export async function fetchTradesForWallet(address: string): Promise<Trade[]> {
  const [normalTxs, tokenTxs] = await Promise.all([fetchNormalTxs(address), fetchTokenTxs(address)]);
  const lower = address.toLowerCase();

  const ethLegByHash = new Map<string, number>();
  for (const tx of normalTxs) {
    const wei = Number(tx.value);
    if (wei > 0) ethLegByHash.set(tx.hash, (ethLegByHash.get(tx.hash) ?? 0) + wei / 1e18);
  }
  for (const t of tokenTxs) {
    if (t.contractAddress.toLowerCase() !== WETH_ADDRESS) continue;
    const decimals = Number(t.tokenDecimal || "18");
    const amount = Number(t.value) / 10 ** decimals;
    ethLegByHash.set(t.hash, (ethLegByHash.get(t.hash) ?? 0) + amount);
  }

  const trades: Trade[] = [];
  for (const t of tokenTxs) {
    if (t.contractAddress.toLowerCase() === WETH_ADDRESS) continue; // WETH is the pricing leg, not a tracked asset
    const decimals = Number(t.tokenDecimal || "18");
    const tokenAmount = Number(t.value) / 10 ** decimals;
    if (tokenAmount <= 0) continue;

    const side: "buy" | "sell" = t.to.toLowerCase() === lower ? "buy" : "sell";
    trades.push({
      txHash: t.hash,
      timestamp: Number(t.timeStamp),
      tokenAddress: t.contractAddress,
      tokenSymbol: t.tokenSymbol || "UNKNOWN",
      side,
      tokenAmount,
      ethAmount: ethLegByHash.get(t.hash) ?? 0,
    });
  }

  return trades.sort((a, b) => a.timestamp - b.timestamp);
}
