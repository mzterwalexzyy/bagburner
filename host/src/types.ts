export interface Trade {
  txHash: string;
  timestamp: number; // unix seconds
  tokenAddress: string;
  tokenSymbol: string;
  side: "buy" | "sell";
  tokenAmount: number; // human-readable units (already divided by decimals)
  ethAmount: number; // ETH moved in the parent tx, used as the USD proxy leg
}

export interface OpenPosition {
  tokenAddress: string;
  tokenSymbol: string;
  quantity: number;
  avgCostUsd: number; // per-token average cost basis
  currentPriceUsd: number | null;
  unrealizedUsd: number; // negative = loss; treated as full loss of cost basis when currentPriceUsd is null (delisted/no liquidity)
  verdict: Verdict;
}

export type Verdict = "cut" | "watch" | "hold" | "take-profit";

export interface TaxReport {
  requestId: string;
  walletAnalyzed: string;
  chain: "ETH";
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  harvestOpportunities: OpenPosition[];
  positions: OpenPosition[];
  llmSummary: string;
  taxRatePercent?: number; // optional, when provided, potentialTaxOwedUsd is computed
  potentialTaxOwedUsd?: number;
  quip: string; // always-present closing one-liner
  computedAt: string;
}

export interface ReportRequestBody {
  guest: string;
  walletAnalyzed: string;
  txHash: string;
  chain: "ETH";
  telegramChatId?: string;
  taxRatePercent?: number;
}
