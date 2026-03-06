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
  strength: number;
  isMitigated: boolean;
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
  darkPoolBlocks: { price: number; volume: number }[];
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
      adx: 20,
      darkPoolBlocks: []
    };
  }

  const highs = history.map(h => h.high);
  const lows = history.map(h => h.low);
  const closes = history.map(h => h.close);
  const volumes = history.map(h => h.volume || 0);

  const lastPrice = closes[closes.length - 1];

  // 1. Calculate Core Indicators
  const rsiValues = RSI.calculate({ period: 14, values: closes });
  const rsi14 = rsiValues[rsiValues.length - 1] || 50;

  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
    SimpleMAOscillator: false, SimpleMASignal: false
  });
  const lastMacd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };

  const bbValues = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
  const lastBB = bbValues[bbValues.length - 1] || { upper: 0, middle: 0, lower: 0 };
  const percentB = lastBB.upper !== lastBB.lower ? (lastPrice - lastBB.lower) / (lastBB.upper - lastBB.lower) : 0.5;

  // 1.5. Keltner Channels (for Squeeze Detection)
  const atrValues = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14
  });
  const adxValues = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14
  });
  const adx = adxValues[adxValues.length - 1]?.adx || 20;

  const sma20 = SMA.calculate({ period: 20, values: closes });
  
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

  const maxH = Math.max(...highs);
  const minL = Math.min(...lows);
  const fibDiff = maxH - minL;
  const fibonacci = {
    level0: maxH, level236: maxH - 0.236 * fibDiff, level382: maxH - 0.382 * fibDiff,
    level500: maxH - 0.5 * fibDiff, level618: maxH - 0.618 * fibDiff, level786: maxH - 0.786 * fibDiff,
    level100: minL,
  };

  const orderBlocks = detectOrderBlocks(history);
  const darkPoolBlocks = detectDarkPoolBlocks(history);

  return {
    isValid: true,
    confluenceScore: Math.round(score),
    signal,
    rsi14: Math.round(rsi14),
    macd: { line: lastMacd.MACD || 0, signal: lastMacd.signal || 0, histogram: lastMacd.histogram || 0 },
    bollingerBands: { upper: lastBB.upper, middle: lastBB.middle, lower: lastBB.lower, percentB },
    predictivePivots, fibonacci, orderBlocks, darkPoolBlocks,
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
  const mapped = clusters
    .filter(c => c.touches >= 2) // Filter noise
    .map(c => {
      const isSupport = c.price < currentPrice;
      return {
        price: Number(c.price.toFixed(2)),
        type: (isSupport ? 'SUPPORT' : 'RESISTANCE') as 'SUPPORT' | 'RESISTANCE',
        touches: c.touches,
        strength: Math.min(5, c.touches)
      };
    });

  const supports = mapped.filter(c => c.type === 'SUPPORT').sort((a, b) => b.touches - a.touches).slice(0, 2);
  const resistances = mapped.filter(c => c.type === 'RESISTANCE').sort((a, b) => b.touches - a.touches).slice(0, 2);

  return [...supports, ...resistances].sort((a, b) => b.price - a.price);
}

/**
 * Detects Significant Volume Nodes (HVP/LVP) for institutional order flow analysis.
 */
export function detectVolumeProfileNodes(data: OHLCV[], bins: number = 30): VolumeNode[] {
  if (data.length === 0) return [];
  
  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const binSize = range / bins;
  
  const profile = new Array(bins).fill(0).map((_, i) => ({
    price: min + (i * binSize) + (binSize / 2),
    volume: 0
  }));
  
  data.forEach(d => {
    const binIdx = Math.min(bins - 1, Math.floor((d.close - min) / binSize));
    if (binIdx >= 0) {
      profile[binIdx].volume += (d.volume || 0);
    }
  });
  
  // Find local maxima (HVN) and minima (LVN)
  const nodes: VolumeNode[] = [];
  for (let i = 0; i < bins; i++) {
    const prev = i > 0 ? profile[i - 1].volume : -1;
    const curr = profile[i].volume;
    const next = i < bins - 1 ? profile[i + 1].volume : -1;
    
    if (curr > prev && curr > next && curr > 0) {
      nodes.push({
        price: Number(profile[i].price.toFixed(2)),
        volume: curr,
        type: 'HVN',
        strength: 0 
      });
    } else if (curr < prev && curr < next && curr > 0) {
      nodes.push({
        price: Number(profile[i].price.toFixed(2)),
        volume: curr,
        type: 'LVN',
        strength: 0
      });
    }
  }
  
  const maxVol = Math.max(...nodes.map(n => n.volume), 1);
  nodes.forEach(n => {
    n.strength = Math.round((n.volume / maxVol) * 5);
  });
  
  return nodes.sort((a, b) => b.volume - a.volume).slice(0, 10);
}

/**
 * Detects Institutional Order Blocks through high-volume price consolidation and violent breaks.
 * Upgraded to Order Flow 2.0 with Mitigation Mapping.
 */
export function detectOrderBlocks(data: OHLCV[]): OrderBlock[] {
  if (data.length < 10) return [];
  
  const blocks: OrderBlock[] = [];
  
  // Look for "Imbalance" candles preceded by consolidation
  for (let i = 5; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    
    const bodySize = Math.abs(curr.close - curr.open);
    const avgBodySize = data.slice(i - 5, i).reduce((acc, d) => acc + Math.abs(d.close - d.open), 0) / 5;
    const avgVol = data.slice(i - 5, i).reduce((acc, d) => acc + (d.volume || 0), 0) / 5;
    
    // 1. Detect Imbalance (Violent price discovery)
    if (bodySize > avgBodySize * 2.5 && (curr.volume || 0) > avgVol * 1.5) {
      const isBullish = curr.close > curr.open;
      const top = prev.high;
      const bottom = prev.low;
      const strength = Math.min(5, avgBodySize > 0 ? Math.floor(bodySize / avgBodySize) : 5);
      
      // 2. Mitigation Mapping (Check if future bars touched this zone)
      let isMitigated = false;
      for (let j = i + 1; j < data.length; j++) {
        if (isBullish) {
          if (data[j].low <= top) {
            isMitigated = true;
            break;
          }
        } else {
          if (data[j].high >= bottom) {
            isMitigated = true;
            break;
          }
        }
      }

      const date = new Date(curr.time * 1000).toISOString().split('T')[0];
      
      // Filter duplicates by price proximity
      const mid = (top + bottom) / 2;
      const existing = blocks.find(b => Math.abs((b.top + b.bottom)/2 - mid) / mid < 0.005);
      if (!existing) {
        blocks.push({
          type: isBullish ? 'BULLISH' : 'BEARISH',
          top: Number(top.toFixed(2)),
          bottom: Number(bottom.toFixed(2)),
          date,
          strength,
          isMitigated
        });
      }
    }
  }
  
  return blocks.sort((a, b) => b.strength - a.strength).slice(0, 5);
}

/**
 * Approximates Dark Pool (Shadow Liquidity) blocks by finding extreme volume anomalies
 * with disproportionately small price action (indicates off-exchange absorption).
 */
export function detectDarkPoolBlocks(data: OHLCV[]): { price: number; volume: number }[] {
  if (data.length < 20) return [];
  
  const shadowBlocks: { price: number; volume: number }[] = [];
  
  for (let i = 20; i < data.length; i++) {
    const curr = data[i];
    if (!curr.volume) continue;
    
    // Calculate 20-period average volume and ATR (Average True Range)
    const avgVol = data.slice(i - 20, i).reduce((acc, d) => acc + (d.volume || 0), 0) / 20;
    const avgRange = data.slice(i - 20, i).reduce((acc, d) => acc + (d.high - d.low), 0) / 20;
    
    const currRange = curr.high - curr.low;
    
    // Anomaly: Volume is > 4x normal, BUT price range is < 1.5x normal
    // This implies massive shares changed hands without moving the market (classic Dark Pool print signature)
    if (curr.volume > avgVol * 4 && currRange < avgRange * 1.5) {
      // The price point of interest is the VWAP of that candle (approximated by (H+L+C)/3)
      const executionPrice = (curr.high + curr.low + curr.close) / 3;
      
      shadowBlocks.push({
        price: Number(executionPrice.toFixed(2)),
        volume: curr.volume
      });
    }
  }
  
  // Return the top 3 largest shadow liquidity nodes
  return shadowBlocks.sort((a, b) => b.volume - a.volume).slice(0, 3);
}
