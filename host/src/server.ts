import "dotenv/config";
import express from "express";
import { verifyPayment, markRedeemed } from "./chain/contractListener.js";
import { buildTaxReport } from "./engine/reportBuilder.js";
import { composeMessage, HOST_ROLE_PROMPT } from "./llm/chat.js";
import { generateReportPdf } from "./report/pdf.js";
import { sendHostMessage, sendHostDocument } from "./telegram/telegram.js";
import { startHumanChatPoller } from "./telegram/poller.js";
import type { ReportRequestBody } from "./types.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 4000);

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

    const report = await buildTaxReport(walletAnalyzed, payment.requestId);
    markRedeemed(txHash as `0x${string}`);
    console.log(`[host] report ready for requestId ${payment.requestId} — realized $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}`);

    const pdf = await generateReportPdf(report);
    const deliverMsg = await composeMessage(
      HOST_ROLE_PROMPT,
      `The report for ${walletAnalyzed} is done: realized P&L $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}, ${report.harvestOpportunities.length} harvest candidate(s). Announce it's ready and that you're attaching the PDF.`,
      `✅ BagBurner Host: report ready for ${walletAnalyzed}. Realized P&L $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}, ${report.harvestOpportunities.length} harvest candidate(s). PDF attached.`
    );
    await sendHostDocument(chatId, pdf, `bagburner-report-${payment.requestId}.pdf`, deliverMsg);

    res.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[host] request rejected: ${message}`);
    res.status(400).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[host] BagBurner Core listening on port ${PORT}`);
});

startHumanChatPoller();
