import { useMemo } from 'react';
import { BollingerBands, RSI, MACD, SMA } from 'technicalindicators';
import { OHLCV } from '@/lib/market-data';

export type OpticMode = 'ZEN' | 'TACTICAL' | 'QUANT';

export interface Technicals {
  sma20: number[];
  sma50: number[];
  rsi: number[];
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  macd: { macd: number[]; signal: number[]; histogram: number[] };
}

export function useMarketTechnicals(data: OHLCV[], mode: OpticMode): Technicals | null {
  return useMemo(() => {
    if (!data || data.length < 50) return null;
    
    // Extract close prices for indicators
    const prices = data.map(d => d.close);
    
    // 1. ZEN LAYER
    const sma20 = SMA.calculate({ period: 20, values: prices });
    const sma50 = SMA.calculate({ period: 50, values: prices });

    // 2. TACTICAL LAYER (Volatility & Momentum)
    let bollinger = { upper: [], middle: [], lower: [] } as any;
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
    let macd = { macd: [], signal: [], histogram: [] } as any;

    if (mode === 'QUANT') {
      const m = MACD.calculate({
        values: prices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });
      
      macd = {
        macd: m.map(x => x.MACD),
        signal: m.map(x => x.signal),
        histogram: m.map(x => x.histogram)
      };
    }

    return {
      sma20,
      sma50,
      rsi,
      bollinger,
      macd
    };
  }, [data, mode]);
}
