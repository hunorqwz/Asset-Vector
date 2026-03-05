import { TechnicalIndicators } from "./technical-analysis";
import { SentimentReport } from "./sentiment";
import { MarketRegime } from "./regime";
import { RollingCorrelation } from "./market-data";
import { QualityScore } from "./quality-engine";

export interface MarketSynthesis {
  score: number; // 0-100
  signal: "STRONG BUY" | "BUY" | "ACCUMULATE" | "NEUTRAL" | "REDUCE" | "SELL" | "STRONG SELL";
  confidence: "Institutional" | "High" | "Moderate" | "Tactical Only" | "Low/Noise";
  primaryDriver: string;
  sentimentPriceDivergence?: "BULLISH_DIVERGENCE" | "BEARISH_DIVERGENCE" | "NONE";
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
  snr: number,
  benchmark?: RollingCorrelation,
  quality?: QualityScore
): MarketSynthesis {
  // 1. Calculate Core Weights based on Predictability
  // If predictability is low (Hurst < 0.45), we discount technicals and favor sentiment or neutral
  let techWeight = predictabilityUnits > 0.45 ? 0.40 : 0.20;
  let sentWeight = predictabilityUnits < 0.45 ? 0.40 : 0.30;
  let qualWeight = quality ? 0.30 : 0;
  
  // NARRATIVE POISONING FIX: If sentiment data is insufficient, zero its weight 
  // and redistribute to Technicals and Quality.
  if (sentiment.isInsufficientData) {
      const weightToMove = sentWeight;
      sentWeight = 0;
      if (quality) {
          techWeight += weightToMove * 0.5;
          qualWeight += weightToMove * 0.5;
      } else {
          techWeight += weightToMove;
      }
  }

  // Re-normalize weights
  const total = techWeight + sentWeight + qualWeight;
  techWeight /= total;
  sentWeight /= total;
  qualWeight /= total;

  // Normalize Technical (0-100 already)
  const techScore = technical.confluenceScore;
  
  // Normalize Sentiment (-1 to 1 -> 0 to 100)
  // If data is insufficient, this score won't impact final sum due to 0 weight
  const sentScore = (sentiment.score + 1) * 50;

  // Normalize Quality (0-100)
  const qualScore = quality?.score || 50;

  // 2. Base Synthesized Score
  let baseScore = (techScore * techWeight) + (sentScore * sentWeight) + (qualScore * qualWeight);

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

  // 4. Alpha/Beta Refinement
  if (benchmark) {
    if (benchmark.alpha > 10) baseScore += 5; // Institutional Alpha Incentive
    if (benchmark.alpha < -5) baseScore -= 5; // Performance Laggard Penalty
  }

  // 5. SNR Penalty
  // High noise (Low SNR) causes a "confidence haircut"
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

  // 6. Signal Logic
  let signal: MarketSynthesis['signal'] = "NEUTRAL";
  if (finalScore >= 80) signal = "STRONG BUY";
  else if (finalScore >= 70) signal = "BUY";
  else if (finalScore >= 60) signal = "ACCUMULATE";
  else if (finalScore <= 20) signal = "STRONG SELL";
  else if (finalScore <= 30) signal = "SELL";
  else if (finalScore <= 40) signal = "REDUCE";

  // 7. Confidence Labeling
  let confidence: MarketSynthesis['confidence'] = "Moderate";
  const combinedReliability = (predictabilityUnits * 0.7) + (Math.min(snr, 100) / 100 * 0.3);
  
  if (combinedReliability > 0.6) confidence = "Institutional";
  else if (combinedReliability > 0.5) confidence = "High";
  else if (combinedReliability > 0.4) confidence = "Moderate";
  else if (combinedReliability > 0.3) confidence = "Tactical Only";
  else confidence = "Low/Noise";

  // NARRATIVE CONFIDENCE HAIRCUT
  if (sentiment.isInsufficientData && confidence === "Institutional") confidence = "High";
  if (sentiment.isInsufficientData && confidence === "High") confidence = "Moderate";

  // 8. Driver Logic
  let primaryDriver = sentiment.isInsufficientData ? "Technicals (Narrative Lag)" : "Balanced Multi-Factor Assessment";
  
  if (quality && quality.score > 80) {
      primaryDriver = "Institutional Quality & Structural Strength";
  } else if (benchmark && Math.abs(benchmark.alpha) > 15) {
      primaryDriver = benchmark.alpha > 0 ? "Exceptional Idiosyncratic Alpha" : "Severe Market Underperformance";
  } else if (benchmark && benchmark.correlation > 0.9) {
      primaryDriver = "Broad Market Sensitivity (High Beta)";
  } else if (Math.abs(techScore - sentScore) > 30) {
      primaryDriver = techScore > sentScore ? "Technical Outperformance" : "Narrative-Driven Momentum";
  } else if (predictabilityUnits < 0.4) {
      primaryDriver = "High Noise Environment (Low Predictability)";
  } else if (quality && quality.score < 40) {
      primaryDriver = "Fundamental Deterioration (Low Quality)";
  }

  return {
    score: finalScore,
    signal,
    confidence,
    primaryDriver
  };
}
