"use server";
import { getPersistentSignal, fetchLiveQuote, MarketSignal, fetchHistoryWithInterval, RANGE_INTERVAL_MAP, OHLCV } from "@/lib/market-data";
import { db } from "@/db";
import { assets, userWatchlists, userPositions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import YahooFinance from 'yahoo-finance2';
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { predictNextHorizon } from "@/lib/inference";
import { fetchStockDetails } from "@/lib/stock-details";
import { archiveSignal, evaluateOldSignals } from "@/app/actions/signals";
import { fetchOptionsIntelligence } from "@/lib/options-pricing";

import { fetchMarketPulse, MarketPulseData } from "@/lib/market-pulse";
import { getAlpacaAccount, getAlpacaPositions, getAlpacaQuote } from "@/lib/alpaca-client";
import { after } from "next/server";

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

// NOTE: executeTrade has been removed from this file.
// The canonical implementation is in app/actions/execute.ts
// Signature: executeTrade(ticker, side, notionalValue, currentPrice)
// Import directly from "@/app/actions/execute" in any component that needs it.

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

export async function getPortfolioPrices(tickers: string[]): Promise<Record<string, number | null>> {
  if (tickers.length === 0) return {};
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const price = await fetchLiveQuote(ticker);
        return [ticker, price] as [string, number | null];
      } catch {
        return [ticker, null] as [string, null];
      }
    })
  );
  return Object.fromEntries(results);
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
  } catch (error) {
    console.error(`[Watchlist Sync] Failed to retrieve system routing for user ${session.user.id}:`, error);
  }

  // If no assets in personal watchlist, strictly return empty array
  if (tickers.length === 0) return [];

  const results = await Promise.all(tickers.map(async (t) => {
    try {
      const sig = await getPersistentSignal(t, 2500);
      return sig;
    } catch {
      return null;
    }
  }));

  // Perform data hygiene and evaluate old signals without blocking request via SPLR (after phase)
  after(() => {
    evaluateOldSignals().catch((e) => console.error("[Background Eval] Error:", e));
  });

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
    getPersistentSignal(sym, 2500),
    fetchStockDetails(sym),
  ]);

  const currentPrice = stockDetails.price.current;
  const optionsIntelligence = await fetchOptionsIntelligence(sym, currentPrice);
  
  const prediction = signal.prediction; // Reuse prediction from persistent signal
  
  after(() => {
    if (signal) archiveSignal(signal).catch((e) => console.error("[Background Archive] Error:", e));
    evaluateOldSignals().catch((e) => console.error("[Background Eval] Error:", e));
  });

  return { ...signal, prediction, stockDetails, optionsIntelligence };
}

export async function getMinimalAssetDetails(ticker: string) {
  const sym = decodeURIComponent(ticker);
  // Fetch 2500 bars from persistence/cache instead of full analytical run
  const [signal, stockDetails] = await Promise.all([
    getPersistentSignal(sym, 2500),
    fetchStockDetails(sym), // This is heavily cached (1 hour)
  ]);
  
  return { ...signal, stockDetails };
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
  const userId = session.user.id;

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

    // Batch upsert assets globally
    const assetEntries = finallyToAdd.map((pos: any) => ({
        ticker: pos.ticker,
        name: pos.name.substring(0, 50),
        isActive: true,
        sector: "Unknown"
    }));
    await db.insert(assets).values(assetEntries)
        .onConflictDoUpdate({ target: assets.ticker, set: { isActive: true } });

    // Batch insertion into user watchlist
    const watchlistEntries = finallyToAdd.map((pos: any) => ({
        userId,
        ticker: pos.ticker
    }));
    await db.insert(userWatchlists).values(watchlistEntries)
        .onConflictDoNothing();

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
