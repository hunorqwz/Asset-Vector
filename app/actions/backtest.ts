"use server";
import { db } from "@/db";
import { marketSignals } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { AlphaPick } from "./discovery";
import { revalidatePath } from "next/cache";

/**
 * Persists high-conviction Alpha Picks to the database for future evaluation.
 * This builds the 'Track Record' of the AI system.
 */
export async function recordAlphaPicks(picks: AlphaPick[]) {
  const highConviction = picks.filter(p => p.score >= 75);
  console.log(`[BACKTEST] Scanned ${picks.length} picks. High Conviction: ${highConviction.length}`);
  if (highConviction.length === 0) return;

  try {
    const benchmarkPrice = await db.query.marketSignals.findFirst({
        where: and(eq(marketSignals.ticker, "SPY"), sql`generated_at > now() - interval '5 minutes'`)
    }).then((s: any) => s ? parseFloat(s.priceAtGeneration as string) : null) || await fetchLiveQuote("SPY");

    for (const pick of highConviction) {
      const existing = await db.query.marketSignals.findFirst({
        where: and(
          eq(marketSignals.ticker, pick.ticker),
          sql`generated_at > now() - interval '24 hours'`
        )
      });

      if (!existing) {
        console.log(`[BACKTEST] Recording high-conviction signal for ${pick.ticker} @ ${pick.price}`);
        await db.insert(marketSignals).values({
          ticker: pick.ticker,
          priceAtGeneration: pick.price.toString(),
          score: pick.score.toString(),
          signalLabel: "ALPHA_PICK",
          direction: pick.scanner.substring(0, 10), // Safeguard against DB length
          confidence: (pick.score / 100).toString(),
          benchmarkPriceAtGeneration: benchmarkPrice.toString(),
          betaAtGeneration: pick.beta?.toString() || "1.0",
        });
      }
    }
  } catch (error) {
    console.error("Backtest Archival Error:", error);
  }
}

import { fetchMarketData, fetchLiveQuote } from "@/lib/market-data";

export async function evaluateAlphaPicks() {
  const pending = await db.query.marketSignals.findMany({
    where: and(
      eq(marketSignals.signalLabel, "ALPHA_PICK"),
      eq(marketSignals.isEvaluated, false),
      sql`generated_at < now() - interval '15 minutes'` 
    ),
    limit: 10
  });

  if (pending.length === 0) return { evaluated: 0 };
  console.log(`[BACKTEST] Auditing ${pending.length} pending picks...`);

  // Optimized: Fetch current benchmark price once for the entire batch
  const benchExit = await fetchLiveQuote("SPY");

  let evaluatedCount = 0;

  for (const signal of pending) {
    try {
      // Fetch live 'audit' price using lightweight endpoint
      const entry = parseFloat(signal.priceAtGeneration as string);
      const exit = await fetchLiveQuote(signal.ticker);
      
      // Strict Guards: Prevent mathematical outliers (NaN/Infinity)
      if (!exit || isNaN(exit) || !entry || isNaN(entry) || entry === 0) {
        console.warn(`[BACKTEST] Skipping invalid data for ${signal.ticker}`);
        continue;
      }

      const assetRet = (exit - entry) / entry;

      // Handle Benchmark
      const benchEntry = parseFloat(signal.benchmarkPriceAtGeneration as string || "0");
      const benchRet = (benchEntry > 0 && benchExit > 0) ? (benchExit - benchEntry) / benchEntry : 0;
      const beta = parseFloat(signal.betaAtGeneration as string || "1.0");

      // True Alpha: Excess return over the expected return based on risk (beta)
      const alpha = assetRet - (beta * benchRet);
      
      // Beta-Neutral Accuracy: Outperform the risk-adjusted benchmark
      const isCorrect = !isNaN(alpha) && alpha > 0;

      await db.update(marketSignals)
        .set({
          isEvaluated: true,
          outcomePrice7D: exit.toString(),
          benchmarkOutcomePrice: benchExit.toString(),
          alphaPerformance: alpha.toString(),
          accuracy: (isCorrect ? 1.0 : 0.0).toString()
        })
        .where(eq(marketSignals.id, signal.id));
      
      evaluatedCount++;
    } catch (e) {
      console.error(`Evaluation failure for ${signal.ticker}:`, e);
    }
  }

  return { evaluated: evaluatedCount };
}

/**
 * Calculates the running 'Alpha Performance' of the recorded picks.
 */
export async function getBacktestWinRate() {
  const allPicks = await db.query.marketSignals.findMany({
    where: eq(marketSignals.signalLabel, "ALPHA_PICK"),
    orderBy: (t: any, { desc }: any) => [desc(t.generatedAt)],
    limit: 100
  });

  if (allPicks.length === 0) return null;

  const evaluated = allPicks.filter((p: any) => p.isEvaluated);
  const wins = evaluated.filter((p: any) => parseFloat(p.accuracy) >= 1.0).length;
  
  const winRate = evaluated.length > 0 ? (wins / evaluated.length) * 100 : 0;
  
  // Calculate average alpha performance of evaluated picks
  let totalAlpha = 0;
  evaluated.forEach((p: any) => {
    totalAlpha += parseFloat(p.alphaPerformance || "0");
  });
  
  const avgPerformance = evaluated.length > 0 ? (totalAlpha / evaluated.length) * 100 : 0;

  return {
    winRate,
    totalPicks: allPicks.length,
    evaluatedCount: evaluated.length,
    avgPerformance,
    latestPicks: allPicks.slice(0, 5).map((p: any) => ({
      ticker: p.ticker,
      entry: parseFloat(p.priceAtGeneration),
      current: p.isEvaluated ? parseFloat(p.outcomePrice7D) : null,
      status: p.isEvaluated ? (parseFloat(p.accuracy) >= 1.0 ? 'WIN' : 'LOSS') : 'PENDING',
      date: p.generatedAt
    }))
  };
}
