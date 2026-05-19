import { MarketSignal } from "./market-data";
import { StockDetails } from "./stock-details";

export type AlphaScanner = 'MOMENTUM' | 'VALUE' | 'UNCORRELATED' | 'SURGICAL_ALPHA' | 'REGIME_FIT' | 'VOL_SQUEEZE';

/**
 * Institutional Alpha Engine
 * Identifies high-probability setups using multi-factor telemetry.
 */
export function calculateAlphaScore(signal: MarketSignal, details: StockDetails): { score: number; scanner: AlphaScanner | null } {
  const { tech, sentiment, history, synthesis, snr, predictability, regime } = signal;
  const { valuation, keyStats, price } = details;
  
  let bestScore = 0;
  let bestScanner: AlphaScanner | null = null;

  // Dynamic Scoring System: We calculate all scores and take the highest one, 
  // ensuring we always identify the best setup without rigid binary cutoffs.
  
  // 1. SURGICAL ALPHA
  const alphaVal = signal.benchmark?.alpha ?? 0;
  const surgicalScore = (synthesis.score + Math.max(0, alphaVal * 2));
  if (surgicalScore > bestScore && synthesis.score > 50) {
    bestScore = surgicalScore;
    bestScanner = 'SURGICAL_ALPHA';
  }

  // 2. MOMENTUM
  const momentumScore = (tech.rsi14 + (tech.macd.histogram > 0 ? 10 : 0) + (predictability * 100)) / 1.5;
  if (momentumScore > bestScore && tech.rsi14 > 50) {
    bestScore = momentumScore;
    bestScanner = 'MOMENTUM';
  }

  // 3. VALUE
  const fpe = valuation.forwardPE;
  const qscore = signal.quality?.score || 50; // Fallback if data is missing
  if (fpe !== null && fpe !== undefined && fpe > 0) {
    const valueScore = ( qscore + (Math.max(0, 30 - fpe) * 2) ) / 1.5;
    if (valueScore > bestScore) {
      bestScore = valueScore;
      bestScanner = 'VALUE';
    }
  }

  // 4. REGIME FIT
  const regimeScore = regime === 'MOMENTUM' ? (tech.adx + tech.confluenceScore) / 1.8 : 50 + (50 - tech.rsi14);
  if (regimeScore > bestScore) {
     bestScore = regimeScore;
     bestScanner = 'REGIME_FIT';
  }

  // 5. VOL SQUEEZE
  const squeezeScore = snr < 5 ? 70 + (predictability * 100) : 0;
  if (squeezeScore > bestScore) {
    bestScore = squeezeScore;
    bestScanner = 'VOL_SQUEEZE';
  }

  // 6. UNCORRELATED
  const fiveDayMomentum = history.length >= 5 ? ((price.current - history[history.length - 5].close) / history[history.length - 5].close) * 100 : 0;
  if (keyStats.beta !== null && keyStats.beta < 0.9) {
    const uncorrScore = 60 + (fiveDayMomentum * 3) + ((1 - keyStats.beta) * 20);
    if (uncorrScore > bestScore) {
      bestScore = uncorrScore;
      bestScanner = 'UNCORRELATED';
    }
  }

  return { score: Math.round(Math.min(100, bestScore)), scanner: bestScanner || 'REGIME_FIT' };
}

export function calculateCatalystRisk(details: StockDetails): { expectedMovePct: number; momentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL' } {
  const { earningsHistory, optionsFlow } = details;
  
  if (!earningsHistory || earningsHistory.length === 0) {
    return { expectedMovePct: 0, momentum: 'NEUTRAL' };
  }

  const validSurprises = earningsHistory.filter(h => h.actual !== null && h.estimate !== null);
  const recent = validSurprises.slice(-4);
  const beats = recent.filter(r => (r.surprise || 0) > 0).length;
  const momentum = beats >= 3 ? 'BULLISH' : beats <= 1 ? 'BEARISH' : 'NEUTRAL';

  const iv = optionsFlow?.impliedVolatility || 0.30;
  const expectedMovePct = (iv / Math.sqrt(252)) * 100 * 2.5;

  return { expectedMovePct, momentum };
}
