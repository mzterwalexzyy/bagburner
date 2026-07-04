import "dotenv/config";
import { createPublicClient, defineChain, http, parseAbi } from "viem";

// BOT Chain is not a built-in viem chain — defined from env so testnet values
// (chain ID / RPC / explorer) can be filled in once known, without code changes.
const botChain = defineChain({
  id: Number(process.env.CHAIN_ID ?? "0"),
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL ?? ""] },
  },
  blockExplorers: process.env.EXPLORER_URL
    ? { default: { name: "BOT Chain Explorer", url: process.env.EXPLORER_URL } }
    : undefined,
});

export const publicClient = createPublicClient({
  chain: botChain,
  transport: http(process.env.RPC_URL),
});

export { botChain };

const REPORT_PAYMENTS_ABI = parseAbi(["function reportFee() view returns (uint256)"]);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

export async function getReportFee(): Promise<bigint> {
  return publicClient.readContract({ address: CONTRACT_ADDRESS, abi: REPORT_PAYMENTS_ABI, functionName: "reportFee" });
}
