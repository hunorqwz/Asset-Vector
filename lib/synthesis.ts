import { TechnicalIndicators } from "./technical-analysis";
import { SentimentReport } from "./sentiment";
import { MarketRegime } from "./regime";

export interface MarketSynthesis {
  score: number; // 0-100
  signal: "STRONG BUY" | "BUY" | "ACCUMULATE" | "NEUTRAL" | "REDUCE" | "SELL" | "STRONG SELL";
  confidence: "Institutional" | "High" | "Moderate" | "Tactical Only" | "Low/Noise";
  primaryDriver: string;
}

/**
 * Institutional Synthesis Engine (v2.0)
 * Reconciles Technical Telemetry, Narrative Momentum, and Signal Predictability
 */
export function generateSynthesis(
  technical: TechnicalIndicators,
  sentiment: SentimentReport,
  predictabilityUnits: number, // From Hurst Exponent
  regime: MarketRegime,
  snr: number
): MarketSynthesis {
  // 1. Calculate Core Weights based on Predictability
  // If predictability is low (Hurst < 0.45), we discount technicals and favor sentiment or neutral
  const techWeight = predictabilityUnits > 0.45 ? 0.50 : 0.30;
  const sentWeight = predictabilityUnits < 0.45 ? 0.50 : 0.40;

  // Normalize Technical (0-100 already)
  const techScore = technical.confluenceScore;
  
  // Normalize Sentiment (-1 to 1 -> 0 to 100)
  const sentScore = (sentiment.score + 1) * 50;

  // 2. Base Synthesized Score
  let baseScore = (techScore * techWeight) + (sentScore * sentWeight);

  // 3. Precision Adjusters (SNR & Regime)
  // If regime is MEAN_REVERSION, we tighten the bounds (don't buy breakouts)
  // If regime is MOMENTUM, we reward trend alignment
  if (regime === "MOMENTUM") {
    if (techScore > 60 && sentScore > 60) baseScore += 5; // Multi-layer alignment bonus
    if (techScore < 40 && sentScore < 40) baseScore -= 5;
  }
  
  if (regime === "MEAN_REVERSION") {
     // Neutralize towards 50 in mean reversion unless extremely oversold
     if (techScore > 40 && techScore < 60) baseScore = (baseScore + 50) / 2;
  }

  // 4. SNR Penalty
  // High noise (Low SNR) causes a "confidence haircut"
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

  // 5. Signal Logic
  let signal: MarketSynthesis['signal'] = "NEUTRAL";
  if (finalScore >= 80) signal = "STRONG BUY";
  else if (finalScore >= 70) signal = "BUY";
  else if (finalScore >= 60) signal = "ACCUMULATE";
  else if (finalScore <= 20) signal = "STRONG SELL";
  else if (finalScore <= 30) signal = "SELL";
  else if (finalScore <= 40) signal = "REDUCE";

  // 6. Confidence Labeling
  let confidence: MarketSynthesis['confidence'] = "Moderate";
  const combinedReliability = (predictabilityUnits * 0.7) + (Math.min(snr, 100) / 100 * 0.3);
  
  if (combinedReliability > 0.6) confidence = "Institutional";
  else if (combinedReliability > 0.5) confidence = "High";
  else if (combinedReliability > 0.4) confidence = "Moderate";
  else if (combinedReliability > 0.3) confidence = "Tactical Only";
  else confidence = "Low/Noise";

  // 7. Driver Logic
  let primaryDriver = "Balanced Multi-Factor Assessment";
  if (Math.abs(techScore - sentScore) > 30) {
    primaryDriver = techScore > sentScore ? "Technical Outperformance" : "Narrative-Driven Momentum";
  } else if (predictabilityUnits < 0.4) {
    primaryDriver = "High Noise Environment (Low Predictability)";
  }

  return {
    score: finalScore,
    signal,
    confidence,
    primaryDriver
  };
}
