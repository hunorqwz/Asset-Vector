"use client";
import { createChart, ColorType, IChartApi, LineSeries, AreaSeries, CandlestickSeries, HistogramSeries, UTCTimestamp, CrosshairMode, ISeriesApi, LineStyle } from 'lightweight-charts';
import React, { useEffect, useRef, useState, useCallback, useTransition } from 'react';
import { useMarketTechnicals, OpticMode } from '@/hooks/useMarketTechnicals';
import { OHLCV } from '@/lib/market-data';
import { fetchChartData } from '@/app/actions';
import { CHART_COLORS } from '@/lib/chart-config';
import { fmtCount } from '@/lib/format';
import { GlassBoxTheory, THEORY_CONTENT } from './organisms/GlassBoxTheory';
import { OptionsIntelligence } from '@/lib/options-pricing';
import { MultiHorizonPrediction, PredictionHorizon } from '@/lib/inference';

interface VectorChartProps {
  data: OHLCV[];
  ticker?: string;
  color?: string;
  height?: number;
  initialMode?: OpticMode;
  prediction?: { p10: number; p50: number; p90: number };
  multiHorizonPrediction?: MultiHorizonPrediction;
  stochasticPaths?: { day: number; price: number }[][];
  lastTick?: { price: number; volume?: number; time: number } | null;
  optionsIntelligence?: OptionsIntelligence | null;
}

interface TooltipState {
  visible: boolean; x: number; y: number; time: string; price: string; volume: string; change: string; changePercent: string; isPositive: boolean;
  open: string; high: string; low: string;
}

type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';
const INTRADAY_RANGES: TimeRange[] = ['1D', '5D', '1M', '3M'];
const RANGE_DAYS: Record<TimeRange, number> = { '1D': 1, '5D': 5, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '5Y': 5 * 365, 'ALL': 10 * 365 };

const MenuToggle = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button 
    onClick={onClick} 
    className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/[0.03] transition-colors rounded group"
  >
    <span className={`text-[11px] font-bold tracking-widest uppercase transition-colors ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{label}</span>
    <div className={`w-3 h-3 border transition-all flex items-center justify-center ${active ? 'border-white bg-white/10' : 'border-white/20 bg-transparent'}`}>
      {active && <div className="w-1.5 h-1.5 bg-white" />}
    </div>
  </button>
);

const GlassBoxLegendItem = ({ 
  label, value, theoryKey, color, 
  isDashed = false, isDotted = false 
}: { 
  label: string, value?: string | number | null, theoryKey?: string, color: string, 
  isDashed?: boolean, isDotted?: boolean
}) => {
  const content = theoryKey ? THEORY_CONTENT[theoryKey] : null;
  return (
    <div className="flex items-center gap-1.5 group relative">
      <div 
        className={`w-2 h-0.5 ${isDashed ? 'border-t border-dashed' : isDotted ? 'border-t border-dotted' : ''}`} 
        style={isDashed || isDotted ? { borderColor: color, backgroundColor: 'transparent' } : { backgroundColor: color }} 
      />
      <span className={`text-[10px] font-bold text-zinc-400 uppercase ${content ? 'cursor-help' : ''}`}>
        {label} {value !== undefined && value !== null && <span className="text-zinc-300 ml-1">{value}</span>}
      </span>
      
      {content && (
        <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-80 bg-[#0a0a0c] border border-white/10 p-4 z-[100] shadow-2xl pointer-events-none animate-in fade-in slide-in-from-top-1 duration-200">
           <div className="space-y-3">
             <div className="flex items-center gap-2 mb-1">
               <div className="w-1.5 h-1.5 bg-white" />
               <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">{content.title}</h4>
             </div>
             <p className="text-[10px] text-zinc-400 leading-relaxed border-l border-white/10 pl-2 ml-1">{content.description}</p>
             <div className="bg-[#111] border border-white/5 p-2 font-mono ml-3">
               <span className="text-[9px] text-zinc-500 uppercase block mb-1">State Equation</span>
               <code className="text-[10px] text-matrix whitespace-pre-wrap">{content.formula}</code>
             </div>
             <div className="ml-1">
               <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block mb-2">Algorithmic Protocol</span>
               <ul className="space-y-1.5 pl-2 leading-relaxed">
                 {content.steps.map((step, i) => (
                   <li key={i} className="text-[10px] text-zinc-400 flex items-start gap-1.5">
                      <span className="text-matrix opacity-70 mt-0.5">►</span> 
                      <span className="flex-1">{step}</span>
                   </li>
                 ))}
               </ul>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export const VectorChart = ({ 
  data: initialData, ticker, color = '#23d18b', height = 400, 
  initialMode = 'TACTICAL', prediction, multiHorizonPrediction, stochasticPaths = [], lastTick,
  optionsIntelligence
}: VectorChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [activeRange, setActiveRange] = useState<TimeRange>('ALL');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnalysisMenu, setShowAnalysisMenu] = useState(false);
  const [activeHorizon, setActiveHorizon] = useState<PredictionHorizon>('1D');
  const [activeTheory, setActiveTheory] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [hoveredIndicators, setHoveredIndicators] = useState<Record<string, number | null>>({});
  
  const [indicators, setIndicators] = useState({
    sma20: true, sma50: true, ema20: false, ema50: false, ema200: false,
    bollinger: false, kalman: true, vwap: false, obv: false, volume: true, levels: false, trendlines: false, vpNodes: false, arima: false,
    expectedMove: true, shadows: true, fvgs: true
  });

  const [chartData, setChartData] = useState<OHLCV[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const technicals = useMarketTechnicals(chartData, 'TACTICAL'); // Default to Tactical calculations for indicator support
  const activePred = multiHorizonPrediction?.[activeHorizon] || (activeHorizon === '1D' ? prediction : null);
  const [chartHeight, setChartHeight] = useState(height);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => setChartHeight(isFullscreen ? window.innerHeight - 80 : height);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [height, isFullscreen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowAnalysisMenu(false); };
    if (showAnalysisMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAnalysisMenu]);

  const toggleFullscreen = () => {
    if (!fullscreenRef.current) return;
    if (!isFullscreen) fullscreenRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', cb);
    return () => document.removeEventListener('fullscreenchange', cb);
  }, []);

  const applyTimeRange = useCallback((range: TimeRange) => {
    setActiveRange(range);
    startTransition(async () => {
      if (ticker && INTRADAY_RANGES.includes(range)) {
        setIsLoading(true);
        try { const d = await fetchChartData(ticker, range); if (d?.length) setChartData(d); } finally { setIsLoading(false); }
      } else { setChartData(initialData); }
      requestAnimationFrame(() => {
        if (!chartRef.current) return;
        if (range === 'ALL' || INTRADAY_RANGES.includes(range)) chartRef.current.timeScale().fitContent();
        else {
          const now = Math.floor(Date.now() / 1000);
          chartRef.current.timeScale().setVisibleRange({ from: (now - RANGE_DAYS[range] * 86400) as UTCTimestamp, to: (now + 172800) as UTCTimestamp });
        }
      });
    });
  }, [ticker, initialData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#666', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      width: chartContainerRef.current.clientWidth, height: chartHeight,
      grid: { vertLines: { color: CHART_COLORS.GRID_LINES }, horzLines: { color: CHART_COLORS.GRID_LINES } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.2 }, autoScale: true },
      timeScale: { borderVisible: false, rightOffset: 25, fixLeftEdge: true },
      crosshair: { 
        mode: CrosshairMode.Magnet, 
        vertLine: { labelVisible: true, style: LineStyle.Dashed, color: CHART_COLORS.CROSSHAIR, width: 1, labelBackgroundColor: '#111' }, 
        horzLine: { labelVisible: true, style: LineStyle.Dashed, color: CHART_COLORS.CROSSHAIR, width: 1, labelBackgroundColor: '#111' } 
      },
    });
    chartRef.current = chart;

    const upCol = CHART_COLORS.BULLISH;
    const downCol = CHART_COLORS.BEARISH;

    const mainSeries = chart.addSeries(CandlestickSeries, { 
      upColor: upCol, 
      downColor: downCol, 
      borderUpColor: upCol, 
      borderDownColor: downCol, 
      wickUpColor: upCol, 
      wickDownColor: downCol,
      priceLineVisible: false,
      lastValueVisible: true
    });
    mainSeries.setData(chartData.map(d => ({ time: d.time as UTCTimestamp, open: d.open, high: d.high, low: d.low, close: d.close })));

    let volSeries: any = null;
    if (indicators.volume) {
      volSeries = chart.addSeries(HistogramSeries, { 
        color: 'rgba(255, 255, 255, 0.15)', 
        priceFormat: { type: 'volume' }, 
        priceScaleId: 'volume', 
        priceLineVisible: false 
      });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 }, visible: false });
      volSeries.setData(chartData.map(d => ({ 
        time: d.time as UTCTimestamp, 
        value: d.volume, 
        color: d.close >= d.open ? `${upCol}AA` : `${downCol}AA` 
      })));
    }

    // For attaching crosshair values
    const currentSeriesMap = new Map<string, any>();

    if (technicals) {
      const addLine = (data: number[], c: string, width = 1) => {
        if (!data?.length) return null;
        const l = chart.addSeries(LineSeries, { 
          color: c, 
          lineWidth: width as any, 
          priceLineVisible: false, 
          lastValueVisible: false, 
          crosshairMarkerVisible: false 
        });
        const off = chartData.length - data.length;
        l.setData(data.map((v, i) => ({ time: chartData[off + i]?.time as UTCTimestamp, value: v })).filter(d => d.time));
        return l;
      };
      if (indicators.sma20) { const s = addLine(technicals.sma20, CHART_COLORS.SMA_20); if (s) currentSeriesMap.set('sma20', s); }
      if (indicators.sma50) { const s = addLine(technicals.sma50, CHART_COLORS.SMA_50); if (s) currentSeriesMap.set('sma50', s); }
      if (indicators.ema20) { const s = addLine(technicals.ema20, CHART_COLORS.EMA_20); if (s) currentSeriesMap.set('ema20', s); }
      if (indicators.ema50) { const s = addLine(technicals.ema50, CHART_COLORS.EMA_50); if (s) currentSeriesMap.set('ema50', s); }
      if (indicators.ema200) { const s = addLine(technicals.ema200, CHART_COLORS.EMA_200); if (s) currentSeriesMap.set('ema200', s); }
      if (indicators.kalman) { 
        const s = addLine(technicals.kalman, CHART_COLORS.NEURAL_VECTOR, 2); 
        if (s) currentSeriesMap.set('kalman', s);

        // Add Uncertainty Band (Gaussian Cloud)
        if (technicals.kalmanUncertainty) {
          const cloud = chart.addSeries(CandlestickSeries, {
            upColor: `${CHART_COLORS.NEURAL_VECTOR}22`, 
            downColor: `${CHART_COLORS.NEURAL_VECTOR}22`,
            borderVisible: false,
            wickVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
          });

          const cloudData = technicals.kalman.map((v, i) => {
            const sigma = Math.sqrt(technicals.kalmanUncertainty[i] || 0);
            return {
              time: chartData[i]?.time as UTCTimestamp,
              open: v - sigma, // Lower
              high: v + sigma, // Upper
              low: v - sigma,  // Lower
              close: v + sigma // Upper
            };
          }).filter(d => Boolean(d.time));
          
          cloud.setData(cloudData);
        }
      }
      if (indicators.bollinger) { 
        addLine(technicals.bollinger.upper, CHART_COLORS.BOLLINGER_BANDS); 
        addLine(technicals.bollinger.lower, CHART_COLORS.BOLLINGER_BANDS); 
      }
      if (indicators.levels && technicals.levels) { 
        technicals.levels.forEach(lvl => mainSeries.createPriceLine({ 
          price: lvl.price, 
          color: lvl.type === 'SUPPORT' ? CHART_COLORS.LEVEL_SUPPORT : CHART_COLORS.LEVEL_RESISTANCE, 
          lineWidth: 1 as any, 
          lineStyle: LineStyle.Dashed 
        })); 
      }
      if (indicators.vpNodes && technicals.vpNodes) {
        technicals.vpNodes.forEach(node => {
          mainSeries.createPriceLine({
            price: node.price,
            color: '#38bdf880', // Cyan with opacity
            lineWidth: Math.max(2, Math.min(4, node.strength)) as any,
            lineStyle: LineStyle.Solid,
            title: `HVN (${(node.volume / 1000).toFixed(0)}K)`
          });
        });
      }
      if (indicators.trendlines && technicals.trendlines) {
        technicals.trendlines.forEach(line => {
          const l = chart.addSeries(LineSeries, { color: line.type === 'SUPPORT' ? CHART_COLORS.LEVEL_SUPPORT : CHART_COLORS.LEVEL_RESISTANCE, lineWidth: 2 as any, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: false });
          
          const slopePerIndex = (line.p2.price - line.p1.price) / (line.p2.index - line.p1.index);
          const points = [];
          
          // Render the line precisely over the discrete trading candles to ensure it aligns identically with the mathematical touch logic.
          for(let k = line.p1.index; k < chartData.length; k++) {
             points.push({
                time: chartData[k].time as UTCTimestamp,
                value: line.p1.price + slopePerIndex * (k - line.p1.index)
             });
          }
          
          l.setData(points);
        });
      }
      if (indicators.vwap) { const s = addLine(technicals.vwap, '#38bdf8', 2); if (s) currentSeriesMap.set('vwap', s); }
      if (indicators.obv && technicals.obv) {
        const obvSeries = chart.addSeries(LineSeries, { 
          color: '#d946ef', 
          lineWidth: 2 as any, 
          priceScaleId: 'obv', 
          priceLineVisible: false, 
          lastValueVisible: false,
          crosshairMarkerVisible: false 
        });
        chart.priceScale('obv').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 }, visible: false });
        obvSeries.setData(technicals.obv.map((v, i) => ({ time: chartData[i]?.time as UTCTimestamp, value: v })).filter(d => Boolean(d.time)));
      }
      if (indicators.arima && technicals.arima && !INTRADAY_RANGES.includes(activeRange)) {
        const last = chartData[chartData.length - 1];
        const forecast = technicals.arima.forecast;
        const upper = technicals.arima.confidence95.upper;
        const lower = technicals.arima.confidence95.lower;

        const mainLine = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2 as any, lineStyle: LineStyle.Dashed, priceLineVisible: false });
        const upperLine = chart.addSeries(LineSeries, { color: '#a855f744', lineWidth: 1 as any, lineStyle: LineStyle.Dotted, priceLineVisible: false });
        const lowerLine = chart.addSeries(LineSeries, { color: '#a855f744', lineWidth: 1 as any, lineStyle: LineStyle.Dotted, priceLineVisible: false });

        mainLine.setData([{ time: last.time as UTCTimestamp, value: last.close }, ...forecast.map((v, i) => ({ time: (last.time + 86400 * (i + 1)) as UTCTimestamp, value: v }))]);
        upperLine.setData([{ time: last.time as UTCTimestamp, value: last.close }, ...upper.map((v, i) => ({ time: (last.time + 86400 * (i + 1)) as UTCTimestamp, value: v }))]);
        lowerLine.setData([{ time: last.time as UTCTimestamp, value: last.close }, ...lower.map((v, i) => ({ time: (last.time + 86400 * (i + 1)) as UTCTimestamp, value: v }))]);
        
        currentSeriesMap.set('arima', mainLine);
      }
    }

    if (activePred && !INTRADAY_RANGES.includes(activeRange) && indicators.kalman) {
      const last = chartData[chartData.length - 1];
      const projectionPointsP50 = [{ time: last.time as UTCTimestamp, value: last.close }];
      const projectionPointsP10 = [{ time: last.time as UTCTimestamp, value: last.close }];
      const projectionPointsP90 = [{ time: last.time as UTCTimestamp, value: last.close }];
      
      const kLen = technicals?.kalman?.length || 0;
      const slope = kLen >= 2 ? technicals!.kalman[kLen - 1] - technicals!.kalman[kLen - 2] : 0;
      
      const targetP50 = activePred.p50;
      const targetP10 = activePred.p10;
      const targetP90 = activePred.p90;
      
      const start = last.close;
      
      const HORIZON_DAYS_MAP: Record<PredictionHorizon, number> = {
          "4H": 0.5,
          "1D": 1,
          "3D": 3,
          "1W": 7,
          "1M": 30
      };
      const days = HORIZON_DAYS_MAP[activeHorizon];
      const points = Math.max(5, Math.ceil(days * 2)); // Dynamic point density
      
      // Quadratic curve formulas: y(t) = at^2 + bt + c
      const aP50 = (targetP50 - start - slope * days) / (days * days);
      const aP10 = (targetP10 - start - slope * days) / (days * days);
      const aP90 = (targetP90 - start - slope * days) / (days * days);
      
      for (let i = 1; i <= points; i++) {
        const step = (days / points) * i;
        const time = (last.time + 86400 * step) as UTCTimestamp;
        projectionPointsP50.push({ time, value: aP50 * (step * step) + slope * step + start });
        projectionPointsP10.push({ time, value: aP10 * (step * step) + slope * step + start });
        projectionPointsP90.push({ time, value: aP90 * (step * step) + slope * step + start });
      }
      
      const pLineP50 = chart.addSeries(LineSeries, { color: CHART_COLORS.NEURAL_VECTOR, lineWidth: 2 as any, lineStyle: LineStyle.Dashed, priceLineVisible: false });
      const pLineP90 = chart.addSeries(LineSeries, { color: CHART_COLORS.BULLISH + '88', lineWidth: 1 as any, lineStyle: LineStyle.Dotted, priceLineVisible: false });
      const pLineP10 = chart.addSeries(LineSeries, { color: CHART_COLORS.BEARISH + '88', lineWidth: 1 as any, lineStyle: LineStyle.Dotted, priceLineVisible: false });

      pLineP50.setData(projectionPointsP50);
      pLineP90.setData(projectionPointsP90);
      pLineP10.setData(projectionPointsP10);
      
      currentSeriesMap.set('p50', pLineP50);
      currentSeriesMap.set('p90', pLineP90);
      currentSeriesMap.set('p10', pLineP10);
    }
    
    // RENDER MONTE CARLO STOCHASTIC PATHS
    if (stochasticPaths.length > 0 && !INTRADAY_RANGES.includes(activeRange) && indicators.kalman) {
      const last = chartData[chartData.length - 1];
      stochasticPaths.forEach((path, idx) => {
        const line = chart.addSeries(LineSeries, { 
          color: idx % 2 === 0 ? '#ffffff11' : '#23d18b11', 
          lineWidth: 1 as any, 
          lineStyle: LineStyle.Solid, 
          priceLineVisible: false, 
          lastValueVisible: false,
          crosshairMarkerVisible: false
        });
        
        const pathData = path.map(p => ({
          time: (last.time + 86400 * p.day) as UTCTimestamp,
          value: p.price
        }));
        
        line.setData(pathData);
      });
    }

    // RENDER OPTIONS EXPECTED MOVE PROBABILITY GAP
    if (indicators.expectedMove && optionsIntelligence?.isValid && !INTRADAY_RANGES.includes(activeRange)) {
      const last = chartData[chartData.length - 1];
      const iv = optionsIntelligence.atmImpliedVolatility;
      const price = last.close;
      
      const upperPoints = [{ time: last.time as UTCTimestamp, value: price }];
      const lowerPoints = [{ time: last.time as UTCTimestamp, value: price }];
      
      // Project 30 days or up to expiration
      const days = Math.min(30, optionsIntelligence.daysToExpiration || 30);
      
      for (let i = 1; i <= days; i++) {
        const time = (last.time + 86400 * i) as UTCTimestamp;
        const move = price * iv * Math.sqrt(i / 365);
        upperPoints.push({ time, value: price + move });
        lowerPoints.push({ time, value: Math.max(0, price - move) });
      }

      const upperLine = chart.addSeries(LineSeries, { 
        color: '#34d399', 
        lineWidth: 1 as any, 
        lineStyle: LineStyle.Dashed, 
        priceLineVisible: false, 
        lastValueVisible: false,
        title: 'EXPECTED UPPER'
      });
      const lowerLine = chart.addSeries(LineSeries, { 
        color: '#f87171', 
        lineWidth: 1 as any, 
        lineStyle: LineStyle.Dashed, 
        priceLineVisible: false, 
        lastValueVisible: false,
        title: 'EXPECTED LOWER'
      });

      upperLine.setData(upperPoints);
      lowerLine.setData(lowerPoints);
      
      currentSeriesMap.set('expUpper', upperLine);
      currentSeriesMap.set('expLower', lowerLine);
    }

    // RENDER INSTITUTIONAL FAIR VALUE GAPS (FVG)
    if (indicators.fvgs && technicals?.fvgs) {
      technicals.fvgs.forEach((fvg, idx) => {
        const opacity = Math.max(0.02, 0.15 * (1 - fvg.mitigation));
        const area = chart.addSeries(AreaSeries, {
          topColor: fvg.type === 'BULLISH' ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
          bottomColor: fvg.type === 'BULLISH' ? `rgba(34, 197, 94, ${opacity * 0.3})` : `rgba(239, 68, 68, ${opacity * 0.3})`,
          lineVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false
        });

        const points = [];
        // Draw from the FVG index to the end of the chart
        for (let j = fvg.index; j < chartData.length; j++) {
          points.push({
            time: chartData[j].time as UTCTimestamp,
            value: fvg.top,
            bottomValue: fvg.bottom
          });
        }
        area.setData(points as any);
      });
    }

    // RENDER EXECUTION SHADOWS (TP/SL ZONES)
    if (indicators.shadows && technicals?.executionBounds) {
      const { tpTop, tpBottom, slTop, slBottom } = technicals.executionBounds;
      
      const tpArea = chart.addSeries(AreaSeries, {
        topColor: 'rgba(34, 197, 94, 0.12)',
        bottomColor: 'rgba(34, 197, 94, 0.02)',
        lineVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        title: 'TP ZONE'
      });

      const slArea = chart.addSeries(AreaSeries, {
        topColor: 'rgba(239, 68, 68, 0.12)',
        bottomColor: 'rgba(239, 68, 68, 0.02)',
        lineVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        title: 'SL ZONE'
      });

      const last = chartData[chartData.length - 1];
      const futureTime = (last.time + 86400 * 14) as UTCTimestamp; // Project 2 weeks out

      const tpPoints = [
        { time: last.time as UTCTimestamp, value: tpTop, bottomValue: tpBottom },
        { time: futureTime, value: tpTop, bottomValue: tpBottom }
      ];
      const slPoints = [
        { time: last.time as UTCTimestamp, value: slTop, bottomValue: slBottom },
        { time: futureTime, value: slTop, bottomValue: slBottom }
      ];

      tpArea.setData(tpPoints as any);
      slArea.setData(slPoints as any);
    }


    chart.subscribeCrosshairMove(param => {
      const container = chartContainerRef.current;
      if (!param.point || !param.time || !container || param.point.x < 0 || param.point.x > container.clientWidth || param.point.y < 0 || param.point.y > chartHeight) {
        setHoveredData(null);
        setHoveredIndicators({});
      } else {
        const indData: Record<string, number | null> = {};
        currentSeriesMap.forEach((s, k) => {
          const d = param.seriesData.get(s) as any;
          indData[k] = d?.value ?? null;
        });
        setHoveredIndicators(indData);
        
        const data = param.seriesData.get(mainSeries) as any;
        if (data) {
          const val = data.value ?? data.close;
          const open = data.open ?? val;
          const change = val - open;
          const m = chartData.find(c => c.time === param.time);
          setHoveredData({
            time: new Date((param.time as number) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            price: val.toFixed(2), open: open.toFixed(2), high: (data.high ?? val).toFixed(2), low: (data.low ?? val).toFixed(2),
            volume: m?.volume ? fmtCount(m.volume) : '—',
            changePercent: open ? ((change/open)*100).toFixed(2) : '0.00', isPositive: change >= 0
          });
        }
      }
    });

    const resize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0, height: chartHeight });
    window.addEventListener('resize', resize);

    // REAL-TIME TAPE INTEGRATION
    if (lastTick) {
      const { price, time } = lastTick;
      const lastBar = chartData[chartData.length - 1];
      
      // We only update if the tick is newer or equal to the last bar
      if (time >= lastBar.time) {
        // High-precision update logic
        const updatedBar = {
          time: lastBar.time as UTCTimestamp,
          open: lastBar.open,
          high: Math.max(lastBar.high, price),
          low: Math.min(lastBar.low, price),
          close: price
        };
        
        mainSeries.update(updatedBar);
        
        // Update volume if possible
        if (indicators.volume && lastTick.volume) {
          volSeries?.update({
             time: lastBar.time as UTCTimestamp,
             value: lastBar.volume + lastTick.volume,
             color: price >= lastBar.open ? `${upCol}AA` : `${downCol}AA`
          });
        }
      }
    }

    if (activeRange === 'ALL' || INTRADAY_RANGES.includes(activeRange)) {
      chart.timeScale().fitContent();
    } else {
      const now = Math.floor(Date.now() / 1000);
      chart.timeScale().setVisibleRange({ from: (now - RANGE_DAYS[activeRange] * 86400) as UTCTimestamp, to: (now + 172800) as UTCTimestamp });
    }

    return () => { window.removeEventListener('resize', resize); chart.remove(); };
  }, [chartData, color, chartHeight, technicals, prediction, multiHorizonPrediction, activeHorizon, indicators, activeRange, lastTick]);

  return (
    <div ref={fullscreenRef} className="relative w-full flex flex-col bg-transparent">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex gap-1">
          {(['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'ALL'] as TimeRange[]).map(r => (
            <button key={r} onClick={() => applyTimeRange(r)} className={`px-3 py-1.5 text-[11px] font-bold tracking-widest transition-all ${activeRange === r ? 'bg-white/15 text-white shadow-none' : 'text-zinc-500 hover:text-zinc-300'}`}>{r}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/5 border border-white/10 p-0.5 rounded-sm">
          {(['4H', '1D', '3D', '1W', '1M'] as PredictionHorizon[]).map(h => (
            <button key={h} onClick={() => setActiveHorizon(h)} className={`px-2 py-1 text-[9px] font-black tracking-widest transition-all ${activeHorizon === h ? 'bg-matrix text-black' : 'text-zinc-500 hover:text-zinc-300'}`}>{h}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowAnalysisMenu(!showAnalysisMenu)} 
              className={`px-4 py-1.5 border text-[11px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${showAnalysisMenu ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 bg-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              STUDIES
            </button>
            {showAnalysisMenu && (
              <div className="absolute top-12 right-0 z-[60] w-56 bg-[#0a0a0a] border border-white/10 p-2 shadow-none animate-in fade-in slide-in-from-top-2">
                <MenuToggle active={indicators.sma20} onClick={() => setIndicators(s => ({ ...s, sma20: !s.sma20 }))} label="SMA 20" />
                <MenuToggle active={indicators.sma50} onClick={() => setIndicators(s => ({ ...s, sma50: !s.sma50 }))} label="SMA 50" />
                <MenuToggle active={indicators.ema200} onClick={() => setIndicators(s => ({ ...s, ema200: !s.ema200 }))} label="EMA 200" />
                <div className="h-px bg-white/5 my-1" />
                <MenuToggle active={indicators.bollinger} onClick={() => setIndicators(s => ({ ...s, bollinger: !s.bollinger }))} label="Bollinger Bands" />
                <MenuToggle active={indicators.kalman} onClick={() => setIndicators(s => ({ ...s, kalman: !s.kalman }))} label="Neural Vector" />
                <MenuToggle active={indicators.vwap} onClick={() => setIndicators(s => ({ ...s, vwap: !s.vwap }))} label="VWAP" />
                <MenuToggle active={indicators.obv} onClick={() => setIndicators(s => ({ ...s, obv: !s.obv }))} label="Inst. OBV" />
                <MenuToggle active={indicators.volume} onClick={() => setIndicators(s => ({ ...s, volume: !s.volume }))} label="Volume" />
                <MenuToggle active={indicators.levels} onClick={() => setIndicators(s => ({ ...s, levels: !s.levels }))} label="S/R Levels" />
                <MenuToggle active={indicators.vpNodes} onClick={() => setIndicators(s => ({ ...s, vpNodes: !s.vpNodes }))} label="Vol. Profile HVNs" />
                <MenuToggle active={indicators.arima} onClick={() => setIndicators(s => ({ ...s, arima: !s.arima }))} label="ARIMA Projection" />
                <MenuToggle active={indicators.trendlines} onClick={() => setIndicators(s => ({ ...s, trendlines: !s.trendlines }))} label="Trendlines" />
                <MenuToggle active={indicators.expectedMove} onClick={() => setIndicators(s => ({ ...s, expectedMove: !s.expectedMove }))} label="Expected Move (σ1)" />
                <MenuToggle active={indicators.shadows} onClick={() => setIndicators(s => ({ ...s, shadows: !s.shadows }))} label="Execution Shadows" />
                <MenuToggle active={indicators.fvgs} onClick={() => setIndicators(s => ({ ...s, fvgs: !s.fvgs }))} label="Liquidity FVGs" />
              </div>
            )}
          </div>
          <button onClick={toggleFullscreen} className="p-1.5 text-zinc-500 hover:text-white transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
        </div>
      </div>

      <div className="relative">
        {/* TOP-LEFT LEGEND OVERLAY */}
        <div className="absolute top-3 left-4 z-[40] pointer-events-none flex flex-col gap-2">
          {(() => {
            const display = hoveredData || (chartData?.length ? {
              time: new Date((chartData[chartData.length-1].time as number) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              open: chartData[chartData.length-1].open.toFixed(2),
              high: chartData[chartData.length-1].high.toFixed(2),
              low: chartData[chartData.length-1].low.toFixed(2),
              price: chartData[chartData.length-1].close.toFixed(2),
              volume: fmtCount(chartData[chartData.length-1].volume),
              changePercent: (((chartData[chartData.length-1].close - chartData[chartData.length-1].open) / chartData[chartData.length-1].open) * 100).toFixed(2),
              isPositive: chartData[chartData.length-1].close >= chartData[chartData.length-1].open
            } : null);

            const indDisplay = hoveredData ? hoveredIndicators : {
              sma20: technicals?.sma20?.[technicals.sma20.length - 1],
              sma50: technicals?.sma50?.[technicals.sma50.length - 1],
              ema200: technicals?.ema200?.[technicals.ema200.length - 1],
              kalman: technicals?.kalman?.[technicals.kalman.length - 1],
              vwap: technicals?.vwap?.[technicals.vwap.length - 1],
              arima: technicals?.arima?.forecast?.[0],
              p50: activePred?.p50,
              p90: activePred?.p90,
              p10: activePred?.p10,
              expUpper: optionsIntelligence?.upperBound,
              expLower: optionsIntelligence?.lowerBound
            };

            if (!display) return null;

            return (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 text-[11px] font-mono font-bold tracking-tight">
                  <span className="text-zinc-400">{display.time}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">Open<span className="ml-1" style={{ color: display.isPositive ? CHART_COLORS.BULLISH : CHART_COLORS.BEARISH }}>{display.open}</span></span>
                    <span className="text-zinc-500">High<span className="ml-1" style={{ color: display.isPositive ? CHART_COLORS.BULLISH : CHART_COLORS.BEARISH }}>{display.high}</span></span>
                    <span className="text-zinc-500">Low<span className="ml-1" style={{ color: display.isPositive ? CHART_COLORS.BULLISH : CHART_COLORS.BEARISH }}>{display.low}</span></span>
                    <span className="text-zinc-500">Close<span className="ml-1" style={{ color: display.isPositive ? CHART_COLORS.BULLISH : CHART_COLORS.BEARISH }}>{display.price}</span></span>
                    <span className="text-zinc-500">Volume<span className="ml-1 text-white">{display.volume}</span></span>
                  </div>
                </div>
                
                {/* ACTIVE INDICATORS LEGEND */}
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  {indicators.sma20 && <GlassBoxLegendItem label="SMA 20" value={indDisplay.sma20?.toFixed(2)} theoryKey="SMA" color={CHART_COLORS.SMA_20} />}
                  {indicators.vwap && <GlassBoxLegendItem label="VWAP" value={indDisplay.vwap?.toFixed(2)} color="#38bdf8" />}
                  {indicators.sma50 && <GlassBoxLegendItem label="SMA 50" value={indDisplay.sma50?.toFixed(2)} theoryKey="SMA" color={CHART_COLORS.SMA_50} />}
                  {indicators.ema200 && <GlassBoxLegendItem label="EMA 200" value={indDisplay.ema200?.toFixed(2)} theoryKey="EMA" color={CHART_COLORS.EMA_200} />}
                  {indicators.arima && <GlassBoxLegendItem label="ARIMA" value={indDisplay.arima?.toFixed(2)} color="#a855f7" isDashed />}
                  {indicators.bollinger && <GlassBoxLegendItem label="BB" theoryKey="Bollinger" color={CHART_COLORS.BOLLINGER_BANDS_LEGEND} />}
                  {indicators.kalman && (
                    <>
                      <GlassBoxLegendItem 
                        label={`Vector (${activeHorizon})`} 
                        value={indDisplay.p50?.toFixed(2)} 
                        theoryKey="Kalman" 
                        color={CHART_COLORS.NEURAL_VECTOR} 
                        isDashed 
                      />
                      <GlassBoxLegendItem label="Gaussian Cloud" color={`${CHART_COLORS.NEURAL_VECTOR}66`} />
                      <GlassBoxLegendItem label="P90" value={indDisplay.p90?.toFixed(2)} color={CHART_COLORS.BULLISH} isDotted />
                      <GlassBoxLegendItem label="P10" value={indDisplay.p10?.toFixed(2)} color={CHART_COLORS.BEARISH} isDotted />
                    </>
                  )}
                  {indicators.expectedMove && optionsIntelligence && (
                    <GlassBoxLegendItem label="σ1 Gap" value={`±$${optionsIntelligence.expectedMoveDollars.toFixed(2)}`} color="#34d399" isDashed />
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        <div ref={chartContainerRef} className="w-full" />
      </div>
    </div>
  );
};
