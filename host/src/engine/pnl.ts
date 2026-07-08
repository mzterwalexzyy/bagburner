import type { Trade } from "../types.js";

interface PositionState {
  quantity: number;
  totalCostUsd: number;
  /** Portion of `quantity` that arrived with no priced acquisition leg (plain inbound
   * transfer, airdrop, spam token), cost-unknown, not cost-zero. Kept separate so a later
   * sale of it can't manufacture a confident realized gain (or, symmetrically, a sale with
   * no priced leg on real holdings can't manufacture a confident realized loss). */
  unknownCostQuantity: number;
  symbol: string;
}

export interface RawPosition {
  tokenAddress: string;
  tokenSymbol: string;
  quantity: number;
  avgCostUsd: number;
}

export interface PnlResult {
  realizedPnlUsd: number;
  openPositions: RawPosition[];
}

/** Average-cost-basis P&L engine (not FIFO; simpler, documented MVP tradeoff). */
export function computePnl(trades: Trade[], ethUsdAt: (unixSeconds: number) => number): PnlResult {
  const positions = new Map<string, PositionState>();
  let realizedPnlUsd = 0;

  for (const trade of trades) {
    const usdValue = trade.ethAmount * ethUsdAt(trade.timestamp);
    const key = trade.tokenAddress.toLowerCase();
    const pos = positions.get(key) ?? { quantity: 0, totalCostUsd: 0, unknownCostQuantity: 0, symbol: trade.tokenSymbol };

    if (trade.side === "buy") {
      pos.quantity += trade.tokenAmount;
      if (usdValue > 0) {
        pos.totalCostUsd += usdValue;
      } else {
        // Plain inbound transfer / airdrop / spam token with no priced leg: this is not
        // a $0 purchase, it's an unknown cost basis. Tracking it separately stops a later
        // sale from being scored as pure invented profit.
        pos.unknownCostQuantity += trade.tokenAmount;
      }
    } else {
      const sellQty = Math.min(trade.tokenAmount, pos.quantity);
      if (sellQty > 0) {
        const knownQty = Math.max(0, pos.quantity - pos.unknownCostQuantity);
        // Only recognize realized P&L for the fraction of this sale backed by a known cost
        // basis AND a priced sale leg. A sale with no priced leg (plain outbound transfer,
        // not a market sale) or a sale of cost-unknown inventory is removed from the position
        // without asserting a gain or loss, since we simply don't have reliable numbers for it.
        if (usdValue > 0 && knownQty > 0) {
          const knownFraction = Math.min(1, knownQty / pos.quantity);
          const knownSellQty = sellQty * knownFraction;
          const avgCost = pos.totalCostUsd / knownQty;
          const costOfSold = avgCost * knownSellQty;
          const knownProceeds = usdValue * knownFraction;
          realizedPnlUsd += knownProceeds - costOfSold;
          pos.totalCostUsd = Math.max(0, pos.totalCostUsd - costOfSold);
        }
        const unknownFraction = pos.quantity > 0 ? Math.min(1, pos.unknownCostQuantity / pos.quantity) : 0;
        pos.unknownCostQuantity = Math.max(0, pos.unknownCostQuantity - sellQty * unknownFraction);
        pos.quantity = Math.max(0, pos.quantity - sellQty);
      }
    }
    positions.set(key, pos);
  }

  const openPositions: RawPosition[] = [];
  for (const [tokenAddress, pos] of positions) {
    if (pos.quantity > 1e-9) {
      openPositions.push({
        tokenAddress,
        tokenSymbol: pos.symbol,
        quantity: pos.quantity,
        avgCostUsd: pos.totalCostUsd / pos.quantity,
      });
    }
  }

  return { realizedPnlUsd, openPositions };
}
