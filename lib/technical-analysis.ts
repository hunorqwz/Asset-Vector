import { RSI, MACD, BollingerBands, SMA, ATR, ADX } from 'technicalindicators';
import { OHLCV } from './market-data';

export interface PivotLevel {
  price: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number; // 1-5
  touches: number;
}

export interface VolumeNode {
  price: number;
  volume: number;
  type: 'HVN' | 'LVN'; /* High/Low Volume Node */
  strength: number;
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
  volatilityCompression: {
    isSqueezing: boolean;
    compressionScore: number; // 0-100 scale
  };
  adx: number;
}

/**
 * Generates an institutional-grade confluence score.
 * Upgraded to be Adaptive and Regime-Aware.
 * 
 * @param history Raw OHLCV data
 * @param smoothPrice The current Kalman-smoothed price (v2.0)
 * @param predictability The Hurst-based predictability score (Phase 1)
 */
export function generateTechnicalConfluence(
  history: OHLCV[], 
  smoothPrice?: number,
  predictability: number = 0.5
): TechnicalIndicators {
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
      orderBlocks: [],
      volatilityCompression: { isSqueezing: false, compressionScore: 0 },
      adx: 20
    };
  }

  const prices = history.map(h => h.close);
  const lastPrice = prices[prices.length - 1];

  // 1. Calculate Core Indicators
  const rsiValues = RSI.calculate({ period: 14, values: prices });
  const rsi14 = rsiValues[rsiValues.length - 1] || 50;

  const macdValues = MACD.calculate({
    values: prices,
    fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
    SimpleMAOscillator: false, SimpleMASignal: false
  });
  const lastMacd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };

  const bbValues = BollingerBands.calculate({ period: 20, stdDev: 2, values: prices });
  const lastBB = bbValues[bbValues.length - 1] || { upper: 0, middle: 0, lower: 0 };
  const percentB = lastBB.upper !== lastBB.lower ? (lastPrice - lastBB.lower) / (lastBB.upper - lastBB.lower) : 0.5;

  // 1.5. Keltner Channels (for Squeeze Detection)
  const atrValues = ATR.calculate({
    high: history.map(h => h.high),
    low: history.map(h => h.low),
    close: history.map(h => h.close),
    period: 14
  });
  const adxValues = ADX.calculate({
    high: history.map(h => h.high),
    low: history.map(h => h.low),
    close: history.map(h => h.close),
    period: 14
  });
  const adx = adxValues[adxValues.length - 1]?.adx || 20;

  const sma20 = SMA.calculate({ period: 20, values: prices });
  
  const lastSMA = sma20[sma20.length - 1];
  const lastATR = atrValues[atrValues.length - 1];
  
  // TTM Squeeze: Bollinger Bands (20, 2) vs Keltner Channels (20, 1.5)
  // If BB is inside KC, it's a Squeeze
  const kcUpper = lastSMA + (1.5 * lastATR);
  const kcLower = lastSMA - (1.5 * lastATR);
  
  const isSqueezing = lastBB.upper < kcUpper && lastBB.lower > kcLower;
  
  // Compression Score: 0 (wide) to 100 (extreme squeeze)
  // Measured by ratio of BB width to KC width
  const bbWidth = lastBB.upper - lastBB.lower;
  const kcWidth = kcUpper - kcLower;
  const compressionScore = kcWidth > 0.00000001 ? Math.max(0, Math.min(100, (1 - (bbWidth / kcWidth)) * 200)) : 0;

  // 2. High-Precision Confluence Logic
  let score = 50;

  // A. KALMAN MOMENTUM (Highest Weight)
  if (smoothPrice) {
    const kalmanDiff = (lastPrice - smoothPrice) / smoothPrice;
    // If price is above Kalman and moving away, momentum is strong
    if (kalmanDiff > 0.005) score += 15;
    else if (kalmanDiff < -0.005) score -= 15;
  }

  // B. MACD ACCELERATION
  if ((lastMacd.histogram || 0) > 0) {
    score += 10;
    // Check for acceleration (growing histogram)
    const prevMacd = macdValues[macdValues.length - 2]?.histogram || 0;
    if ((lastMacd.histogram || 0) > prevMacd) score += 5;
  } else if ((lastMacd.histogram || 0) < 0) {
    score -= 10;
    const prevMacd = macdValues[macdValues.length - 2]?.histogram || 0;
    if ((lastMacd.histogram || 0) < prevMacd) score -= 5;
  }

  // C. ADAPTIVE RSI (Regime-Aware)
  // In highly predictable trends (Hurst > 0.55), we don't sell overbought RSI
  const isTrending = predictability > 0.55; 
  if (isTrending) {
    if (rsi14 > 70) score += 10; // Strength confirmation
    else if (rsi14 < 30) score -= 10; // Extreme weakness
  } else {
    // Mean Reversion mode
    if (rsi14 > 70) score -= 15; // Mean reversion sell
    else if (rsi14 < 30) score += 15; // Mean reversion buy
  }

  // D. VOLATILITY EXTENSION (Bollinger %B)
  if (percentB > 0.95) score -= 10; // Overextended
  else if (percentB < 0.05) score += 10; // Overextended

  // 3. PREDICTABILITY NOISE FILTER
  // If market is random (Predictability near 0), pull the score back toward 50 (Neutral)
  // This prevents the system from being "too confident" in noisy data.
  const neutralPull = 1 - predictability; 
  score = 50 + (score - 50) * predictability;

  // Signal Mapping
  let signal: TechnicalIndicators['signal'] = 'NEUTRAL';
  if (score >= 75) signal = 'STRONG BUY';
  else if (score >= 60) signal = 'BUY';
  else if (score <= 25) signal = 'STRONG SELL';
  else if (score <= 40) signal = 'SELL';
  
  // Squeeze Factor (High energy consolidation)
  if (isSqueezing) {
    if (compressionScore > 50) score += 5; // Slight bias for high energy setups
  }

  // 4. Structural Analysis (Static calculation)
  const lastBar = history[history.length - 1];
  const pHigh = lastBar.high, pLow = lastBar.low, pClose = lastBar.close;
  const pivot = (pHigh + pLow + pClose) / 3;
  const predictivePivots = {
    pivot, r1: 2 * pivot - pLow, r2: pivot + (pHigh - pLow), r3: pivot + 2 * (pHigh - pLow),
    s1: 2 * pivot - pHigh, s2: pivot - (pHigh - pLow), s3: pivot - 2 * (pHigh - pLow),
  };

  let maxH = -Infinity, minL = Infinity;
  history.forEach(b => { if (b.high > maxH) maxH = b.high; if (b.low < minL) minL = b.low; });
  const fibDiff = maxH - minL;
  const fibonacci = {
    level0: maxH, level236: maxH - 0.236 * fibDiff, level382: maxH - 0.382 * fibDiff,
    level500: maxH - 0.5 * fibDiff, level618: maxH - 0.618 * fibDiff, level786: maxH - 0.786 * fibDiff,
    level100: minL,
  };

  const orderBlocks: OrderBlock[] = [];
  const lookback = Math.min(history.length, 90);
  const recentHistory = history.slice(-lookback);
  
  for (let i = 0; i < recentHistory.length - 2; i++) {
    const c1 = recentHistory[i], c2 = recentHistory[i + 1], c3 = recentHistory[i + 2];
    
    // Efficiency: Early break if future bars already surpassed these zones
    if (c3.low > c1.high && c2.close > c2.open) {
      const top = c3.low, bottom = c1.high;
      const isMitigated = recentHistory.slice(i + 3).some(bar => bar.low <= top);
      if (!isMitigated) {
        orderBlocks.push({ 
          type: 'BULLISH', top, bottom, 
          date: new Date(c2.time * 1000).toISOString().split('T')[0] 
        });
      }
    }
    
    if (c3.high < c1.low && c2.close < c2.open) {
      const top = c1.low, bottom = c3.high;
      const isMitigated = recentHistory.slice(i + 3).some(bar => bar.high >= bottom);
      if (!isMitigated) {
        orderBlocks.push({ 
          type: 'BEARISH', top, bottom, 
          date: new Date(c2.time * 1000).toISOString().split('T')[0] 
        });
      }
    }
  }

  return {
    isValid: true,
    confluenceScore: Math.round(score),
    signal,
    rsi14: Math.round(rsi14),
    macd: { line: lastMacd.MACD || 0, signal: lastMacd.signal || 0, histogram: lastMacd.histogram || 0 },
    bollingerBands: { upper: lastBB.upper, middle: lastBB.middle, lower: lastBB.lower, percentB },
    predictivePivots, fibonacci, orderBlocks: orderBlocks.reverse().slice(0, 3),
    volatilityCompression: { isSqueezing, compressionScore: Math.round(compressionScore) },
    adx: Math.round(adx)
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

  // 2. Cluster pivots that are close to each other (Log-Space)
  const clusters: { price: number; touches: number; types: string[] }[] = [];
  
  pivots.forEach(p => {
    // We use log-distance to ensure sensitivity is relative to price magnitude (v2.1)
    const existing = clusters.find(c => Math.abs(Math.log(c.price / p.price)) < sensitivity);
    if (existing) {
      // Correcting Weighted Log-Averaging for precision centroids (v2.2)
      existing.price = Math.exp(((Math.log(existing.price) * existing.touches) + Math.log(p.price)) / (existing.touches + 1));
      existing.touches++;
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

/**
 * Institutional Volume Profile
 * Maps volume at specific price levels to identify High Volume Nodes (HVNs)
 * which act as significant algorithmic support/resistance gravity wells.
 */
export function detectVolumeProfileNodes(data: OHLCV[], bins: number = 50): VolumeNode[] {
  if (data.length < 2) return [];

  let maxPrice = -Infinity, minPrice = Infinity;
  let totalVol = 0;

  data.forEach(b => {
    if (b.high > maxPrice) maxPrice = b.high;
    if (b.low < minPrice) minPrice = b.low;
    if (b.volume) totalVol += b.volume;
  });

  if (maxPrice === minPrice || totalVol === 0) return [];

  const binSize = (maxPrice - minPrice) / bins;
  const volumeProfile = new Array(bins).fill(0);

  data.forEach(b => {
    if (!b.volume) return;
    
    const startBin = Math.max(0, Math.floor((b.low - minPrice) / binSize));
    let endBin = Math.min(bins - 1, Math.floor((b.high - minPrice) / binSize));
    
    if (startBin > endBin) endBin = startBin;

    const binsSpanned = endBin - startBin + 1;
    const volPerBin = b.volume / binsSpanned;

    for (let i = startBin; i <= endBin; i++) volumeProfile[i] += volPerBin;
  });

  const avgVolPerBin = totalVol / bins;
  const nodes: { index: number, volume: number }[] = [];
  
  // Find local maxima (HVNs)
  for (let i = 2; i < bins - 2; i++) {
    const vol = volumeProfile[i];
    if (vol > avgVolPerBin * 1.5 && 
        vol > volumeProfile[i-1] && vol > volumeProfile[i-2] &&
        vol > volumeProfile[i+1] && vol > volumeProfile[i+2]) {
      nodes.push({ index: i, volume: vol });
    }
  }

  return nodes
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3) 
    .map(n => ({
      price: Number((minPrice + (n.index * binSize) + (binSize / 2)).toFixed(2)),
      volume: n.volume,
      type: 'HVN',
      strength: Math.min(5, Math.ceil(n.volume / avgVolPerBin))
    }));
}
