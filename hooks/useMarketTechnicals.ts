import { useMemo } from 'react';
import { BollingerBands, RSI, MACD, SMA, EMA } from 'technicalindicators';
import { OHLCV } from '@/lib/market-data';
import { detectSupportResistance, detectVolumeProfileNodes, PivotLevel, VolumeNode } from '@/lib/technical-analysis';
import { detectTrendlines, Trendline } from '@/lib/trendlines';
import { runKalmanBatch, KalmanFilter } from '@/lib/kalman';
import { runARIMAForecast, ARIMAProjection } from '@/lib/math';

export type MarketRegime = "MEAN_REVERSION" | "MOMENTUM" | "RANDOM_WALK";

export interface FVG {
  top: number;
  bottom: number;
  type: 'BULLISH' | 'BEARISH';
  index: number; // Index of the gap candle
  isValid: boolean;
  mitigation: number; // 0.0 (fresh) to 1.0 (fully filled)
}

export interface ExecutionBounds {
  tpTop: number;
  tpBottom: number;
  slTop: number;
  slBottom: number;
}

export type OpticMode = 'ZEN' | 'TACTICAL' | 'QUANT';

export interface Technicals {
  sma20: number[];
  sma50: number[];
  ema20: number[];
  ema50: number[];
  ema200: number[];
  rsi: number[];
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  levels: PivotLevel[];
  trendlines: Trendline[];
  kalman: number[];
  kalmanUncertainty: number[];
  vwap: number[];
  obv: number[];
  vpNodes: VolumeNode[];
  arima: ARIMAProjection;
  fvgs: FVG[];
  executionBounds?: ExecutionBounds;
}

export function useMarketTechnicals(data: OHLCV[], mode: OpticMode): Technicals | null {
  return useMemo(() => {
    if (!data || data.length < 50) return null;
    
    // Extract close prices for indicators
    const prices = data.map(d => d.close);
    
    // 1. ZEN LAYER
    const sma20 = SMA.calculate({ period: 20, values: prices });
    const sma50 = SMA.calculate({ period: 50, values: prices });
    
    // EMAs for tactical/quant
    const ema20 = EMA.calculate({ period: 20, values: prices });
    const ema50 = EMA.calculate({ period: 50, values: prices });
    const ema200 = prices.length >= 200 ? EMA.calculate({ period: 200, values: prices }) : [];

    // 2. TACTICAL LAYER (Volatility & Momentum)
    let bollinger = { upper: [] as number[], middle: [] as number[], lower: [] as number[] };
    let rsi: number[] = [];

    if (mode === 'TACTICAL' || mode === 'QUANT') {
      const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: prices });
      bollinger = {
        upper: bb.map(b => b.upper),
        middle: bb.map(b => b.middle),
        lower: bb.map(b => b.lower)
      };
      
      rsi = RSI.calculate({ period: 14, values: prices });
    }

    // 3. QUANT LAYER (Signal Divergence)
    let macd = { macd: [] as number[], signal: [] as number[], histogram: [] as number[] };

    if (mode === 'QUANT') {
      const m = MACD.calculate({
        values: prices,
        fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
        SimpleMAOscillator: false, SimpleMASignal: false
      });
      macd = { macd: m.map(x => x.MACD!), signal: m.map(x => x.signal!), histogram: m.map(x => x.histogram!) };
    }

    // 4. NEURAL VECTOR LAYER (Kalman Filter)
    const kalmanObjects = runKalmanBatch(prices);
    const kalman = kalmanObjects.map(k => k.prediction);
    const kalmanUncertainty = kalmanObjects.map(k => k.uncertainty);

    // 5. VOLUME & LIQUIDITY (Anchored VWAP & OBV)
    const vwap: number[] = [];
    const obv: number[] = [];
    let cumTypVol = 0;
    let cumVol = 0;
    let currentObv = 0;
    let currentAnchor = '';

    // Determine if the incoming data matrix is Intraday or Daily resolution
    const isDaily = data.length > 1 && (data[1].time - data[0].time) >= 86400;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const typ = (d.high + d.low + d.close) / 3;
      
      const dateObj = new Date(d.time * 1000);
      
      // Institutional Anchor Rule: 
      // Day Traders reset VWAP at the daily open bell.
      // Swing Traders/Macro Funds reset VWAP at the start of the trading year.
      const anchorKey = isDaily ? dateObj.getFullYear().toString() : dateObj.toISOString().split('T')[0];
      
      if (anchorKey !== currentAnchor) {
        cumTypVol = 0;
        cumVol = 0;
        currentAnchor = anchorKey;
      }
      
      cumTypVol += typ * (d.volume || 1); // Fallback to 1 to prevent NaN on low-liquidity gaps
      cumVol += (d.volume || 1);
      vwap.push(cumTypVol / cumVol);

      if (i > 0) {
        if (d.close > data[i - 1].close) currentObv += (d.volume || 0);
        else if (d.close < data[i - 1].close) currentObv -= (d.volume || 0);
      }
      obv.push(currentObv);
    }

    return {
      sma20,
      sma50,
      ema20,
      ema50,
      ema200,
      rsi,
      bollinger,
      macd,
      levels: detectSupportResistance(data),
      trendlines: detectTrendlines(data),
      kalman,
      kalmanUncertainty,
      vwap,
      obv,
      vpNodes: detectVolumeProfileNodes(data),
      arima: runARIMAForecast(prices, 10),
      fvgs: detectFVGs(data),
      executionBounds: calculateExecutionBounds(data, detectSupportResistance(data))
    };
  }, [data, mode]);
}

/**
 * Detects Institutional Fair Value Gaps (FVG)
 * 3-candle imbalance where there is no overlap between Candle 1 and Candle 3 around a large Candle 2.
 */
function detectFVGs(data: OHLCV[]): FVG[] {
  const fvgs: FVG[] = [];
  const lookback = Math.min(data.length, 100);
  const recent = data.slice(-lookback);
  
  for (let i = 0; i < recent.length - 2; i++) {
    const c1 = recent[i], c2 = recent[i+1], c3 = recent[i+2];
    
    // Bullish FVG: Low of C3 is higher than High of C1
    if (c3.low > c1.high) {
      fvgs.push({
        top: c3.low,
        bottom: c1.high,
        type: 'BULLISH',
        index: data.length - lookback + i + 1,
        isValid: !data.slice(data.length - lookback + i + 3).some(bar => bar.low <= c1.high),
        mitigation: 0
      });
    }
    
    // Bearish FVG: High of C3 is lower than Low of C1
    if (c3.high < c1.low) {
      fvgs.push({
        top: c1.low,
        bottom: c3.high,
        type: 'BEARISH',
        index: data.length - lookback + i + 1,
        isValid: !data.slice(data.length - lookback + i + 3).some(bar => bar.high >= c1.low),
        mitigation: 0
      });
    }
  }
  
  // Calculate mitigation for valid gaps
  return fvgs.filter(f => f.isValid).map(fvg => {
    const futureBars = data.slice(fvg.index + 2);
    let maxBreach = 0;
    
    if (fvg.type === 'BULLISH') {
      const gapHeight = fvg.top - fvg.bottom;
      const lowestLow = Math.min(...futureBars.map(b => b.low), fvg.top);
      maxBreach = Math.max(0, fvg.top - lowestLow);
      fvg.mitigation = Math.min(1.0, maxBreach / gapHeight);
    } else {
      const gapHeight = fvg.top - fvg.bottom;
      const highestHigh = Math.max(...futureBars.map(b => b.high), fvg.bottom);
      maxBreach = Math.max(0, highestHigh - fvg.bottom);
      fvg.mitigation = Math.min(1.0, maxBreach / gapHeight);
    }
    
    return fvg;
  }).filter(f => f.mitigation < 0.95); // Hide if 95% mitigated
}

function calculateExecutionBounds(data: OHLCV[], levels: PivotLevel[]): ExecutionBounds | undefined {
  if (data.length < 50) return undefined;
  const lastPrice = data[data.length - 1].close;
  
  // Dynamic fallback based on ATR
  const recent = data.slice(-20);
  const avgRange = recent.reduce((a, b) => a + (b.high - b.low), 0) / recent.length;

  // Surgical TP Zone: Align with nearest structural resistance
  const resistances = levels.filter(l => l.type === 'RESISTANCE' && l.price > lastPrice).sort((a,b) => a.price - b.price);
  const R1 = resistances[0]?.price || lastPrice + (avgRange * 2);
  const R2 = resistances[1]?.price || R1 + avgRange;

  // Surgical SL Zone: Align with nearest structural support
  const supports = levels.filter(l => l.type === 'SUPPORT' && l.price < lastPrice).sort((a,b) => b.price - a.price);
  const S1 = supports[0]?.price || lastPrice - (avgRange * 2);
  const S2 = supports[1]?.price || S1 - avgRange;

  return {
    tpTop: Math.max(R1, R2),
    tpBottom: Math.min(R1, R2),
    slTop: Math.max(S1, S2),
    slBottom: Math.min(S1, S2)
  };
}
