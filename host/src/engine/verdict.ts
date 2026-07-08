import type { OpenPosition, Verdict } from "../types.js";
import type { RawPosition } from "./pnl.js";

/**
 * Rule-based verdict per open position, with no dev-wallet-activity or social-signal
 * inputs (out of MVP scope). Liquidity proxy: a token with no CoinGecko listing
 * is treated as illiquid/dead, since there's no reliable price to sell against.
 */
export function assessPositions(positions: RawPosition[], currentPrices: Map<string, number>): OpenPosition[] {
  return positions.map((p) => {
    const currentPriceUsd = currentPrices.get(p.tokenAddress.toLowerCase()) ?? null;

    if (currentPriceUsd === null) {
      // No listing means no reliable market to value this against. It also means the
      // "cost basis" for tokens that arrived via spam/airdrop (the overwhelming majority
      // of unlisted tokens in practice) is itself unreliable. Asserting the full assumed
      // cost as a definite dollar loss would manufacture a confident number out of noise,
      // the same failure mode as the realized-P&L fix. Flag it as worth cutting, but don't
      // claim a loss we can't actually stand behind.
      return {
        ...p,
        currentPriceUsd: null,
        unrealizedUsd: 0,
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
