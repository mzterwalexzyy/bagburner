const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL ?? "http://localhost:4000";

export interface Stats {
  reportsGenerated: number;
  activeAgents: number;
  totalVolumeBot: number;
  successRate: number;
}

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
  source: "guest" | "human-telegram" | "web";
  createdAt: string;
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${HOST_URL}/stats`, { cache: "no-store" });
  return res.json();
}

export async function getFeed(limit = 20): Promise<ActivityEntry[]> {
  const res = await fetch(`${HOST_URL}/feed?limit=${limit}`, { cache: "no-store" });
  return res.json();
}

export async function getMyReports(payer?: string): Promise<ActivityEntry[]> {
  const url = payer ? `${HOST_URL}/my-reports?payer=${payer}` : `${HOST_URL}/my-reports`;
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export function reportPdfUrl(requestId: string): string {
  return `${HOST_URL}/reports/${requestId}.pdf`;
}

export interface RequestReportResult {
  walletAnalyzed: string;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  harvestOpportunities: unknown[];
  llmSummary: string;
  taxRatePercent?: number;
  potentialTaxOwedUsd?: number;
  quip: string;
  pdfUrl: string;
}

export async function submitPaidRequest(walletAnalyzed: string, txHash: string, taxRatePercent?: number): Promise<RequestReportResult> {
  const res = await fetch(`${HOST_URL}/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ walletAnalyzed, txHash, taxRatePercent }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return { ...json, pdfUrl: `${HOST_URL}${json.pdfUrl}` };
}

export { HOST_URL };
