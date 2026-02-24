"use server";
import { fetchMarketData, MarketSignal, fetchHistoryWithInterval, RANGE_INTERVAL_MAP, OHLCV } from "@/lib/market-data";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq } from "drizzle-orm";
import YahooFinance from 'yahoo-finance2';
import { revalidatePath } from "next/cache";
import { predictNextHorizon } from "@/lib/inference";
import { fetchStockDetails, StockDetails } from "@/lib/stock-details";

const yahooFinance = new YahooFinance();

export async function getMarketSignals(): Promise<MarketSignal[]> {
  let tickers: string[] = [];
  try {
    const dbAssets = await db.query.assets.findMany({ where: eq(assets.isActive, true), limit: 12 });
    tickers = dbAssets.map((a: { ticker: string }) => a.ticker);
  } catch {}

  if (tickers.length === 0) tickers = ["BTC-USD", "NVDA", "SPY", "VIX"];

  const results: MarketSignal[] = [];
  const batches = [];
  for (let i = 0; i < tickers.length; i += 4) batches.push(tickers.slice(i, i + 4));

  for (const batch of batches) {
    const batchData = await Promise.all(batch.map(t => fetchMarketData(t, 100)));
    results.push(...batchData);
  }
  
  return results;
}

interface YahooSearchQuote { symbol: string; shortname?: string; longname?: string; exchange: string; quoteType: string; isYahooFinance: boolean }

export async function searchAssets(query: string) {
  if (!query || query.length < 2) return [];
  try {
    const res = await yahooFinance.search(query) as { quotes: YahooSearchQuote[] };
    return res.quotes.filter(q => q.isYahooFinance).map(q => ({
      ticker: q.symbol, name: q.shortname || q.longname || q.symbol, exch: q.exchange, type: q.quoteType
    })).slice(0, 5);
  } catch { return []; }
}

export async function addAsset(ticker: string, name: string) {
  try {
    const current = await db.query.assets.findMany({ where: eq(assets.isActive, true), columns: { ticker: true } });
    if (current.length >= 12) return { success: false, error: "Limit reached (12 assets)" };

    await db.insert(assets).values({ ticker, name: name.substring(0, 50), isActive: true, sector: "Unknown" })
      .onConflictDoUpdate({ target: assets.ticker, set: { isActive: true } });
    
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Database error" };
  }
}

export async function removeAsset(ticker: string) {
  try {
    await db.update(assets).set({ isActive: false }).where(eq(assets.ticker, ticker));
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getAssetDetails(ticker: string) {
  const sym = decodeURIComponent(ticker);
  
  // Fetch chart/prediction data AND comprehensive stock details in parallel
  const [signal, stockDetails] = await Promise.all([
    fetchMarketData(sym, 2500),
    fetchStockDetails(sym),
  ]);
  
  const sequence = signal.history.slice(-50).map(h => [h.open, h.high, h.low, h.close, h.volume]);
  const pred = await predictNextHorizon(sequence, sym);
  
  return { ...signal, prediction: pred, stockDetails };
}

/**
 * Fetch chart data for a specific time range.
 * Maps the range to the industry-standard interval automatically.
 * Called by the chart client component when the user changes time range.
 */
export async function fetchChartData(ticker: string, range: string): Promise<OHLCV[]> {
  const config = RANGE_INTERVAL_MAP[range];
  if (!config) {
    // Fallback to all available daily data
    return fetchHistoryWithInterval(ticker, '1d', 0);
  }
  return fetchHistoryWithInterval(ticker, config.interval, config.lookbackSeconds);
}
