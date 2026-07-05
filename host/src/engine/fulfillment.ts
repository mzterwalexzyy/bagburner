import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildTaxReport } from "./reportBuilder.js";
import { generateReportPdf } from "../report/pdf.js";
import { recordActivity, type Source } from "./activityLog.js";
import type { TaxReport } from "../types.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dir, "../../reports");

export interface FulfillParams {
  requestId: string;
  payer: string;
  walletAnalyzed: string;
  feeWei: string;
  txHash: string;
  source: Source;
}

/** Shared "actually do the work" step used by every entry point (guest HTTP, Telegram human chat, web) — builds the report, saves the PDF to disk once, and logs the activity. */
export async function fulfillReport(params: FulfillParams): Promise<{ report: TaxReport; pdf: Buffer; pdfPath: string }> {
  const report = await buildTaxReport(params.walletAnalyzed, params.requestId);
  const pdf = await generateReportPdf(report);

  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
  const pdfPath = resolve(REPORTS_DIR, `${params.requestId}.pdf`);
  writeFileSync(pdfPath, pdf);

  recordActivity({
    requestId: params.requestId,
    payer: params.payer,
    walletAnalyzed: params.walletAnalyzed,
    feeWei: params.feeWei,
    txHash: params.txHash,
    status: "completed",
    realizedPnlUsd: report.realizedPnlUsd,
    unrealizedPnlUsd: report.unrealizedPnlUsd,
    harvestCount: report.harvestOpportunities.length,
    source: params.source,
    createdAt: new Date().toISOString(),
  });

  return { report, pdf, pdfPath };
}

export function recordFailedAttempt(params: Omit<FulfillParams, "requestId"> & { requestId?: string }, reason: string) {
  console.error(`[activity] recording failed attempt for ${params.walletAnalyzed}: ${reason}`);
  recordActivity({
    requestId: params.requestId ?? "unknown",
    payer: params.payer,
    walletAnalyzed: params.walletAnalyzed,
    feeWei: params.feeWei,
    txHash: params.txHash,
    status: "failed",
    source: params.source,
    createdAt: new Date().toISOString(),
  });
}
