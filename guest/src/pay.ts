import "dotenv/config";
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const botChain = defineChain({
  id: Number(process.env.CHAIN_ID ?? "0"),
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL ?? ""] } },
});

const REPORT_PAYMENTS_ABI = parseAbi([
  "function payForReport(address walletAnalyzed) payable returns (uint256)",
  "function reportFee() view returns (uint256)",
]);

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

export async function getReportFee(): Promise<bigint> {
  const publicClient = createPublicClient({ chain: botChain, transport: http(process.env.RPC_URL) });
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: REPORT_PAYMENTS_ABI,
    functionName: "reportFee",
  });
}

export async function payForReport(walletAnalyzed: string, fee: bigint): Promise<`0x${string}`> {
  const account = privateKeyToAccount(process.env.GUEST_PRIVATE_KEY as `0x${string}`);
  const transport = http(process.env.RPC_URL);
  const publicClient = createPublicClient({ chain: botChain, transport });
  const walletClient = createWalletClient({ account, chain: botChain, transport });

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: REPORT_PAYMENTS_ABI,
    functionName: "payForReport",
    args: [walletAnalyzed as `0x${string}`],
    value: fee,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export function guestAddress(): string {
  return privateKeyToAccount(process.env.GUEST_PRIVATE_KEY as `0x${string}`).address;
}
