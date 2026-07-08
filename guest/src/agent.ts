import "dotenv/config";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getPartition, WalletCycler } from "./partition.js";
import { getReportFee, payForReport, guestAddress } from "./pay.js";
import { sendGuestMessage } from "./telegram.js";
import { composeMessage, guestRolePrompt } from "./chat.js";

const __dir = dirname(fileURLToPath(import.meta.url));

const GUEST_ID = Number(process.env.GUEST_ID ?? "0");
const GUEST_COUNT = Number(process.env.GUEST_COUNT ?? "1");
const HOST_URL = process.env.HOST_URL ?? "http://localhost:4000";
const LOOP_INTERVAL_MS = Number(process.env.LOOP_INTERVAL_MS ?? "60000");

const logsDir = resolve(__dir, "../../data/logs");
const logPath = resolve(logsDir, `guest-${GUEST_ID}.jsonl`);

function log(entry: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  console.log(`[guest-${GUEST_ID}] ${line}`);
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  appendFileSync(logPath, line + "\n");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** A random whole-number tax rate (5-40%) this guest assumes for the wallet, just to give the host something to estimate tax owed against. */
function randomTaxRatePercent(): number {
  return Math.floor(Math.random() * (40 - 5 + 1)) + 5;
}

async function runCycle(cycler: WalletCycler) {
  const wallet = cycler.next();
  const guest = guestAddress();
  const name = `Guest Agent ${GUEST_ID}`;
  const rolePrompt = guestRolePrompt(name);
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

  const taxRatePercent = randomTaxRatePercent();
  const askMsg = await composeMessage(
    rolePrompt,
    `Announce that you need a fresh tax report for wallet ${wallet}, mention you're assuming a ${taxRatePercent}% tax rate for the estimate, and say you're about to check the host's current fee on-chain.`,
    `🔎 ${name}: I need a tax report for wallet ${wallet}, let's assume a ${taxRatePercent}% tax rate. Checking your fee on-chain now.`
  );
  await sendGuestMessage(askMsg);

  const fee = await getReportFee();
  const feeBot = Number(fee) / 1e18;
  const agreeMsg = await composeMessage(
    rolePrompt,
    `The host's on-chain fee is ${feeBot} BOT. Say you accept and are paying now.`,
    `✅ ${name}: ${feeBot} BOT works for me. Paying now.`
  );
  await sendGuestMessage(agreeMsg);

  console.log(`[guest-${GUEST_ID}] paying for report on ${wallet}...`);
  const txHash = await payForReport(wallet, fee);
  console.log(`[guest-${GUEST_ID}] payment confirmed: ${txHash}`);
  const paidMsg = await composeMessage(
    rolePrompt,
    `Payment just confirmed on-chain (tx ${txHash}). Tell the host it's paid and hand off wallet ${wallet} for analysis.`,
    `📤 ${name}: paid (tx ${txHash}). Go ahead and analyze ${wallet}.`
  );
  await sendGuestMessage(paidMsg);

  const res = await fetch(`${HOST_URL}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guest, walletAnalyzed: wallet, txHash, chain: "ETH", telegramChatId: chatId, taxRatePercent }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(`host rejected report request: ${body.error ?? res.statusText}`);

  log({
    wallet,
    txHash,
    taxRatePercent,
    realizedPnlUsd: body.realizedPnlUsd,
    unrealizedPnlUsd: body.unrealizedPnlUsd,
    potentialTaxOwedUsd: body.potentialTaxOwedUsd,
    harvestCount: body.harvestOpportunities?.length ?? 0,
    llmSummary: body.llmSummary,
    quip: body.quip,
  });
}

async function main() {
  const partition = getPartition(GUEST_ID, GUEST_COUNT);
  if (partition.length === 0) throw new Error(`guest ${GUEST_ID} has an empty wallet partition, check data/wallet-pool.json`);
  const cycler = new WalletCycler(GUEST_ID, partition);

  console.log(`[guest-${GUEST_ID}] starting, address ${guestAddress()}, ${partition.length} wallet(s) in partition, looping every ${LOOP_INTERVAL_MS}ms`);

  while (true) {
    try {
      await runCycle(cycler);
    } catch (err) {
      log({ error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(LOOP_INTERVAL_MS);
  }
}

main();
