"use server";

import { scanInstrument, HighConfidenceSetup, MarketCandle } from "@/lib/market-scanner";
import { getFromCache, setInCache } from "@/lib/cache";
import { db } from "@/db";
import { futuresCandles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const DEFAULT_SCAN_UNIVERSE = ["GC.V.0", "6E.V.0"];
const CACHE_TTL_MS = 60 * 1000; // Cache scanner results for 60 seconds

/**
 * Executes high-confidence scans across the target futures universe.
 */
export async function getHighConfidenceScans(symbols: string[] = DEFAULT_SCAN_UNIVERSE): Promise<HighConfidenceSetup[]> {
  try {
    const cacheKey = `scanner_high_confidence_${symbols.join("_")}`;
    const cached = await getFromCache<HighConfidenceSetup[]>(cacheKey);
    if (cached) return cached;

    const results: HighConfidenceSetup[] = [];

    for (const symbol of symbols) {
      // Fetch recent 100 candles from DB
      const history = await db.query.futuresCandles.findMany({
        where: eq(futuresCandles.ticker, symbol.toUpperCase()),
        limit: 100,
        orderBy: desc(futuresCandles.timestamp),
      });

      if (history.length < 14) continue;

      const candles: MarketCandle[] = history.reverse().map((h: any) => ({
        time: Math.floor(new Date(h.timestamp).getTime() / 1000),
        open: parseFloat(h.open),
        high: parseFloat(h.high),
        low: parseFloat(h.low),
        close: parseFloat(h.close),
        volume: parseFloat(h.volume),
        cvd: parseFloat(h.cvd),
      }));

      const setup = scanInstrument(symbol, candles);
      if (setup) {
        results.push(setup);
      }
    }

    results.sort((a, b) => b.confluence.totalConfluenceScore - a.confluence.totalConfluenceScore);

    await setInCache(cacheKey, results, CACHE_TTL_MS);
    return results;
  } catch (err) {
    console.error("[Scanner Action] getHighConfidenceScans error:", err);
    return [];
  }
}
