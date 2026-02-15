"use server";
import { fetchMarketData, MarketSignal } from "@/lib/market-data";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
// We need yahooFinance for search
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { revalidatePath } from "next/cache";

/**
 * FETCH SIGNALS: Reads from user's watchlist in DB.
 * If DB empty (first run), uses defaults.
 */
export async function getMarketSignals(): Promise<MarketSignal[]> {
  // 1. Get Active Assets from DB
  let activeTickers: string[] = [];
  try {
     const dbAssets = await db.query.assets.findMany({
        where: eq(assets.isActive, true),
        limit: 10 // Safety cap for V1
     });
     activeTickers = dbAssets.map(a => a.ticker);
  } catch (e) {
     console.warn("DB Read Failed, using defaults", e);
  }

  // Fallback if DB empty
  if (activeTickers.length === 0) {
     activeTickers = ["BTC-USD", "NVDA", "SPY", "VIX"];
     // Seed them? No, let user do it via UI
  }

  // 2. Fetch Live Data Parallel
  // 2. BATCH FETCH (Rate Limit Friendly)
  const signals: MarketSignal[] = [];
  const BATCH_SIZE = 3;
  
  for (let i = 0; i < activeTickers.length; i += BATCH_SIZE) {
     const batch = activeTickers.slice(i, i + BATCH_SIZE);
     const batchResults = await Promise.all(
        batch.map(ticker => fetchMarketData(ticker, 100))
     );
     signals.push(...batchResults);
     // Optional: await new Promise(r => setTimeout(r, 200));
  }
  
  return signals;
}

/**
 * SEARCH: Finds assets via Yahoo Finance API
 */
export async function searchAssets(query: string) {
  if (!query || query.length < 2) return [];
  
  try {
    const results = await yahooFinance.search(query) as { quotes: any[] };
    return results.quotes
      .filter((q: any) => q.isYahooFinance) // Ensure valid ticker
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exch: q.exchange,
        type: q.quoteType
      }))
      .slice(0, 5);
  } catch (e) {
    console.error("Search failed:", e);
    return [];
  }
}

/**
 * ADD: Activates an asset in the Dashboard
 */
export async function addAsset(ticker: string, name: string) {
  try {
    // SECURITY: Prevent abuse by limiting total active assets
    const currentCount = await db.query.assets.findMany({
        where: eq(assets.isActive, true),
        columns: { ticker: true }
    });
    
    if (currentCount.length >= 12) {
        return { success: false, error: "Limit reached (12 assets max for v1.0)" };
    }

    await db.insert(assets).values({
      ticker,
      name: name.substring(0, 50), // Truncate for DB limits
      isActive: true,
      sector: "Unknown"
    }).onConflictDoUpdate({
      target: assets.ticker,
      set: { isActive: true }
    });
    
    revalidatePath("/"); // Refresh dashboard
    return { success: true };
  } catch (e) {
    console.error("Add Asset Failed:", e);
    return { success: false, error: "Database error" };
  }
}

/**
 * REMOVE: Deactivates an asset
 */
export async function removeAsset(ticker: string) {
  try {
    await db.update(assets)
      .set({ isActive: false })
      .where(eq(assets.ticker, ticker));
      
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function getAssetDetails(ticker: string) {
    const decodedTicker = decodeURIComponent(ticker);
    return await fetchMarketData(decodedTicker, 365);
}
