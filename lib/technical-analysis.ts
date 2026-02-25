import { RSI, MACD, BollingerBands } from 'technicalindicators';
import { OHLCV } from './market-data';

export interface PivotLevel {
  price: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number; // 1-5
  touches: number;
}

export interface OrderBlock {
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  date: string;
}

export interface TechnicalIndicators {
  isValid: boolean;
  confluenceScore: number;
  signal: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  rsi14: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
  };
  predictivePivots: {
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  } | null;
  fibonacci: {
    level0: number;
    level236: number;
    level382: number;
    level500: number;
    level618: number;
    level786: number;
    level100: number;
  } | null;
  orderBlocks: OrderBlock[];
}

/**
 * Generates an institutional-grade confluence score based on RSI, MACD, and Bollinger %B.
 * This is used for the Technical Confluence Panel.
 */
export function generateTechnicalConfluence(history: OHLCV[]): TechnicalIndicators {
  if (history.length < 30) {
    return {
      isValid: false,
      confluenceScore: 50,
      signal: 'NEUTRAL',
      rsi14: 50,
      macd: { line: 0, signal: 0, histogram: 0 },
      bollingerBands: { upper: 0, middle: 0, lower: 0, percentB: 0.5 },
      predictivePivots: null,
      fibonacci: null,
      orderBlocks: []
    };
  }

  const prices = history.map(h => h.close);
  const lastPrice = prices[prices.length - 1];

  // 1. Calculate Technical Indicators
  const rsiValues = RSI.calculate({ period: 14, values: prices });
  const rsi14 = rsiValues[rsiValues.length - 1] || 50;

  const macdValues = MACD.calculate({
    values: prices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const lastMacd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };

  const bbValues = BollingerBands.calculate({ period: 20, stdDev: 2, values: prices });
  const lastBB = bbValues[bbValues.length - 1] || { upper: 0, middle: 0, lower: 0 };
  const percentB = lastBB.upper !== lastBB.lower ? (lastPrice - lastBB.lower) / (lastBB.upper - lastBB.lower) : 0.5;

  // 2. Adaptive Scoring (Institutional Logic)
  // We distinguish between "Momentum" and "Mean Reversion" phases.
  let score = 50;
  const isMomentumPhase = (lastMacd.MACD || 0) > 0 && (lastMacd.histogram || 0) > 0;
  
  if (isMomentumPhase) {
    // In MOMENTUM: High RSI is a sign of strength, NOT a sell signal.
    if (rsi14 >= 75) score += 20;
    else if (rsi14 >= 60) score += 10;
    
    // Bollinger %B: Riding the upper band is bullish
    if (percentB > 0.8) score += 10;
  } else {
    // In MEAN REVERSION: We look for overextension.
    if (rsi14 >= 70) score -= 20;
    else if (rsi14 <= 30) score += 20;
    
    // Bollinger %B: Rejection at bands
    if (percentB > 1.0) score -= 15;
    else if (percentB < 0.0) score += 15;
  }

  // Trend Momentum (MACD) - Always adds/subs points
  if ((lastMacd.histogram || 0) > 0) score += 10;
  else if ((lastMacd.histogram || 0) < 0) score -= 10;

  // Signal Mapping
  let signal: TechnicalIndicators['signal'] = 'NEUTRAL';
  if (score >= 80) signal = 'STRONG BUY';
  else if (score >= 60) signal = 'BUY';
  else if (score <= 20) signal = 'STRONG SELL';
  else if (score <= 40) signal = 'SELL';

  // Predictive Algorithms (Fibonacci & Pivots)
  let predictivePivots = null;
  let fibonacci = null;
  const lastBar = history[history.length - 1];
  if (lastBar) {
    const pHigh = lastBar.high;
    const pLow = lastBar.low;
    const pClose = lastBar.close;
    const pivot = (pHigh + pLow + pClose) / 3;
    predictivePivots = {
      pivot,
      r1: 2 * pivot - pLow,
      r2: pivot + (pHigh - pLow),
      r3: pivot + 2 * (pHigh - pLow),
      s1: 2 * pivot - pHigh,
      s2: pivot - (pHigh - pLow),
      s3: pivot - 2 * (pHigh - pLow),
    };

    let maxH = -Infinity;
    let minL = Infinity;
    history.forEach(b => {
      if (b.high > maxH) maxH = b.high;
      if (b.low < minL) minL = b.low;
    });
    const diff = maxH - minL;
    fibonacci = {
      level0: maxH,
      level236: maxH - 0.236 * diff,
      level382: maxH - 0.382 * diff,
      level500: maxH - 0.5 * diff,
      level618: maxH - 0.618 * diff,
      level786: maxH - 0.786 * diff,
      level100: minL,
    };
  }

  // Institutional Order Blocks (Fair Value Gaps - unresolved)
  const orderBlocks: OrderBlock[] = [];
  const lookback = Math.min(history.length, 90);
  const recentHistory = history.slice(-lookback);
  
  for (let i = 0; i < recentHistory.length - 2; i++) {
    const c1 = recentHistory[i];
    const c2 = recentHistory[i + 1];
    const c3 = recentHistory[i + 2];
    
    // Bullish FVG (Demand)
    if (c3.low > c1.high && c2.close > c2.open) {
      const top = c3.low;
      const bottom = c1.high;
      // Check if mitigated by any future candle
      let mitigated = false;
      for (let j = i + 3; j < recentHistory.length; j++) {
        if (recentHistory[j].low <= top) { mitigated = true; break; }
      }
      if (!mitigated) {
        orderBlocks.push({ type: 'BULLISH', top, bottom, date: new Date(c2.time * 1000).toISOString().split('T')[0] });
      }
    }
    
    // Bearish FVG (Supply)
    if (c3.high < c1.low && c2.close < c2.open) {
      const top = c1.low;
      const bottom = c3.high;
      // Check if mitigated by any future candle
      let mitigated = false;
      for (let j = i + 3; j < recentHistory.length; j++) {
        if (recentHistory[j].high >= bottom) { mitigated = true; break; }
      }
      if (!mitigated) {
        orderBlocks.push({ type: 'BEARISH', top, bottom, date: new Date(c2.time * 1000).toISOString().split('T')[0] });
      }
    }
  }
  
  // Sort from most recent
  orderBlocks.reverse();

  return {
    isValid: true,
    confluenceScore: Math.max(0, Math.min(100, score)),
    signal,
    rsi14,
    macd: {
      line: lastMacd.MACD || 0,
      signal: lastMacd.signal || 0,
      histogram: lastMacd.histogram || 0
    },
    bollingerBands: {
      upper: lastBB.upper,
      middle: lastBB.middle,
      lower: lastBB.lower,
      percentB
    },
    predictivePivots,
    fibonacci,
    orderBlocks: orderBlocks.slice(0, 3) // Return max 3 unmitigated blocks
  };
}

/**
 * Automates the tasks of a technical analyst by detecting 
 * psychological and structural support/resistance levels.
 * Sensitivity set to 1.5% for surgical precision.
 */
export function detectSupportResistance(data: OHLCV[], sensitivity: number = 0.015): PivotLevel[] {
  if (data.length < 20) return [];

  const pivots: { price: number; type: 'MIN' | 'MAX' }[] = [];
  
  // 1. Identify raw fractals/pivots
  for (let i = 2; i < data.length - 2; i++) {
    const prev2 = data[i - 2].high;
    const prev1 = data[i - 1].high;
    const curr = data[i].high;
    const next1 = data[i + 1].high;
    const next2 = data[i + 2].high;

    // Peak
    if (curr > prev1 && curr > prev2 && curr > next1 && curr > next2) {
      pivots.push({ price: curr, type: 'MAX' });
    }

    // Trough
    const lowPrev2 = data[i - 2].low;
    const lowPrev1 = data[i - 1].low;
    const lowCurr = data[i].low;
    const lowNext1 = data[i + 1].low;
    const lowNext2 = data[i + 2].low;
    if (lowCurr < lowPrev1 && lowCurr < lowPrev2 && lowCurr < lowNext1 && lowCurr < lowNext2) {
      pivots.push({ price: lowCurr, type: 'MIN' });
    }
  }

  // 2. Cluster pivots that are close to each other
  const clusters: { price: number; touches: number; types: string[] }[] = [];
  
  pivots.forEach(p => {
    const existing = clusters.find(c => Math.abs(c.price - p.price) / p.price < sensitivity);
    if (existing) {
      existing.touches++;
      existing.price = (existing.price + p.price) / 2; // Average the level
      existing.types.push(p.type);
    } else {
      clusters.push({ price: p.price, touches: 1, types: [p.type] });
    }
  });

  // 3. Convert clusters to Support/Resistance
  const currentPrice = data[data.length - 1].close;
  
  return clusters
    .filter(c => c.touches >= 2) // Filter noise
    .map(c => {
      const isSupport = c.price < currentPrice;
      return {
        price: Number(c.price.toFixed(2)),
        type: (isSupport ? 'SUPPORT' : 'RESISTANCE') as 'SUPPORT' | 'RESISTANCE',
        touches: c.touches,
        strength: Math.min(5, c.touches)
      };
    })
    .sort((a, b) => b.touches - a.touches)
    .slice(0, 4); // Only show top 4 strongest levels to prevent clutter
}
