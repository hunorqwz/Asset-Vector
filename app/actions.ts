"use server";
import { fetchMarketData, fetchLiveQuote, MarketSignal, fetchHistoryWithInterval, RANGE_INTERVAL_MAP, OHLCV } from "@/lib/market-data";
import { db } from "@/db";
import { assets, userWatchlists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import YahooFinance from 'yahoo-finance2';
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { predictNextHorizon } from "@/lib/inference";
import { fetchStockDetails } from "@/lib/stock-details";

const yahooFinance = new YahooFinance();

export async function getPortfolioPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const price = await fetchLiveQuote(ticker);
        return [ticker, price] as [string, number];
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(results.filter((r): r is [string, number] => r !== null));
}

export async function getMarketSignals(): Promise<MarketSignal[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  let tickers: string[] = []; 
  try {
    const dbWatchlist = await db.query.userWatchlists.findMany({
      where: eq(userWatchlists.userId, session.user.id),
      limit: 12
    });
    if (dbWatchlist.length > 0) {
      tickers = dbWatchlist.map((w: any) => w.ticker);
    }
  } catch {}

  // If no assets in personal watchlist, strictly return empty array
  if (tickers.length === 0) return [];

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
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };

  try {
    const current = await db.query.userWatchlists.findMany({ 
      where: eq(userWatchlists.userId, session.user.id),
      columns: { ticker: true } 
    });
    if (current.length >= 12) return { success: false, error: "LIMIT_REACHED" };

    // Register asset globally if it doesn't exist
    await db.insert(assets).values({ ticker, name: name.substring(0, 50), isActive: true, sector: "Unknown" })
      .onConflictDoUpdate({ target: assets.ticker, set: { isActive: true } });
    
    // Link to user's personal watchlist
    await db.insert(userWatchlists).values({
      userId: session.user.id,
      ticker: ticker
    }).onConflictDoNothing();
    
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "DB_ERROR" };
  }
}

export async function removeAsset(ticker: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  try {
    await db.delete(userWatchlists)
      .where(and(
        eq(userWatchlists.userId, session.user.id),
        eq(userWatchlists.ticker, ticker)
      ));
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
