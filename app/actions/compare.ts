"use server";
import { fetchMarketData, MarketSignal } from "@/lib/market-data";
import { fetchStockDetails, StockDetails } from "@/lib/stock-details";

export interface ComparisonAsset {
  ticker: string;
  signal: MarketSignal;
  details: StockDetails;
}

export async function fetchComparisonData(tickers: string[]): Promise<ComparisonAsset[]> {
  if (tickers.length === 0) return [];
  // Cap at 4 assets to maintain UI quality
  const capped = tickers.slice(0, 4).map(t => t.toUpperCase().trim());

  const results = await Promise.allSettled(
    capped.map(async (ticker) => {
      const [signal, details] = await Promise.all([
        fetchMarketData(ticker, 500),
        fetchStockDetails(ticker),
      ]);
      return { ticker, signal, details } as ComparisonAsset;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ComparisonAsset> => r.status === "fulfilled")
    .map(r => r.value);
}
