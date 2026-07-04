import type { OpenPosition } from "../types.js";

/** Positions with an unrealized loss, biggest loss first. */
export function rankHarvestOpportunities(positions: OpenPosition[]): OpenPosition[] {
  return positions.filter((p) => p.unrealizedUsd < 0).sort((a, b) => a.unrealizedUsd - b.unrealizedUsd);
}
