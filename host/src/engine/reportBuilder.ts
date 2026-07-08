import { fetchTradesForWallet } from "../data/etherscan.js";
import { getCurrentTokenPricesUsd, getEthUsdPriceSeries, getCurrentEthPriceUsd, nearestEthPrice } from "../data/coingecko.js";
import { computePnl } from "./pnl.js";
import { assessPositions } from "./verdict.js";
import { rankHarvestOpportunities } from "./harvest.js";
import { summarize } from "../llm/summarize.js";
import { generateQuip } from "../llm/quip.js";
import type { TaxReport } from "../types.js";

/** Runs the full off-chain analysis pipeline for a wallet, shared by the guest HTTP flow and the direct human-chat flow. */
export async function buildTaxReport(walletAnalyzed: string, requestId: string, taxRatePercent?: number): Promise<TaxReport> {
  const trades = await fetchTradesForWallet(walletAnalyzed);

  let ethUsdAt = (_: number) => 0;
  if (trades.length > 0) {
    const from = trades[0].timestamp;
    const to = trades[trades.length - 1].timestamp;
    const [series, currentEthPrice] = await Promise.all([getEthUsdPriceSeries(from, to), getCurrentEthPriceUsd()]);
    ethUsdAt = (ts: number) => nearestEthPrice(series, ts, currentEthPrice);
  }

  const { realizedPnlUsd, openPositions } = computePnl(trades, ethUsdAt);
  const currentPrices = await getCurrentTokenPricesUsd(openPositions.map((p) => p.tokenAddress));
  const positions = assessPositions(openPositions, currentPrices);
  const harvestOpportunities = rankHarvestOpportunities(positions);
  const unrealizedPnlUsd = positions.reduce((sum, p) => sum + p.unrealizedUsd, 0);

  const llmSummary = await summarize({ walletAnalyzed, realizedPnlUsd, unrealizedPnlUsd, harvestOpportunities });

  // Tax is only owed on net positive realized gains; a net loss owes nothing, it doesn't go negative.
  const potentialTaxOwedUsd = taxRatePercent !== undefined ? Math.max(realizedPnlUsd, 0) * (taxRatePercent / 100) : undefined;

  const quip = await generateQuip({ realizedPnlUsd, unrealizedPnlUsd, taxRatePercent, potentialTaxOwedUsd });

  return {
    requestId,
    walletAnalyzed,
    chain: "ETH",
    realizedPnlUsd,
    unrealizedPnlUsd,
    harvestOpportunities,
    positions,
    llmSummary,
    taxRatePercent,
    potentialTaxOwedUsd,
    quip,
    computedAt: new Date().toISOString(),
  };
}
