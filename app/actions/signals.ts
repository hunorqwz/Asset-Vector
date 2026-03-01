"use server";
import { db } from "@/db";
import { marketSignals } from "@/db/schema";
import { MarketSignal, fetchHistoryWithInterval } from "@/lib/market-data";
import { eq, and, desc, sql, gt, lt } from "drizzle-orm";

/**
 * Periodically archives generated signals to track historical accuracy.
 */
export async function archiveSignal(signal: MarketSignal) {
  try {
    const FOUR_HOURS_AGO = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const existing = await db.query.marketSignals.findFirst({
      where: and(
        eq(marketSignals.ticker, signal.ticker),
        gt(marketSignals.generatedAt, FOUR_HOURS_AGO)
      ),
      orderBy: desc(marketSignals.generatedAt),
    });

    if (existing) return;

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
  try {
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
        const history = await fetchHistoryWithInterval(sig.ticker, '1d');

        // Target: First bar that is >= targetTime
        // If we don't find it, but current time is > targetTime + 2 days (i.e. we definitely missed it)
        // then take the last available bar as the outcome.
        let outcomeBar = history.find((h: any) => (h.time * 1000) >= targetTime);
        
        if (!outcomeBar) {
          const lastBar = history[history.length - 1];
          const lastBarTime = lastBar.time * 1000;
          const now = Date.now();
          
          // If the last bar is within 3 days of targetTime and we are past targetTime, use it
          if (now > targetTime && Math.abs(lastBarTime - targetTime) < (3 * 24 * 60 * 60 * 1000)) {
            outcomeBar = lastBar;
          }
        }

        if (!outcomeBar) continue;

        const entryPrice = Number(sig.priceAtGeneration);
        const exitPrice = outcomeBar.close;
        const changePct = (exitPrice - entryPrice) / entryPrice;

        let isCorrect = false;
        if (sig.direction === "BULLISH" && changePct > 0.015) isCorrect = true;
        else if (sig.direction === "BEARISH" && changePct < -0.015) isCorrect = true;
        else if (sig.direction === "NEUTRAL" && Math.abs(changePct) <= 0.015) isCorrect = true;

        await db.update(marketSignals)
          .set({
            isEvaluated: true,
            outcomePrice7D: exitPrice.toString(),
            accuracy: isCorrect ? "1.00" : "0.00",
          })
          .where(eq(marketSignals.id, sig.id));

      } catch (err) {
        console.error(`[Signal Evaluation] Error for ${sig.ticker}:`, err);
      }
    }
  } catch (error) {
    console.error("[Signal Evaluation] Fatal Error:", error);
  }
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
    const correct = evaluated.filter((s: any) => Number(s.accuracy) === 1).length;
    const accuracy = (correct / total) * 100;

    return {
      total,
      correct,
      accuracy: Number(accuracy.toFixed(1)),
      samples: evaluated.slice(0, 10).map((s: any) => ({
        ticker: s.ticker,
        at: s.generatedAt,
        label: s.signalLabel,
        correct: Number(s.accuracy) === 1,
        entry: Number(s.priceAtGeneration),
        outcome: Number(s.outcomePrice7D),
      }))
    };
  } catch (error) {
    console.error("[Accuracy Scorecard] Error:", error);
    return null;
  }
}
