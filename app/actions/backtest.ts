"use server";
import { db } from "@/db";
import { marketSignals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { AlphaPick } from "./discovery";

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

export interface PickRecord {
  ticker: string;
  scanner: string;
  entry: number;
  exit: number | null;
  alpha: number | null;
  betaAtGeneration: number;
  status: 'WIN' | 'LOSS' | 'PENDING';
  date: Date;
}

export interface BacktestReport {
  winRate: number;
  totalPicks: number;
  evaluatedCount: number;
  pendingCount: number;
  avgAlpha: number;           // avg alpha in % per evaluated pick
  bestPick: PickRecord | null;
  worstPick: PickRecord | null;
  equityCurve: { index: number; cumAlpha: number }[];  // cumulative alpha curve
  scannerBreakdown: Record<string, { wins: number; losses: number; avgAlpha: number }>;
  recentPicks: PickRecord[];
}

/**
 * Full Alpha Performance Report — powers the Alpha Performance Dashboard.
 */
export async function getBacktestWinRate(): Promise<BacktestReport | null> {
  const allPicks = await db.query.marketSignals.findMany({
    where: eq(marketSignals.signalLabel, "ALPHA_PICK"),
    orderBy: (t: any, { asc }: any) => [asc(t.generatedAt)], // oldest first for equity curve
    limit: 200
  });

  if (allPicks.length === 0) return null;

  const records: PickRecord[] = allPicks.map((p: any) => ({
    ticker: p.ticker,
    scanner: p.direction || 'UNKNOWN',
    entry: parseFloat(p.priceAtGeneration) || 0,
    exit: p.isEvaluated ? (parseFloat(p.outcomePrice7D) || null) : null,
    alpha: p.isEvaluated ? (parseFloat(p.alphaPerformance) || null) : null,
    betaAtGeneration: parseFloat(p.betaAtGeneration || '1.0'),
    status: !p.isEvaluated ? 'PENDING' : (parseFloat(p.accuracy) >= 1.0 ? 'WIN' : 'LOSS'),
    date: p.generatedAt,
  }));

  const evaluated = records.filter(r => r.status !== 'PENDING');
  const wins = evaluated.filter(r => r.status === 'WIN');
  const winRate = evaluated.length > 0 ? (wins.length / evaluated.length) * 100 : 0;

  const alphaValues = evaluated.map(r => r.alpha ?? 0);
  const totalAlpha = alphaValues.reduce((a, b) => a + b, 0);
  const avgAlpha = evaluated.length > 0 ? (totalAlpha / evaluated.length) * 100 : 0;

  // Equity curve: cumulative alpha over time (evaluated picks only)
  let cumAlpha = 0;
  const equityCurve = evaluated.map((r, i) => {
    cumAlpha += (r.alpha ?? 0) * 100;
    return { index: i, cumAlpha: Number(cumAlpha.toFixed(4)) };
  });

  // Best and worst
  const sortedByAlpha = [...evaluated].sort((a, b) => (b.alpha ?? 0) - (a.alpha ?? 0));
  const bestPick = sortedByAlpha[0] ?? null;
  const worstPick = sortedByAlpha[sortedByAlpha.length - 1] ?? null;

  // Per-scanner breakdown
  const scannerBreakdown: BacktestReport['scannerBreakdown'] = {};
  for (const r of evaluated) {
    const s = r.scanner.toUpperCase();
    if (!scannerBreakdown[s]) scannerBreakdown[s] = { wins: 0, losses: 0, avgAlpha: 0 };
    if (r.status === 'WIN') scannerBreakdown[s].wins++;
    else scannerBreakdown[s].losses++;
    scannerBreakdown[s].avgAlpha += (r.alpha ?? 0) * 100;
  }
  for (const s of Object.keys(scannerBreakdown)) {
    const total = scannerBreakdown[s].wins + scannerBreakdown[s].losses;
    if (total > 0) scannerBreakdown[s].avgAlpha = Number((scannerBreakdown[s].avgAlpha / total).toFixed(3));
  }

  return {
    winRate: Number(winRate.toFixed(1)),
    totalPicks: allPicks.length,
    evaluatedCount: evaluated.length,
    pendingCount: records.filter(r => r.status === 'PENDING').length,
    avgAlpha: Number(avgAlpha.toFixed(3)),
    bestPick,
    worstPick,
    equityCurve,
    scannerBreakdown,
    recentPicks: [...records].reverse().slice(0, 20), // newest first for the table
  };
}
