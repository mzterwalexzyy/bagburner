import type { OpenPosition, Verdict } from "../types.js";
import type { RawPosition } from "./pnl.js";

/**
 * Rule-based verdict per open position — no dev-wallet-activity or social-signal
 * inputs (out of MVP scope). Liquidity proxy: a token with no CoinGecko listing
 * is treated as illiquid/dead, since there's no reliable price to sell against.
 */
export function assessPositions(positions: RawPosition[], currentPrices: Map<string, number>): OpenPosition[] {
  return positions.map((p) => {
    const currentPriceUsd = currentPrices.get(p.tokenAddress.toLowerCase()) ?? null;

    if (currentPriceUsd === null) {
      return {
        ...p,
        currentPriceUsd: null,
        unrealizedUsd: -p.quantity * p.avgCostUsd,
        verdict: "cut" as Verdict,
      };
    }

    const unrealizedUsd = p.quantity * (currentPriceUsd - p.avgCostUsd);
    const pctChange = p.avgCostUsd > 0 ? (currentPriceUsd - p.avgCostUsd) / p.avgCostUsd : 0;

    let verdict: Verdict;
    if (pctChange <= -0.5) verdict = "cut";
    else if (pctChange <= -0.15) verdict = "watch";
    else if (pctChange >= 0.3) verdict = "take-profit";
    else verdict = "hold";

    return { ...p, currentPriceUsd, unrealizedUsd, verdict };
  });
}
