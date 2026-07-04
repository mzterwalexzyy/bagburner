import { verifyPaymentForWallet, markRedeemed } from "../chain/contractListener.js";
import { getReportFee, botChain } from "../chain/viemClient.js";
import { buildTaxReport } from "../engine/reportBuilder.js";
import { composeMessage, HOST_ROLE_PROMPT } from "../llm/chat.js";
import { generateReportPdf } from "../report/pdf.js";
import { sendHostMessage, sendHostDocument } from "./telegram.js";

const ADDRESS_RE = /0x[a-fA-F0-9]{40}\b/;
const TXHASH_RE = /0x[a-fA-F0-9]{64}\b/;

interface Session {
  pendingWallet?: string;
}

const sessions = new Map<string, Session>();

function getSession(chatId: string): Session {
  let s = sessions.get(chatId);
  if (!s) {
    s = {};
    sessions.set(chatId, s);
  }
  return s;
}

/** Handles a direct human message to the host bot — general Q&A, or the request→pay→deliver flow, gated by real on-chain verification. */
export async function handleHumanMessage(chatId: string, text: string): Promise<void> {
  const session = getSession(chatId);

  const txHashMatch = text.match(TXHASH_RE);
  if (session.pendingWallet && txHashMatch) {
    const txHash = txHashMatch[0] as `0x${string}`;
    try {
      const payment = await verifyPaymentForWallet(txHash, session.pendingWallet);
      const wallet = session.pendingWallet;
      session.pendingWallet = undefined;

      const startMsg = await composeMessage(
        HOST_ROLE_PROMPT,
        `Payment verified on-chain (tx ${txHash}) for wallet ${wallet}. Say you're starting the analysis.`,
        `📥 BagBurner Host: payment verified (tx ${txHash}). Starting analysis on ${wallet}.`
      );
      await sendHostMessage(chatId, startMsg);

      const report = await buildTaxReport(wallet, payment.requestId);
      markRedeemed(txHash);
      const pdf = await generateReportPdf(report);
      const deliverMsg = await composeMessage(
        HOST_ROLE_PROMPT,
        `The report for ${wallet} is done: realized P&L $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}, ${report.harvestOpportunities.length} harvest candidate(s). Announce it's ready and attach the PDF.`,
        `✅ BagBurner Host: report ready for ${wallet}. Realized P&L $${report.realizedPnlUsd.toFixed(2)}, unrealized $${report.unrealizedPnlUsd.toFixed(2)}, ${report.harvestOpportunities.length} harvest candidate(s). PDF attached.`
      );
      await sendHostDocument(chatId, pdf, `bagburner-report-${payment.requestId}.pdf`, deliverMsg);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const refuseMsg = await composeMessage(
        HOST_ROLE_PROMPT,
        `A user claimed to have paid with tx ${txHash} for wallet ${session.pendingWallet}, but verification failed: "${reason}". Politely but firmly refuse and explain you can't find a matching payment on-chain, and ask them to check and resend the correct tx hash.`,
        `❌ BagBurner Host: I don't see a matching payment on-chain for that tx hash (${reason}). Please double-check and send the correct transaction hash.`
      );
      await sendHostMessage(chatId, refuseMsg);
    }
    return;
  }

  const addressMatch = text.match(ADDRESS_RE);
  if (addressMatch) {
    const wallet = addressMatch[0];
    session.pendingWallet = wallet;
    const fee = await getReportFee();
    const feeBot = Number(fee) / 1e18;
    const contractUrl = botChain.blockExplorers?.default?.url
      ? `${botChain.blockExplorers.default.url.replace(/\/$/, "")}/address/${process.env.CONTRACT_ADDRESS}`
      : process.env.CONTRACT_ADDRESS;
    const askMsg = await composeMessage(
      HOST_ROLE_PROMPT,
      `A user wants a tax report on wallet ${wallet}. Tell them the fee is ${feeBot} BOT, they should pay it to the ReportPayments contract's payForReport(${wallet}) function, and then send you the resulting transaction hash so you can verify it.`,
      `💰 BagBurner Host: Got it — analyzing ${wallet} costs ${feeBot} BOT. Call payForReport(${wallet}) on the contract (${contractUrl}) and send me the tx hash once it confirms.`
    );
    await sendHostMessage(chatId, askMsg);
    return;
  }

  const genericMsg = await composeMessage(
    HOST_ROLE_PROMPT,
    `A user is chatting with you directly (not through the automated guest flow). They said: "${text}". You sell on-demand crypto tax analysis reports for a small on-chain fee — if they want one, ask for a wallet address. Reply naturally to what they said.`,
    `I'm BagBurner Host — I run on-demand crypto tax analysis for a small on-chain fee. Send me a wallet address if you'd like a report.`
  );
  await sendHostMessage(chatId, genericMsg);
}
