"use server";
import { fetchMarketData, fetchLiveQuote, MarketSignal, fetchHistoryWithInterval, RANGE_INTERVAL_MAP, OHLCV } from "@/lib/market-data";
import { db } from "@/db";
import { assets, userWatchlists, userPositions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import YahooFinance from 'yahoo-finance2';
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { predictNextHorizon } from "@/lib/inference";
import { fetchStockDetails } from "@/lib/stock-details";
import { archiveSignal, evaluateOldSignals } from "@/app/actions/signals";

import { fetchMarketPulse, MarketPulseData } from "@/lib/market-pulse";
import { getAlpacaAccount, getAlpacaPositions, placeAlpacaOrder, getAlpacaQuote } from "@/lib/alpaca-client";

export async function getAlpacaData() {
  try {
    const [account, positions] = await Promise.all([
      getAlpacaAccount(),
      getAlpacaPositions()
    ]);
    return { account, positions };
  } catch (err) {
    return null;
  }
}

export async function executeTrade(symbol: string, qty: string, side: "buy" | "sell") {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };
  
  try {
    const order = await placeAlpacaOrder(symbol, qty, side);
    return { success: true, order };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getLiveQuote(symbol: string) {
  try {
    const q = await getAlpacaQuote(symbol);
    if (!q) return null;
    return { ap: q.ap, bp: q.bp };
  } catch {
    return null;
  }
}

const WATCHLIST_LIMIT = 12;

export async function getMarketPulse(): Promise<MarketPulseData> {
  return fetchMarketPulse();
}

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
      limit: WATCHLIST_LIMIT
    });
    if (dbWatchlist.length > 0) {
      tickers = dbWatchlist.map((w: any) => w.ticker);
    }
  } catch {}

  // If no assets in personal watchlist, strictly return empty array
  if (tickers.length === 0) return [];

  const results = await Promise.all(tickers.map(async (t) => {
    try {
      const sig = await fetchMarketData(t, 100);
      if (sig) await archiveSignal(sig);
      return sig;
    } catch {
      return null;
    }
  }));

  // Fire and forget evaluation of old signals occasionally
  evaluateOldSignals().catch(() => {});

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
    if (current.length >= WATCHLIST_LIMIT) return { success: false, error: "LIMIT_REACHED" };

    // Register asset globally if it doesn't exist
    await db.insert(assets).values({ ticker, name: name.substring(0, 50), isActive: true, sector: "Unknown" })
      .onConflictDoUpdate({ target: assets.ticker, set: { isActive: true } });
    
    // Link to user's personal watchlist
    await db.insert(userWatchlists).values({
      userId: session.user.id,
      ticker: ticker
    }).onConflictDoNothing();
    
    revalidatePath("/");
    revalidatePath("/portfolio");
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
  
  if (signal) await archiveSignal(signal);
  evaluateOldSignals().catch(() => {});

  return { ...signal, prediction, stockDetails };
}

export async function fetchChartData(ticker: string, range: string): Promise<OHLCV[]> {
  const config = RANGE_INTERVAL_MAP[range] || { interval: '1d', lookbackSeconds: 0 };
  return fetchHistoryWithInterval(ticker, config.interval, config.lookbackSeconds);
}

export async function getWatchlistTickers(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  
  const current = await db.query.userWatchlists.findMany({ 
    where: eq(userWatchlists.userId, session.user.id),
    columns: { ticker: true } 
  });
  return current.map((c: any) => c.ticker);
}

export async function addAllToWatchlist() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };

  try {
    const currentWatchlist = await db.query.userWatchlists.findMany({ 
      where: eq(userWatchlists.userId, session.user.id),
      columns: { ticker: true } 
    });
    
    if (currentWatchlist.length >= WATCHLIST_LIMIT) return { success: false, error: "LIMIT_REACHED" };

    const positions = await db.query.userPositions.findMany({
      where: eq(userPositions.userId, session.user.id),
    });

    const watchlistTickers = new Set(currentWatchlist.map((c: any) => c.ticker));
    // Use a Map or unique by ticker to avoid duplicates if multiple positions for same ticker exist
    const uniquePositions = Array.from(new Map(positions.map((p: any) => [p.ticker, p])).values() as IterableIterator<any>);
    const toAdd = uniquePositions.filter((p: any) => !watchlistTickers.has(p.ticker));

    if (toAdd.length === 0) return { success: true, addedCount: 0 };

    const availableSlots = WATCHLIST_LIMIT - currentWatchlist.length;
    const finallyToAdd = toAdd.slice(0, availableSlots);

    for (const pos of finallyToAdd as any[]) {
        // Register asset globally if it doesn't exist
        await db.insert(assets).values({ 
            ticker: pos.ticker, 
            name: pos.name.substring(0, 50), 
            isActive: true, 
             sector: "Unknown" 
        }).onConflictDoUpdate({ target: assets.ticker, set: { isActive: true } });

        // Link to user's personal watchlist
        await db.insert(userWatchlists).values({
            userId: session.user.id,
            ticker: pos.ticker
        }).onConflictDoNothing();
    }

    revalidatePath("/");
    revalidatePath("/portfolio");
    
    return { 
        success: true, 
        addedCount: finallyToAdd.length, 
        limitReached: toAdd.length > availableSlots 
    };
  } catch (err) {
    console.error("Add all error:", err);
    return { success: false, error: "DB_ERROR" };
  }
}
