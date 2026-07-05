import "dotenv/config";
import express from "express";
import cors from "cors";
import { verifyPayment, verifyPaymentForWallet, markRedeemed } from "./chain/contractListener.js";
import { fulfillReport, recordFailedAttempt } from "./engine/fulfillment.js";
import { getRecentActivity, getReportsForPayer, getStats } from "./engine/activityLog.js";
import { composeMessage, HOST_ROLE_PROMPT } from "./llm/chat.js";
import { sendHostMessage, sendHostDocument } from "./telegram/telegram.js";
import { startHumanChatPoller } from "./telegram/poller.js";
import type { ReportRequestBody } from "./types.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use("/reports", express.static(resolve(__dir, "../reports")));

const PORT = Number(process.env.PORT ?? 4000);

// Guest agent flow — payer identity (guest) must match the on-chain event.
app.post("/report", async (req, res) => {
  const body = req.body as Partial<ReportRequestBody>;
  const { guest, walletAnalyzed, txHash, chain, telegramChatId } = body;
  const chatId = telegramChatId ?? "";

  if (!guest || !walletAnalyzed || !txHash || chain !== "ETH") {
    return res.status(400).json({ error: "guest, walletAnalyzed, txHash, and chain='ETH' are required" });
  }

  console.log(`[host] request from ${guest} for wallet ${walletAnalyzed} (tx ${txHash})`);

  try {
    const payment = await verifyPayment(txHash as `0x${string}`, guest, walletAnalyzed);
    console.log(`[host] payment verified — requestId ${payment.requestId}, fee ${payment.fee} wei`);
    const verifiedMsg = await composeMessage(
      HOST_ROLE_PROMPT,
      `Payment just verified on-chain (tx ${txHash}) from a guest agent. Say you're starting the analysis on wallet ${walletAnalyzed}.`,
      `📥 BagBurner Host: payment verified (tx ${txHash}). Starting analysis on ${walletAnalyzed}.`
    );
    await sendHostMessage(chatId, verifiedMsg);

    const { report, pdf } = await fulfillReport({
      requestId: payment.requestId,
      payer: guest,
      walletAnalyzed,
      feeWei: payment.fee.toString(),
      txHash,
      source: "guest",
    });
    markRedeemed(txHash as `0x${string}`);
    console.log(`[host] report ready for requestId ${payment.requestId} — realized $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}`);

    const deliverMsg = await composeMessage(
      HOST_ROLE_PROMPT,
      `The report for ${walletAnalyzed} is done: realized P&L $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}, ${report.harvestOpportunities.length} harvest candidate(s). Announce it's ready and that you're attaching the PDF.`,
      `✅ BagBurner Host: report ready for ${walletAnalyzed}. Realized P&L $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}, ${report.harvestOpportunities.length} harvest candidate(s). PDF attached.`
    );
    await sendHostDocument(chatId, pdf, `bagburner-report-${payment.requestId}.pdf`, deliverMsg);

    res.json({ ...report, pdfUrl: `/reports/${payment.requestId}.pdf` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[host] request rejected: ${message}`);
    recordFailedAttempt({ payer: guest, walletAnalyzed, feeWei: "0", txHash, source: "guest" }, message);
    res.status(400).json({ error: message });
  }
});

// Web dashboard flow — a browser-connected wallet pays directly; no pre-registered guest identity.
app.post("/request", async (req, res) => {
  const { walletAnalyzed, txHash } = req.body as { walletAnalyzed?: string; txHash?: string };
  if (!walletAnalyzed || !txHash) {
    return res.status(400).json({ error: "walletAnalyzed and txHash are required" });
  }

  console.log(`[host] web request for wallet ${walletAnalyzed} (tx ${txHash})`);

  try {
    const payment = await verifyPaymentForWallet(txHash as `0x${string}`, walletAnalyzed);
    const { report } = await fulfillReport({
      requestId: payment.requestId,
      payer: payment.guest,
      walletAnalyzed,
      feeWei: payment.fee.toString(),
      txHash,
      source: "web",
    });
    markRedeemed(txHash as `0x${string}`);
    console.log(`[host] web report ready for requestId ${payment.requestId}`);
    res.json({ ...report, pdfUrl: `/reports/${payment.requestId}.pdf` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[host] web request rejected: ${message}`);
    recordFailedAttempt({ payer: "unknown", walletAnalyzed, feeWei: "0", txHash, source: "web" }, message);
    res.status(400).json({ error: message });
  }
});

app.get("/stats", (_req, res) => res.json(getStats()));
app.get("/feed", (req, res) => res.json(getRecentActivity(Number(req.query.limit) || 20)));
app.get("/my-reports", (req, res) => res.json(getReportsForPayer(req.query.payer as string | undefined)));

app.listen(PORT, () => {
  console.log(`[host] BagBurner Core listening on port ${PORT}`);
});

startHumanChatPoller();
