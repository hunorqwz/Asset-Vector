import { StockDetails } from "./stock-details";

export interface QualityScore {
  score: number; // 0-100
  level: "INSTITUTIONAL" | "HIGH" | "AVERAGE" | "LOW" | "DISTRESSED";
  factors: {
    profitability: number;
    solvency: number;
    growth: number;
  };
}

/**
 * Institutional Quality-at-a-Reasonable-Price (QARP) Engine
 * Scores an asset based on fundamental stability and capital efficiency.
 */
export function calculateQualityScore(details: Partial<StockDetails>): QualityScore {
  const profit = details.profitability;
  const health = details.financialHealth;
  const valuation = details.valuation;

  let profitabilityScore = 50;
  let solvencyScore = 50;
  let growthScore = 50;

  // 1. Profitability (ROIC / Margins)
  if (profit) {
    // ROIC/ROE is the gold standard for quality
    const roe = profit.returnOnEquity || 0;
    if (roe > 0.20) profitabilityScore += 30; // 20% ROE is elite
    else if (roe > 0.10) profitabilityScore += 15;
    else if (roe < 0) profitabilityScore -= 20;

    // Operating Margins
    const margins = profit.operatingMargins || 0;
    if (margins > 0.25) profitabilityScore += 20;
    else if (margins > 0.10) profitabilityScore += 10;
  }

  // 2. Solvency (Debt to Equity / Current Ratio)
  if (health) {
    const de = health.debtToEquity || 0;
    if (de > 0 && de < 40) solvencyScore += 30; // Very clean balance sheet
    else if (de > 120) solvencyScore -= 30; // Significant leverage

    const currentRatio = health.currentRatio || 1;
    if (currentRatio > 2.0) solvencyScore += 20;
    else if (currentRatio < 0.9) solvencyScore -= 20;
  }

  // 3. Growth Stability
  if (profit) {
    const revGrowth = profit.revenueGrowth || 0;
    if (revGrowth > 0.15) growthScore += 20;
    else if (revGrowth > 0.05) growthScore += 10;
    else if (revGrowth < -0.05) growthScore -= 10;
  }

  // Weighted Average — skewed towards elite capital efficiency
  const rawScore = (profitabilityScore * 0.55) + (solvencyScore * 0.25) + (growthScore * 0.20);
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let level: QualityScore['level'] = "AVERAGE";
  if (finalScore >= 85) level = "INSTITUTIONAL";
  else if (finalScore >= 70) level = "HIGH";
  else if (finalScore <= 30) level = "DISTRESSED";
  else if (finalScore <= 45) level = "LOW";

  return {
    score: finalScore,
    level,
    factors: {
      profitability: Math.min(100, profitabilityScore),
      solvency: Math.min(100, solvencyScore),
      growth: Math.min(100, growthScore)
    }
  };
}
