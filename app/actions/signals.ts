"use server";
import { db } from "@/db";
import { marketSignals } from "@/db/schema";
import { MarketSignal, fetchHistoryWithInterval } from "@/lib/market-data";
import { eq, and, desc, sql, gt, lt, lte } from "drizzle-orm";
import { getFromCache, setInCache } from "@/lib/cache";
import { withLock } from "@/lib/locks";

/**
 * Periodically archives generated signals to track historical accuracy.
 */
export async function archiveSignal(signal: MarketSignal) {
  try {
    const CACHE_KEY = `signal_archive_${signal.ticker}`;
    if (await getFromCache(CACHE_KEY)) return;

    const FOUR_HOURS_AGO = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const existing = await db.query.marketSignals.findFirst({
      where: and(
        eq(marketSignals.ticker, signal.ticker),
        gt(marketSignals.generatedAt, FOUR_HOURS_AGO)
      ),
      orderBy: desc(marketSignals.generatedAt),
    });

    if (existing) {
      await setInCache(CACHE_KEY, true, existing.generatedAt!.getTime() + (4 * 60 * 60 * 1000) - Date.now());
      return;
    }
    
    await setInCache(CACHE_KEY, true, 4 * 60 * 60 * 1000); // 4 Hour Lock

    await db.insert(marketSignals).values({
      ticker: signal.ticker,
      priceAtGeneration: signal.price.toString(),
      score: signal.synthesis.score.toString(),
      signalLabel: signal.synthesis.signal,
      direction: signal.trend,
      confidence: signal.predictability.toString(),
      snr: signal.snr.toString(),
      regime: signal.regime,
      isEvaluated: false,
    });
  } catch (error) {
    console.error("[Signal Archive] Error:", error);
  }
}

/**
 * Scans for signals older than 7 days that haven't been evaluated.
 * Uses actual price movement to determine accuracy.
 */
export async function evaluateOldSignals() {
  return withLock("signal_evaluation", async () => {
    const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find up to 20 unevaluated signals older than 7 days
    const unevaluated = await db.query.marketSignals.findMany({
      where: and(
        eq(marketSignals.isEvaluated, false),
        lt(marketSignals.generatedAt, SEVEN_DAYS_AGO)
      ),
      limit: 20,
    });

    if (unevaluated.length === 0) return;

    console.log(`[Signal Evaluation] Evaluating ${unevaluated.length} signals...`);

    for (const sig of unevaluated) {
      try {
        const genTime = new Date(sig.generatedAt!).getTime();
        const targetTime = genTime + (7 * 24 * 60 * 60 * 1000);
        
        const [history, spyHistory] = await Promise.all([
          fetchHistoryWithInterval(sig.ticker, '1d', 14 * 86400),
          fetchHistoryWithInterval("SPY", '1d', 14 * 86400)
        ]);
        
        if (!history || history.length === 0 || !spyHistory || spyHistory.length === 0) continue;

        // Extract outcome boundaries for asset
        let outcomeBar = history.find((h: any) => (h.time * 1000) >= targetTime);
        if (!outcomeBar) {
          const lastBar = history[history.length - 1];
          if (!lastBar) continue;
          const lastBarTime = lastBar.time * 1000;
          const now = Date.now();
          if (now > targetTime && Math.abs(lastBarTime - targetTime) < (3 * 24 * 60 * 60 * 1000)) {
            outcomeBar = lastBar;
          }
        }
        if (!outcomeBar) continue;

        // Extract benchmark boundaries
        // Use a 4-day trailing lookback to catch friday/weekend generation gaps
        const spyInitialBar = spyHistory.find((h: any) => (h.time * 1000) >= genTime - (4 * 24 * 60 * 60 * 1000)) || spyHistory[spyHistory.length - 1];
        let spyOutcomeBar = spyHistory.find((h: any) => (h.time * 1000) >= targetTime);
        if (!spyOutcomeBar) spyOutcomeBar = spyHistory[spyHistory.length - 1];

        const entryPrice = Number(sig.priceAtGeneration);
        const exitPrice = outcomeBar.close;
        const changePct = (exitPrice - entryPrice) / entryPrice;

        const spyEntry = spyInitialBar.close;
        const spyExit = spyOutcomeBar.close;
        const spyChangePct = (spyExit - spyEntry) / spyEntry;

        const alpha = changePct - spyChangePct;

        // Benchmark-relative Accuracy Grading (Alpha Performance)
        let accuracyScore = 0;
        if (sig.direction === "BULLISH") {
          accuracyScore = Math.max(0, Math.min(1, (alpha + 0.015) / 0.03));
        } else if (sig.direction === "BEARISH") {
          accuracyScore = Math.max(0, Math.min(1, (-alpha + 0.015) / 0.03));
        } else if (sig.direction === "NEUTRAL") {
          accuracyScore = Math.max(0, 1 - (Math.abs(alpha) / 0.02));
        }

        await db.update(marketSignals)
          .set({
            isEvaluated: true,
            outcomePrice7D: exitPrice.toString(),
            benchmarkPriceAtGeneration: spyEntry.toString(),
            benchmarkOutcomePrice: spyExit.toString(),
            alphaPerformance: alpha.toFixed(4),
            accuracy: accuracyScore.toFixed(2),
          })
          .where(eq(marketSignals.id, sig.id));

      } catch (err) {
        console.error(`[Signal Evaluation] Error for ${sig.ticker}:`, err);
      }
    }

    // Run data hygiene to prevent unbounded database growth
    await pruneHistoricalData();
  });
}

/**
 * Returns the global and ticker-specific accuracy scores.
 */
export async function getAccuracyScorecard(ticker?: string) {
  try {
    const whereClause = ticker 
      ? and(eq(marketSignals.isEvaluated, true), eq(marketSignals.ticker, ticker)) 
      : eq(marketSignals.isEvaluated, true);
    
    const evaluated = await db.query.marketSignals.findMany({
      where: whereClause,
      limit: 100,
      orderBy: desc(marketSignals.generatedAt),
    });

    if (evaluated.length === 0) return null;

    const total = evaluated.length;
    const sum = evaluated.reduce((acc: number, s: any) => acc + Number(s.accuracy), 0);
    const accuracy = (sum / total) * 100;
    const correct = evaluated.filter((s: any) => Number(s.accuracy) >= 0.5).length;

    return {
      total,
      correct,
      accuracy: Number(accuracy.toFixed(1)),
      samples: evaluated.slice(0, 10).map((s: any) => ({
        ticker: s.ticker,
        at: s.generatedAt,
        label: s.signalLabel,
        correct: Number(s.accuracy) >= 0.5,
        entry: Number(s.priceAtGeneration),
        outcome: Number(s.outcomePrice7D),
      }))
    };
  } catch (error) {
    console.error("[Accuracy Scorecard] Error:", error);
    return null;
  }
}

/**
 * DATA HYGIENE: Prune old signals (v3.1)
 * Removes signals older than 30 days that have already been evaluated.
 * Keeps an archival record of the "best" signals for performance tracking.
 */
export async function pruneHistoricalData() {
  return withLock("data_pruning", async () => {
    try {
      const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Delete evaluated signals older than 30 days
      const result = await db.delete(marketSignals)
        .where(
          and(
            eq(marketSignals.isEvaluated, true),
            lte(marketSignals.generatedAt, THIRTY_DAYS_AGO)
          )
        );
        
      console.log(`[Data Hygiene] Pruned old signal records.`);
      return { success: true };
    } catch (err) {
      console.error("[Data Hygiene] Pruning failed:", err);
      return { success: false };
    }
  }, 300000); // 5 minute lock for heavy deletion
}
