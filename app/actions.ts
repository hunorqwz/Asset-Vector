"use server";
import { fetchMarketData, MarketSignal, fetchHistoryWithInterval, RANGE_INTERVAL_MAP, OHLCV } from "@/lib/market-data";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq } from "drizzle-orm";
import YahooFinance from 'yahoo-finance2';
import { revalidatePath } from "next/cache";
import { predictNextHorizon } from "@/lib/inference";
import { fetchStockDetails } from "@/lib/stock-details";

const yahooFinance = new YahooFinance();

export async function getMarketSignals(): Promise<MarketSignal[]> {
  let tickers: string[] = ["BTC-USD", "NVDA", "SPY", "VIX"];
  try {
    const dbAssets = await db.query.assets.findMany({ where: eq(assets.isActive, true), limit: 12 });
    if (dbAssets.length) tickers = dbAssets.map((a: any) => a.ticker);
  } catch {}

  const results = await Promise.all(tickers.map(t => fetchMarketData(t, 100).catch(() => null)));
  return results.filter((r): r is MarketSignal => r !== null);
}

export async function searchAssets(query: string) {
  if (!query || query.length < 2) return [];
  try {
    const res = await yahooFinance.search(query) as any;
    return res.quotes.filter((q: any) => q.isYahooFinance).map((q: any) => ({
      ticker: q.symbol, name: q.shortname || q.longname || q.symbol, exch: q.exchange, type: q.quoteType
    })).slice(0, 5);
  } catch { return []; }
}

export async function addAsset(ticker: string, name: string) {
  try {
    const current = await db.query.assets.findMany({ where: eq(assets.isActive, true), columns: { ticker: true } });
    if (current.length >= 12) return { success: false, error: "LIMIT_REACHED" };

    await db.insert(assets).values({ ticker, name: name.substring(0, 50), isActive: true, sector: "Unknown" })
      .onConflictDoUpdate({ target: assets.ticker, set: { isActive: true } });
    
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "DB_ERROR" };
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
  const [signal, stockDetails] = await Promise.all([
    fetchMarketData(sym, 2500),
    fetchStockDetails(sym),
  ]);
  
  const sequence = signal.history.slice(-50).map(h => [h.open, h.high, h.low, h.close, h.volume]);
  const prediction = await predictNextHorizon(sequence, sym);
  
  return { ...signal, prediction, stockDetails };
}

export async function fetchChartData(ticker: string, range: string): Promise<OHLCV[]> {
  const config = RANGE_INTERVAL_MAP[range] || { interval: '1d', lookbackSeconds: 0 };
  return fetchHistoryWithInterval(ticker, config.interval, config.lookbackSeconds);
}
