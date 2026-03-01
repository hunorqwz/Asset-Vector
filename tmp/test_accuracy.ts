"use server";
import { db } from "@/db";
import { marketSignals } from "@/db/schema";
import { evaluateOldSignals, getAccuracyScorecard } from "@/app/actions/signals";

export async function runTimeMachineTest() {
  try {
    const EIGHT_DAYS_AGO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    
    // Insert a signal that should definitely be "Correct"
    // e.g. NVDA BULLISH 8 days ago at $100 (it's much higher now)
    await db.insert(marketSignals).values({
      ticker: "NVDA",
      priceAtGeneration: "100.00",
      score: "85",
      signalLabel: "STRONG BUY",
      direction: "BULLISH",
      confidence: "0.85",
      snr: "12.5",
      regime: "TRENDING",
      isEvaluated: false,
      generatedAt: EIGHT_DAYS_AGO,
    });

    console.log("[Test] Inserted mock signal from 8 days ago.");

    // Trigger evaluation
    await evaluateOldSignals();
    
    // Get scorecard
    const scorecard = await getAccuracyScorecard("NVDA");
    console.log("[Test] Scorecard for NVDA:", scorecard);
    
    return scorecard;
  } catch (error) {
    console.error("[Test] Error:", error);
    return null;
  }
}
