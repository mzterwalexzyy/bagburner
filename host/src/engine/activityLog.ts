import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = resolve(__dir, "../../data");
const LOG_PATH = resolve(LOG_DIR, "activity.jsonl");

export type Source = "guest" | "human-telegram" | "web";

export interface ActivityEntry {
  requestId: string;
  payer: string;
  walletAnalyzed: string;
  feeWei: string;
  txHash: string;
  status: "completed" | "failed";
  realizedPnlUsd?: number;
  unrealizedPnlUsd?: number;
  harvestCount?: number;
  taxRatePercent?: number;
  potentialTaxOwedUsd?: number;
  source: Source;
  createdAt: string;
}

const entries: ActivityEntry[] = [];

function load() {
  if (!existsSync(LOG_PATH)) return;
  const lines = readFileSync(LOG_PATH, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed line
    }
  }
}
load();

export function recordActivity(entry: ActivityEntry) {
  entries.push(entry);
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
}

export function getRecentActivity(limit = 20): ActivityEntry[] {
  return entries.slice(-limit).reverse();
}

export function getReportsForPayer(payer?: string): ActivityEntry[] {
  const completed = entries.filter((e) => e.status === "completed");
  if (!payer) return completed.slice().reverse();
  return completed.filter((e) => e.payer.toLowerCase() === payer.toLowerCase()).reverse();
}

export function getStats() {
  const completed = entries.filter((e) => e.status === "completed");
  const totalVolumeWei = entries.reduce((sum, e) => sum + BigInt(e.feeWei || "0"), 0n);
  const recentWindow = Date.now() - 24 * 60 * 60 * 1000;
  const activePayers = new Set(
    entries.filter((e) => new Date(e.createdAt).getTime() > recentWindow).map((e) => e.payer.toLowerCase())
  );

  return {
    reportsGenerated: completed.length,
    activeAgents: activePayers.size,
    totalVolumeBot: Number(totalVolumeWei) / 1e18,
    successRate: entries.length === 0 ? 100 : Math.round((completed.length / entries.length) * 100),
  };
}
