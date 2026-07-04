import type { Trade } from "../types.js";

interface PositionState {
  quantity: number;
  totalCostUsd: number;
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

/** Average-cost-basis P&L engine (not FIFO — simpler, documented MVP tradeoff). */
export function computePnl(trades: Trade[], ethUsdAt: (unixSeconds: number) => number): PnlResult {
  const positions = new Map<string, PositionState>();
  let realizedPnlUsd = 0;

  for (const trade of trades) {
    const usdValue = trade.ethAmount * ethUsdAt(trade.timestamp);
    const key = trade.tokenAddress.toLowerCase();
    const pos = positions.get(key) ?? { quantity: 0, totalCostUsd: 0, symbol: trade.tokenSymbol };

    if (trade.side === "buy") {
      pos.quantity += trade.tokenAmount;
      pos.totalCostUsd += usdValue;
    } else {
      const avgCost = pos.quantity > 0 ? pos.totalCostUsd / pos.quantity : 0;
      const sellQty = Math.min(trade.tokenAmount, pos.quantity);
      const costOfSold = avgCost * sellQty;
      realizedPnlUsd += usdValue - costOfSold;
      pos.quantity = Math.max(0, pos.quantity - sellQty);
      pos.totalCostUsd = Math.max(0, pos.totalCostUsd - costOfSold);
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
