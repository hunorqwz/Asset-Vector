"use client";

import { createChart, ColorType, IChartApi, LineSeries, AreaSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';
import { useMarketTechnicals, OpticMode } from '@/hooks/useMarketTechnicals';
import { OHLCV } from '@/lib/market-data';

interface VectorChartProps {
  data: OHLCV[];
  color?: string;
  height?: number;
  initialMode?: OpticMode;
  prediction?: { p10: number; p50: number; p90: number };
}

export const VectorChart = ({ 
  data, 
  color = '#10b981',
  height = 160,
  initialMode = 'ZEN',
  prediction
}: VectorChartProps) => {
  const [mode, setMode] = useState<OpticMode>(initialMode);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const technicals = useMarketTechnicals(data, mode);

  // --- CHART LIFECYCLE ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#555' },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false, borderVisible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: { vertLine: { visible: false, labelVisible: false }, horzLine: { visible: false, labelVisible: false }, mode: 1 },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // Generate accurate timestamps
    const now = Math.floor(Date.now() / 1000);
    const daySeconds = 86400;

    // 2. PRIMARY LAYER: Price
    if (mode === 'ZEN') {
       const areaSeries = chart.addSeries(AreaSeries, {
          lineColor: color, topColor: `${color}33`, bottomColor: `${color}05`, lineWidth: 2,
          crosshairMarkerVisible: false, priceLineVisible: false,
       });
       
       const areaData = data.map((val, i) => ({
          time: (now - (data.length - 1 - i) * daySeconds) as any, 
          value: val.close
       }));
       areaSeries.setData(areaData);

    } else {
       // TACTICAL / QUANT: Candlesticks
       const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981', downColor: '#f43f5e', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#f43f5e'
       });

       const candleData = data.map((val, i) => ({
          time: (now - (data.length - 1 - i) * daySeconds) as any,
          open: val.open, high: val.high, low: val.low, close: val.close
       }));
       candleSeries.setData(candleData);
    }
    
    // 3. VOLUME LAYER (Tactical/Quant)
    if (mode !== 'ZEN') {
       const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#262626',
          priceFormat: { type: 'volume' },
          priceScaleId: '', // Overlay on main chart
       });
       
       // Force volume to bottom 15% of chart
       volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
       });

       const volumeData = data.map((val, i) => ({
          time: (now - (data.length - 1 - i) * daySeconds) as any,
          value: val.volume,
          color: val.close > val.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
       }));
       volumeSeries.setData(volumeData);
    }

    // 4. AI PREDICTION LAYER (Vector Horizon)
    if (prediction && mode !== 'ZEN') {
        const lastCandle = data[data.length - 1];
        const lastTime = now;
        
        // CORRIDOR: p10-p90 (Depth)
        const corridorSeries = chart.addSeries(AreaSeries, {
            lineColor: 'transparent',
            topColor: 'rgba(129, 140, 248, 0.1)',
            bottomColor: 'rgba(129, 140, 248, 0.02)',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        
        corridorSeries.setData([
            { time: lastTime as any, value: lastCandle.close },
            { time: (lastTime + daySeconds) as any, value: prediction.p50 } // Simplified for area
        ]);

        // PREDICTION LINE: p50 (The Vector)
        const vectorSeries = chart.addSeries(LineSeries, {
            color: '#818cf8',
            lineWidth: 2,
            lineStyle: 2, // Dashed
            lastValueVisible: true,
            title: "TFT_PROJECTION",
            priceLineVisible: false,
        });

        vectorSeries.setData([
            { time: (now - daySeconds) as any, value: data[data.length - 2].close }, // Connecting to history
            { time: now as any, value: lastCandle.close },
            { time: (now + daySeconds) as any, value: prediction.p50 }
        ]);
    }
    
    // 5. OVERLAYS (Technicals)
    if (mode === 'TACTICAL' || mode === 'QUANT') {
       if (technicals?.bollinger) {
          const upper = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.15)', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
          const lower = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.15)', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
          
          upper.setData(technicals.bollinger.upper.map((v: number, i: number) => ({
              time: (now - (technicals.bollinger.upper.length - 1 - i) * daySeconds) as any, value: v
          })));
          
          lower.setData(technicals.bollinger.lower.map((v: number, i: number) => ({
              time: (now - (technicals.bollinger.lower.length - 1 - i) * daySeconds) as any, value: v
          })));
       }
    }

    // 6. RSI OVERLAY (Quant Only)
    if (mode === 'QUANT' && technicals?.rsi) {
        const rsiSeries = chart.addSeries(LineSeries, {
            color: '#A3A3A3', 
            lineWidth: 1,
            priceScaleId: 'left', 
            lineStyle: 2, 
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false
        });
        
        chart.priceScale('left').applyOptions({
            visible: false,
            scaleMargins: { top: 0.7, bottom: 0.1 } 
        });

        rsiSeries.setData(technicals.rsi.map((v: number, i: number) => ({
            time: (now - (technicals.rsi.length - 1 - i) * daySeconds) as any, value: v
        })));
    }

    chart.timeScale().fitContent();

    const handleResizeCallback = () => {
       if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
       }
    };
    
    window.addEventListener('resize', handleResizeCallback);

    return () => {
      window.removeEventListener('resize', handleResizeCallback);
      chart.remove();
    };
  }, [data, color, height, mode, technicals, prediction]);
 

  // --- OPTIC SWITCH UI ---
  return (
    <div className="relative group w-full" style={{ height }}>
        <div 
            ref={chartContainerRef} 
            className="w-full h-full opacity-90 transition-opacity" 
        />
        
        {/* THE OPTIC SWITCH (Tactical) */}
        <div className="absolute bottom-6 left-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-2 group-hover:translate-y-0 z-20">
           {(['ZEN', 'TACTICAL', 'QUANT'] as OpticMode[]).map((m) => (
              <button 
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg border transition-all text-telemetry backdrop-blur-3xl shadow-2xl ${
                  mode === m 
                  ? 'bg-matrix text-white border-matrix glow-matrix' 
                  : 'glass-card text-terminal border-white/5 hover:border-white/20 hover:text-white'
                }`}
              >
                {m}
              </button>
           ))}
        </div>


    </div>
  );
};
