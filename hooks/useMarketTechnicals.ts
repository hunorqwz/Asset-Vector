import { useMemo } from 'react';
import { BollingerBands, RSI, MACD, SMA, EMA } from 'technicalindicators';
import { OHLCV } from '@/lib/market-data';
import { detectSupportResistance, PivotLevel } from '@/lib/technical-analysis';
import { detectTrendlines, Trendline } from '@/lib/trendlines';
import { runKalmanBatch, KalmanFilter } from '@/lib/kalman';

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
  vwap: number[];
  obv: number[];
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
    const { R, Q } = KalmanFilter.deriveParameters(prices);
    const kalmanObjects = runKalmanBatch(prices, R, Q);
    const kalman = kalmanObjects.map(k => k.prediction);

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
      vwap,
      obv
    };
  }, [data, mode]);
}
