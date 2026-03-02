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
        });
      }
    }
  } catch (error) {
    console.error("Backtest Archival Error:", error);
  }
}

import { fetchMarketData } from "@/lib/market-data";

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

  let evaluatedCount = 0;

  for (const signal of pending) {
    try {
      // Fetch live 'audit' price
      const market = await fetchMarketData(signal.ticker, 1);
      if (!market) continue;

      const entry = parseFloat(signal.priceAtGeneration as string);
      const exit = market.price;
      
      // Binary Accuracy (1 = Profitable, 0 = Loss)
      // In a more complex institutional setup, this would be alpha-adjusted against SPY
      const isCorrect = exit > entry;
      const profitPct = ((exit - entry) / entry) * 100;

      await db.update(marketSignals)
        .set({
          isEvaluated: true,
          outcomePrice7D: exit.toString(),
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
  
  // Calculate average performance of evaluated picks
  let totalPerformance = 0;
  evaluated.forEach((p: any) => {
    const entry = parseFloat(p.priceAtGeneration);
    const exit = parseFloat(p.outcomePrice7D);
    totalPerformance += ((exit - entry) / entry) * 100;
  });
  
  const avgPerformance = evaluated.length > 0 ? totalPerformance / evaluated.length : 0;

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
