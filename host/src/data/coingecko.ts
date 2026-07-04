const COINGECKO_API = "https://api.coingecko.com/api/v3";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Current USD price per contract address, keyed by lowercased address. Missing entries
 * mean CoinGecko has no listing (treated as illiquid/dead by the verdict engine).
 * CoinGecko's unauthenticated free tier caps batch lookups at 1 contract address per
 * call, so this fetches sequentially with light spacing to stay under rate limits.
 */
export async function getCurrentTokenPricesUsd(addresses: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  for (const address of addresses) {
    const url = new URL(`${COINGECKO_API}/simple/token_price/ethereum`);
    url.searchParams.set("contract_addresses", address);
    url.searchParams.set("vs_currencies", "usd");

    try {
      const res = await fetch(url.toString());
      const json = await res.json();
      const price = json[address.toLowerCase()]?.usd;
      if (price) result.set(address.toLowerCase(), price);
    } catch {
      // treated as "no listing" — verdict engine handles this as illiquid/dead
    }
    await sleep(300);
  }

  return result;
}

/**
 * ETH/USD price series for [fromUnix, toUnix], as [timestampMs, price] pairs sorted ascending.
 * CoinGecko's free tier only serves the past 365 days of history — older ranges return an
 * error, in which case this returns an empty series (caller should fall back to a flat price).
 */
export async function getEthUsdPriceSeries(fromUnix: number, toUnix: number): Promise<Array<[number, number]>> {
  const url = new URL(`${COINGECKO_API}/coins/ethereum/market_chart/range`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("from", String(fromUnix));
  url.searchParams.set("to", String(toUnix + 3600));

  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    return (json.prices ?? []) as Array<[number, number]>;
  } catch {
    return [];
  }
}

export async function getCurrentEthPriceUsd(): Promise<number> {
  const url = new URL(`${COINGECKO_API}/simple/price`);
  url.searchParams.set("ids", "ethereum");
  url.searchParams.set("vs_currencies", "usd");
  const res = await fetch(url.toString());
  const json = await res.json();
  return json.ethereum?.usd ?? 0;
}

/**
 * Nearest known ETH/USD price at or before the given unix-seconds timestamp. Falls back to
 * `fallbackPrice` (current ETH price) when the series is empty — e.g. the trade predates
 * CoinGecko's free 365-day history window — so cost basis degrades to an approximation
 * instead of silently zeroing out.
 */
export function nearestEthPrice(series: Array<[number, number]>, unixSeconds: number, fallbackPrice = 0): number {
  if (series.length === 0) return fallbackPrice;
  const targetMs = unixSeconds * 1000;
  let best = series[0];
  let bestDiff = Math.abs(series[0][0] - targetMs);
  for (const point of series) {
    const diff = Math.abs(point[0] - targetMs);
    if (diff < bestDiff) {
      best = point;
      bestDiff = diff;
    }
  }
  return best[1];
}
