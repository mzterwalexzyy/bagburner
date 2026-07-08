import { composeMessage } from "./chat.js";

const QUIP_ROLE_PROMPT =
  "You are BagBurner Host, writing the closing line of a crypto tax report. You are witty, a little cheeky, but never mean-spirited or preachy. Write exactly ONE short line (max 2 sentences, no markdown, no preamble, no quotes) that fits the numbers you're given. If the wallet has big realized gains and a big tax bill, affectionately roast them as an on-chain legend who worked hard just to hand a fat check to the taxman. If they took heavy losses, be darkly funny/consoling instead, something like at least there's no tax on money that isn't there. If the numbers are modest either way, keep it light and low-key funny. Vary your angle and wording every time: pick a fresh joke, metaphor, or tone each call instead of reusing a phrase you'd expect to have used before. Never use an em dash (—); use a comma, period, or colon instead. Never give real financial or legal advice in this line.";

const BIG_GAIN_QUIPS = [
  "Congrats on the bag: the tax man says thank you for your service.",
  "Onchain legend, offchain donor: the IRS thanks you for your generosity.",
  "Big bag, bigger bill: hope the flex was worth the invoice.",
  "You out-traded the market and in-funded the government. Balanced, in a way.",
  "Somewhere a tax collector just felt a disturbance in the force.",
  "Nice gains. Shame about the silent business partner who shows up every April.",
  "You beat the market. The market's cousin at the tax office would like a word.",
  "Bag secured. Now comes the part where you share it with a silent partner.",
  "Whale numbers, minnow excuses when April comes knocking.",
  "The chart went up, and so did your government's mood.",
  "Diamond hands, paper trail: the taxman reads both.",
];

const LOSS_QUIPS = [
  "Silver lining: it's hard to tax money that's already gone.",
  "Good news: no tax bill. Bad news: you already know why.",
  "The market gave a lesson this time, tuition non-refundable.",
  "At least the taxman can't repossess what never made it home.",
  "Red numbers, but hey, at least there's nothing for the government to touch.",
  "Loss harvesting: the only silver lining that actually shows up on a spreadsheet.",
  "Nothing taxes a loss like the loss itself already did.",
  "Rough chart, but on the bright side, this is the one report the IRS won't enjoy.",
  "You paid tuition to the market. No refunds, no receipts, no taxes either.",
  "The dip took your bag. It left your tax bill light, at least.",
];

const NEUTRAL_QUIPS = [
  "Numbers crunched, ego intact. On to the next trade.",
  "Nothing wild here, just a quiet ledger doing quiet ledger things.",
  "Modest moves, modest bill. The boring trade is still a trade.",
  "No fireworks this round, but the math still checks out.",
  "Steady as she goes: no legends made, no lessons learned the hard way.",
  "A quiet report for a quiet wallet. Even the taxman is unimpressed.",
  "Not every wallet needs a plot twist. This one's just fine as-is.",
  "Middle of the road, numbers-wise. Comes with the territory.",
];

// Last fallback line served per bucket, never repeated back-to-back, even under
// heavy LLM rate-limiting where the fallback pool is effectively the only source.
const lastQuipByBucket = new Map<string, string>();

function pick(bucket: string, list: string[]): string {
  const last = lastQuipByBucket.get(bucket);
  const pool = list.length > 1 && last ? list.filter((q) => q !== last) : list;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  lastQuipByBucket.set(bucket, choice);
  return choice;
}

function fallbackQuip(realizedPnlUsd: number, taxOwedUsd?: number): string {
  if (taxOwedUsd && taxOwedUsd > 0) return pick("gain", BIG_GAIN_QUIPS);
  if (realizedPnlUsd < 0) return pick("loss", LOSS_QUIPS);
  return pick("neutral", NEUTRAL_QUIPS);
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

  return composeMessage(QUIP_ROLE_PROMPT, situation, fallbackQuip(input.realizedPnlUsd, input.potentialTaxOwedUsd), 1.1);
}
