import { MarketSignal } from "./market-data";
import { StockDetails } from "./stock-details";

export function calculateAlphaScore(signal: MarketSignal, details: StockDetails): { score: number; scanner: string | null } {
  const { tech, sentiment, history } = signal;
  const { valuation, keyStats, price } = details;
  
  let bestScore = 0;
  let bestScanner: string | null = null;

  // 1. Momentum Check
  if (tech.rsi14 > 60 && tech.macd.histogram > 0 && price.current > price.fiftyDayAverage) {
    const momentumScore = Math.min(100, (tech.rsi14 + (tech.macd.histogram * 10)) / 1.5);
    if (momentumScore > bestScore) {
      bestScore = momentumScore;
      bestScanner = 'MOMENTUM';
    }
  }

  // 2. Value Check
  if (valuation.forwardPE !== null && valuation.forwardPE < 18 && valuation.pegRatio !== null && valuation.pegRatio < 1.2 && sentiment.score > 0.1) {
    const valueScore = Math.max(0, 100 - (valuation.forwardPE * 3));
    if (valueScore > bestScore) {
      bestScore = valueScore;
      bestScanner = 'VALUE';
    }
  }

  // 3. Uncorrelated Check
  const fiveDayMomentum = history.length >= 5 ? ((price.current - history[history.length - 5].close) / history[history.length - 5].close) * 100 : 0;
  if (keyStats.beta !== null && keyStats.beta < 0.85 && fiveDayMomentum > 3) {
    const uncorrScore = 70 + (fiveDayMomentum * 2);
    if (uncorrScore > bestScore) {
      bestScore = uncorrScore;
      bestScanner = 'UNCORRELATED';
    }
  }

  return { score: bestScore, scanner: bestScanner };
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
