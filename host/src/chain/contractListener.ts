import "dotenv/config";
import { decodeEventLog, type Address, type TransactionReceipt } from "viem";
import { publicClient } from "./viemClient.js";

const REPORT_PAYMENTS_ABI = [
  {
    type: "event",
    name: "ReportRequested",
    inputs: [
      { name: "guest", type: "address", indexed: true },
      { name: "walletAnalyzed", type: "address", indexed: true },
      { name: "fee", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "requestId", type: "uint256", indexed: false },
    ],
  },
] as const;

const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS ?? "").toLowerCase() as Address;

// In-memory replay guard — a txHash can only be redeemed for a report once per host process lifetime.
const usedTxHashes = new Set<string>();

export interface VerifiedPayment {
  requestId: string;
  guest: Address;
  walletAnalyzed: Address;
  fee: bigint;
}

function decodedReportRequestedEvents(receipt: TransactionReceipt) {
  const events: Array<{ guest: Address; walletAnalyzed: Address; fee: bigint; requestId: bigint }> = [];
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: REPORT_PAYMENTS_ABI, ...log });
      if (decoded.eventName === "ReportRequested") events.push(decoded.args);
    } catch {
      // not a ReportRequested log, skip
    }
  }
  return events;
}

async function fetchVerifiedReceipt(txHash: `0x${string}`): Promise<TransactionReceipt> {
  if (usedTxHashes.has(txHash.toLowerCase())) {
    throw new Error("txHash already redeemed for a previous report");
  }
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("Transaction did not succeed");
  if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS) throw new Error("Transaction was not sent to the ReportPayments contract");
  return receipt;
}

/** Guest flow: requires the paying address AND the wallet requested to both match. */
export async function verifyPayment(txHash: `0x${string}`, expectedGuest: string, expectedWallet: string): Promise<VerifiedPayment> {
  const receipt = await fetchVerifiedReceipt(txHash);
  for (const { guest, walletAnalyzed, fee, requestId } of decodedReportRequestedEvents(receipt)) {
    if (guest.toLowerCase() !== expectedGuest.toLowerCase()) continue;
    if (walletAnalyzed.toLowerCase() !== expectedWallet.toLowerCase()) continue;
    return { requestId: requestId.toString(), guest, walletAnalyzed, fee };
  }
  throw new Error("No matching ReportRequested event found in transaction");
}

/** Direct human-chat flow: no known payer address ahead of time, so only the wallet requested must match. */
export async function verifyPaymentForWallet(txHash: `0x${string}`, expectedWallet: string): Promise<VerifiedPayment> {
  const receipt = await fetchVerifiedReceipt(txHash);
  for (const { guest, walletAnalyzed, fee, requestId } of decodedReportRequestedEvents(receipt)) {
    if (walletAnalyzed.toLowerCase() !== expectedWallet.toLowerCase()) continue;
    return { requestId: requestId.toString(), guest, walletAnalyzed, fee };
  }
  throw new Error("No matching ReportRequested event found in transaction for that wallet");
}

/** Call only once a report has actually been produced and returned — not right after verification. */
export function markRedeemed(txHash: `0x${string}`) {
  usedTxHashes.add(txHash.toLowerCase());
}
