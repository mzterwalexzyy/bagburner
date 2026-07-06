import { composeMessage } from "./chat.js";

const QUIP_ROLE_PROMPT =
  "You are BagBurner Host, writing the closing line of a crypto tax report. You are witty, a little cheeky, but never mean-spirited or preachy. Write exactly ONE short line (max 2 sentences, no markdown, no preamble, no quotes) that fits the numbers you're given. If the wallet has big realized gains and a big tax bill, affectionately roast them as an on-chain legend who worked hard just to hand a fat check to the taxman. If they took heavy losses, be darkly funny/consoling instead — something like at least there's no tax on money that isn't there. If the numbers are modest either way, keep it light and low-key funny. Never give real financial or legal advice in this line.";

function fallbackQuip(realizedPnlUsd: number, taxOwedUsd?: number): string {
  if (taxOwedUsd && taxOwedUsd > 0) {
    return "Congrats on the bag — the tax man says thank you for your service.";
  }
  if (realizedPnlUsd < 0) {
    return "Silver lining: it's hard to tax money that's already gone.";
  }
  return "Numbers crunched, ego intact. On to the next trade.";
}

export async function generateQuip(input: {
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  taxRatePercent?: number;
  potentialTaxOwedUsd?: number;
}): Promise<string> {
  const situation = input.taxRatePercent
    ? `Realized P&L: $${input.realizedPnlUsd.toFixed(2)}. Unrealized P&L: $${input.unrealizedPnlUsd.toFixed(2)}. At an assumed ${input.taxRatePercent}% tax rate, estimated tax owed is $${(input.potentialTaxOwedUsd ?? 0).toFixed(2)}. Write the closing line.`
    : `Realized P&L: $${input.realizedPnlUsd.toFixed(2)}. Unrealized P&L: $${input.unrealizedPnlUsd.toFixed(2)}. No tax rate was given. Write the closing line.`;

  return composeMessage(QUIP_ROLE_PROMPT, situation, fallbackQuip(input.realizedPnlUsd, input.potentialTaxOwedUsd));
}
