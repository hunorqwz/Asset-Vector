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

  // 1. SURGICAL ALPHA: High Signal + High Confidence + High Alpha
  if (synthesis.score > 75 && synthesis.confidence === 'Institutional' && (signal.benchmark?.alpha ?? 0) > 5) {
    const surgicalScore = (synthesis.score + (signal.benchmark?.alpha ?? 0)) / 1.1;
    if (surgicalScore > bestScore) {
      bestScore = surgicalScore;
      bestScanner = 'SURGICAL_ALPHA';
    }
  }

  // 2. MOMENTUM: Strong trend + High Predictability (Hurst)
  if (tech.rsi14 > 60 && tech.macd.histogram > 0 && price.current > price.fiftyDayAverage && predictability > 0.5) {
    const momentumScore = Math.min(100, (tech.rsi14 + (tech.macd.histogram * 10)) / 1.5);
    if (momentumScore > bestScore) {
      bestScore = momentumScore;
      bestScanner = 'MOMENTUM';
    }
  }

  // 3. VALUE: Low PE + Institutional Quality + Bullish Sentiment
  const fpe = valuation.forwardPE;
  const qscore = signal.quality?.score || 0;
  if (fpe !== null && fpe !== undefined && fpe < 18 && qscore > 70 && sentiment.score > 0.1) {
    const valueScore = ( qscore + (50 - (fpe / 2)) ) / 1.5;
    if (valueScore > bestScore) {
      bestScore = valueScore;
      bestScanner = 'VALUE';
    }
  }

  // 4. REGIME FIT: Perfect alignment with current market structure
  if (regime === 'MOMENTUM' && tech.adx > 25 && tech.confluenceScore > 70) {
    const regimeScore = (tech.adx + tech.confluenceScore) / 1.8;
    if (regimeScore > bestScore) {
       bestScore = regimeScore;
       bestScanner = 'REGIME_FIT';
    }
  } else if (regime === 'MEAN_REVERSION' && tech.rsi14 < 35 && synthesis.score > 45) {
    const regimeScore = 80 + (35 - tech.rsi14);
    if (regimeScore > bestScore) {
        bestScore = regimeScore;
        bestScanner = 'REGIME_FIT';
    }
  }

  // 5. VOL SQUEEZE: Calm before the storm (Low SNR but High Predictability)
  if (snr < 3 && predictability > 0.6) {
    const squeezeScore = 85; 
    if (squeezeScore > bestScore) {
      bestScore = squeezeScore;
      bestScanner = 'VOL_SQUEEZE';
    }
  }

  // 6. UNCORRELATED: Low Beta + Performance Outlier
  const fiveDayMomentum = history.length >= 5 ? ((price.current - history[history.length - 5].close) / history[history.length - 5].close) * 100 : 0;
  if (keyStats.beta !== null && keyStats.beta < 0.75 && fiveDayMomentum > 4) {
    const uncorrScore = 75 + (fiveDayMomentum * 2);
    if (uncorrScore > bestScore) {
      bestScore = uncorrScore;
      bestScanner = 'UNCORRELATED';
    }
  }

  return { score: Math.round(bestScore), scanner: bestScanner };
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
