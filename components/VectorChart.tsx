"use client";
import { createChart, ColorType, IChartApi, LineSeries, AreaSeries, CandlestickSeries, HistogramSeries, UTCTimestamp, CrosshairMode, ISeriesApi, LineStyle } from 'lightweight-charts';
import React, { useEffect, useRef, useState, useCallback, useTransition } from 'react';
import { useMarketTechnicals, OpticMode } from '@/hooks/useMarketTechnicals';
import { OHLCV } from '@/lib/market-data';
import { fetchChartData } from '@/app/actions';

interface VectorChartProps {
  data: OHLCV[];
  ticker?: string;
  color?: string;
  height?: number;
  initialMode?: OpticMode;
  prediction?: { p10: number; p50: number; p90: number };
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  time: string;
  price: string;
  opening_price: string;
  highest_price: string;
  lowest_price: string;
  closing_price: string;
  volume: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

/**
 * Industry-standard time range → interval mapping.
 * 
 * | Range | Candle Size | Notes                    |
 * |-------|-------------|--------------------------|
 * | 1D    | 5 min       | Intraday detail          |
 * | 5D    | 15 min      | Short-term intraday      |
 * | 1M    | 1 hour      | Shows daily patterns     |
 * | 3M    | 1 day       | Standard daily candles   |
 * | 6M    | 1 day       | Medium-term daily        |
 * | 1Y    | 1 day       | Long-term daily          |
 * | 5Y    | 1 day       | Multi-year daily         |
 * | ALL   | 1 day       | Maximum available data   |
 */
type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

const INTRADAY_RANGES: TimeRange[] = ['1D', '5D', '1M'];

// Days of data each range should display
const RANGE_DAYS: Record<TimeRange, number> = {
  '1D': 1,
  '5D': 5,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '5Y': 5 * 365,
  'ALL': 99999,
};

// Interval labels shown to the user
const INTERVAL_LABELS: Record<TimeRange, string> = {
  '1D': '5m',
  '5D': '15m',
  '1M': '1h',
  '3M': '1d',
  '6M': '1d',
  '1Y': '1d',
  '5Y': '1d',
  'ALL': '1d',
};

export const VectorChart = ({ 
  data: initialData, 
  ticker,
  color = 'hsl(var(--bull))',
  height = 400,
  initialMode = 'ZEN',
  prediction
}: VectorChartProps) => {
  const [mode, setMode] = useState<OpticMode>(initialMode);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, time: '', price: '', opening_price: '', highest_price: '', lowest_price: '', closing_price: '', volume: '', change: '', changePercent: '', isPositive: true
  });
  const [chartHeight, setChartHeight] = useState(height);
  const [activeRange, setActiveRange] = useState<TimeRange>('ALL');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSMA, setShowSMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  
  // Dynamic data state — starts with server-provided data, updates on range change
  const [chartData, setChartData] = useState<OHLCV[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const technicals = useMarketTechnicals(chartData, mode);

  // Height management
  useEffect(() => {
    const updateHeight = () => {
      if (isFullscreen) {
        setChartHeight(window.innerHeight - 120);
      } else {
        const vh = window.innerHeight;
        const calculatedHeight = Math.max(height, vh * 0.65);
        setChartHeight(calculatedHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [height, isFullscreen]);

  // Fetch data for a specific time range (with interval)
  const loadRangeData = useCallback(async (range: TimeRange) => {
    if (!ticker) return;
    
    // Intraday ranges need fresh data with different intervals
    if (INTRADAY_RANGES.includes(range)) {
      setIsLoading(true);
      try {
        const data = await fetchChartData(ticker, range);
        if (data && data.length > 0) {
          setChartData(data);
        }
      } catch (err) {
        console.error('Failed to load chart data:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // For daily ranges (3M, 6M, 1Y, 5Y, ALL) — use the initial data set 
    // and zoom after chart rebuilds
    setChartData(initialData);
  }, [ticker, initialData]);

  // Time range application
  const applyTimeRange = useCallback((range: TimeRange) => {
    setActiveRange(range);
    
    startTransition(() => {
      loadRangeData(range).then(() => {
        // For daily ranges, zoom the chart to the correct visible window
        // This happens after the chart rebuilds with the data
        requestAnimationFrame(() => {
          if (!chartRef.current || INTRADAY_RANGES.includes(range)) return;
          
          if (range === 'ALL') {
            chartRef.current.timeScale().fitContent();
          } else {
            const now = Math.floor(Date.now() / 1000);
            const daysBack = RANGE_DAYS[range];
            const fromTime = now - daysBack * 86400;
            
            chartRef.current.timeScale().setVisibleRange({
              from: fromTime as UTCTimestamp,
              to: (now + 2 * 86400) as UTCTimestamp,
            });
          }
        });
      });
    });
  }, [loadRangeData]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    if (!visibleRange) return;
    
    const from = visibleRange.from as number;
    const to = visibleRange.to as number;
    const range = to - from;
    const center = from + range / 2;
    const newRange = range * 0.6; // zoom in by 40%
    
    timeScale.setVisibleRange({
      from: (center - newRange / 2) as UTCTimestamp,
      to: (center + newRange / 2) as UTCTimestamp,
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    if (!visibleRange) return;
    
    const from = visibleRange.from as number;
    const to = visibleRange.to as number;
    const range = to - from;
    const center = from + range / 2;
    const newRange = range * 1.5; // zoom out by 50%
    
    timeScale.setVisibleRange({
      from: (center - newRange / 2) as UTCTimestamp,
      to: (center + newRange / 2) as UTCTimestamp,
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().fitContent();
    setActiveRange('ALL');
    setChartData(initialData);
  }, [initialData]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!fullscreenRef.current) return;
    
    if (!isFullscreen) {
      if (fullscreenRef.current.requestFullscreen) {
        fullscreenRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  // Determine if current view is intraday
  const isIntraday = INTRADAY_RANGES.includes(activeRange);

  // Chart creation — now uses real timestamps from data
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: 'transparent' }, 
        textColor: '#888',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      grid: { 
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' }, 
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' } 
      },
      rightPriceScale: { 
        visible: true, 
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.15 },
        entireTextOnly: true,
      },
      timeScale: { 
        visible: true, 
        borderVisible: false,
        timeVisible: isIntraday, // Show time on intraday charts
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: isIntraday ? 6 : 8, // Tighter spacing for many intraday candles
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: { 
        mode: CrosshairMode.Normal,
        vertLine: { 
          color: 'rgba(255, 255, 255, 0.3)', 
          width: 1, 
          style: LineStyle.Dashed, 
          labelBackgroundColor: '#1A1A1A' 
        },
        horzLine: { 
          color: 'rgba(255, 255, 255, 0.3)', 
          width: 1, 
          style: LineStyle.Dashed, 
          labelBackgroundColor: '#1A1A1A' 
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    let mainSeries: ISeriesApi<any>;

    if (mode === 'ZEN') {
       mainSeries = chart.addSeries(AreaSeries, {
          lineColor: '#10b981', 
          topColor: 'rgba(16, 185, 129, 0.25)', 
          bottomColor: 'rgba(16, 185, 129, 0.02)', 
          lineWidth: 2,
          crosshairMarkerRadius: 5,
          crosshairMarkerBackgroundColor: '#10b981',
          crosshairMarkerBorderColor: 'rgba(16, 185, 129, 0.5)',
          crosshairMarkerBorderWidth: 2,
       });
       
       // Use REAL timestamps from data
       const areaData = chartData.map(val => ({
          time: val.time as UTCTimestamp, 
          value: val.close
       }));
       mainSeries.setData(areaData);

    } else {
       mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981', 
          downColor: '#f43f5e', 
          borderVisible: false, 
          wickUpColor: '#10b981', 
          wickDownColor: '#f43f5e',
       });

       // Use REAL timestamps from data
       const candleData = chartData.map(val => ({
          time: val.time as UTCTimestamp,
          open: val.open, high: val.high, low: val.low, close: val.close
       }));
       mainSeries.setData(candleData);
    }

    mainSeriesRef.current = mainSeries;
    
    // VOLUME
    if (mode !== 'ZEN' && showVolume) {
       const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#262626',
          priceFormat: { type: 'volume' },
          priceScaleId: '',
       });
       
       volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.82, bottom: 0 },
       });

       const volumeData = chartData.map(val => ({
          time: val.time as UTCTimestamp,
          value: val.volume,
          color: val.close > val.open ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)'
       }));
       volumeSeries.setData(volumeData);
    }

    // SMA OVERLAYS (works for all timeframes — computes on loaded data)
    if (showSMA && technicals && (mode === 'TACTICAL' || mode === 'QUANT')) {
       if (technicals.sma20.length > 0) {
          const sma20Series = chart.addSeries(LineSeries, { 
            color: 'rgba(129, 140, 248, 0.5)', 
            lineWidth: 1, 
            crosshairMarkerVisible: false, 
            lastValueVisible: false, 
            priceLineVisible: false,
          });
          // Align SMA data with the tail of the chart data
          const offset = chartData.length - technicals.sma20.length;
          sma20Series.setData(technicals.sma20.map((v, i) => ({
            time: chartData[offset + i]?.time as UTCTimestamp, value: v
          })).filter(d => d.time));
       }
       if (technicals.sma50.length > 0) {
          const sma50Series = chart.addSeries(LineSeries, { 
            color: 'rgba(251, 191, 36, 0.4)', 
            lineWidth: 1, 
            crosshairMarkerVisible: false, 
            lastValueVisible: false, 
            priceLineVisible: false,
          });
          const offset = chartData.length - technicals.sma50.length;
          sma50Series.setData(technicals.sma50.map((v, i) => ({
            time: chartData[offset + i]?.time as UTCTimestamp, value: v
          })).filter(d => d.time));
       }
    }

    // PREDICTION LAYER (only for daily data)
    if (prediction && mode !== 'ZEN' && !isIntraday) {
        const lastCandle = chartData[chartData.length - 1];
        const prevCandle = chartData[chartData.length - 2];
        const lastTime = lastCandle.time;
        const daySeconds = 86400;
        
        // Upper band (P90)
        const upperBandSeries = chart.addSeries(LineSeries, {
            color: 'rgba(129, 140, 248, 0.15)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
        });
        
        upperBandSeries.setData([
            { time: lastTime as UTCTimestamp, value: lastCandle.close },
            { time: (lastTime + daySeconds) as UTCTimestamp, value: prediction.p90 }
        ]);

        // Lower band (P10)
        const lowerBandSeries = chart.addSeries(LineSeries, {
            color: 'rgba(129, 140, 248, 0.15)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
        });
        
        lowerBandSeries.setData([
            { time: lastTime as UTCTimestamp, value: lastCandle.close },
            { time: (lastTime + daySeconds) as UTCTimestamp, value: prediction.p10 }
        ]);

        // Confidence corridor fill
        const corridorSeries = chart.addSeries(AreaSeries, {
            lineColor: 'transparent',
            topColor: 'rgba(129, 140, 248, 0.08)',
            bottomColor: 'rgba(129, 140, 248, 0.01)',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
        });
        
        corridorSeries.setData([
            { time: lastTime as UTCTimestamp, value: lastCandle.close },
            { time: (lastTime + daySeconds) as UTCTimestamp, value: prediction.p50 }
        ]);

        // Main vector line (P50)
        const vectorSeries = chart.addSeries(LineSeries, {
            color: '#818cf8',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            lastValueVisible: true,
            title: "Projected",
            priceLineVisible: false,
            crosshairMarkerRadius: 4,
            crosshairMarkerBackgroundColor: '#818cf8',
        });

        vectorSeries.setData([
            { time: (prevCandle?.time ?? lastTime - daySeconds) as UTCTimestamp, value: prevCandle?.close ?? lastCandle.close },
            { time: lastTime as UTCTimestamp, value: lastCandle.close },
            { time: (lastTime + daySeconds) as UTCTimestamp, value: prediction.p50 }
        ]);
    }
    
    // BOLLINGER BANDS (only for daily data)
    if ((mode === 'TACTICAL' || mode === 'QUANT') && technicals?.bollinger && !isIntraday) {
       const upper = chart.addSeries(LineSeries, { 
         color: 'rgba(255, 255, 255, 0.08)', 
         lineWidth: 1, 
         crosshairMarkerVisible: false, 
         lastValueVisible: false, 
         priceLineVisible: false, 
       });
       const lower = chart.addSeries(LineSeries, { 
         color: 'rgba(255, 255, 255, 0.08)', 
         lineWidth: 1, 
         crosshairMarkerVisible: false, 
         lastValueVisible: false, 
         priceLineVisible: false, 
       });
       
       const upperOffset = chartData.length - technicals.bollinger.upper.length;
       upper.setData(technicals.bollinger.upper.map((v, i) => ({
           time: chartData[upperOffset + i]?.time as UTCTimestamp, value: v
       })).filter(d => d.time));
       
       const lowerOffset = chartData.length - technicals.bollinger.lower.length;
       lower.setData(technicals.bollinger.lower.map((v, i) => ({
           time: chartData[lowerOffset + i]?.time as UTCTimestamp, value: v
       })).filter(d => d.time));
    }

    // TOOLTIP LOGIC — format time differently for intraday vs daily
    chart.subscribeCrosshairMove(param => {
       if (
         param.point === undefined ||
         !param.time ||
         param.point.x < 0 ||
         param.point.x > chartContainerRef.current!.clientWidth ||
         param.point.y < 0 ||
         param.point.y > chartHeight
       ) {
         setTooltip(prev => ({ ...prev, visible: false }));
       } else {
         const timestamp = (param.time as number) * 1000;
         const dateFormatOptions: Intl.DateTimeFormatOptions = isIntraday 
           ? { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
           : { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
         
         const dateStr = new Date(timestamp).toLocaleDateString('en-US', dateFormatOptions);
         const dataPoint = param.seriesData.get(mainSeries) as any;
         
         if (dataPoint) {
            const closePrice = dataPoint.close ?? dataPoint.value ?? 0;
            const openPrice = dataPoint.open ?? closePrice;
            const change = closePrice - openPrice;
            const changePercent = openPrice !== 0 ? ((change / openPrice) * 100) : 0;

            // Look up volume from chartData by matching the timestamp
            const candleTime = param.time as number;
            const matchedCandle = chartData.find(c => c.time === candleTime);
            const vol = matchedCandle?.volume ?? 0;

            // Format volume for display (e.g., 1.2M, 345K)
             const formatVolume = (v: number): string => {
               if (!v || v <= 0) return ''; // No data available
               if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
               if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
               if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
               return v.toString();
             };
            
            setTooltip({
              visible: true,
              x: param.point.x,
              y: param.point.y,
              time: dateStr,
              price: closePrice?.toFixed(2) || '',
              opening_price: dataPoint.open ? dataPoint.open.toFixed(2) : '',
              highest_price: dataPoint.high ? dataPoint.high.toFixed(2) : '',
              lowest_price: dataPoint.low ? dataPoint.low.toFixed(2) : '',
              closing_price: closePrice?.toFixed(2) || '',
              volume: formatVolume(vol),
              change: change?.toFixed(2) || '0.00',
              changePercent: changePercent?.toFixed(2) || '0.00',
              isPositive: change >= 0,
            });
         }
       }
    });

    // Set visible range based on activeRange (instead of always fitting all content)
    if (activeRange === 'ALL' || INTRADAY_RANGES.includes(activeRange)) {
      chart.timeScale().fitContent();
    } else {
      const now = Math.floor(Date.now() / 1000);
      const daysBack = RANGE_DAYS[activeRange];
      const fromTime = now - daysBack * 86400;
      try {
        chart.timeScale().setVisibleRange({
          from: fromTime as UTCTimestamp,
          to: (now + 2 * 86400) as UTCTimestamp,
        });
      } catch {
        // If range is out of bounds, fall back to fitContent
        chart.timeScale().fitContent();
      }
    }

    const handleResizeCallback = () => {
       if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartHeight });
       }
    };
    
    window.addEventListener('resize', handleResizeCallback);

    return () => {
      window.removeEventListener('resize', handleResizeCallback);
      chart.remove();
    };
  }, [chartData, color, chartHeight, mode, technicals, prediction, showSMA, showVolume, isIntraday, activeRange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleResetZoom();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetZoom, toggleFullscreen]);

  // Tooltip position calculation to keep it within bounds
  const getTooltipStyle = () => {
    if (!chartContainerRef.current) return { left: tooltip.x + 20, top: tooltip.y - 10 };
    const containerWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = 240;
    
    let left = tooltip.x + 20;
    let top = tooltip.y - 10;
    
    if (left + tooltipWidth > containerWidth) {
      left = tooltip.x - tooltipWidth - 20;
    }
    if (top < 60) {
      top = 60;
    }
    if (top + 200 > chartHeight) {
      top = chartHeight - 220;
    }
    
    return { left, top };
  };

  return (
    <div ref={fullscreenRef} className={`relative group w-full h-full ${isFullscreen ? 'bg-[#050508]' : 'bg-black/20'}`} role="region" aria-label="Financial price chart">
        
        {/* === LOADING INDICATOR === */}
        {(isLoading || isPending) && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-black/80 border border-white/10 shadow-2xl">
              <div className="w-4 h-4 border-2 border-white/10 border-t-matrix rounded-full animate-spin" />
              <span className="text-[11px] font-medium text-zinc-400">Loading {INTERVAL_LABELS[activeRange]} candles...</span>
            </div>
          </div>
        )}

        {/* === CHART TOOLBAR === */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            
            {/* LEFT: Time Range Selector */}
            <div className="flex items-center gap-1 pointer-events-auto">
                {(['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'ALL'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => applyTimeRange(range)}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                      activeRange === range
                        ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.06)]'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                    }`}
                    title={`Show ${range} of data (${INTERVAL_LABELS[range]} candles)`}
                  >
                    {range}
                  </button>
                ))}

                {/* Active interval indicator */}
                <div className="ml-2 px-2 py-1 rounded bg-white/5 border border-white/8">
                  <span className="text-[9px] font-mono text-zinc-500 tabular-nums">{INTERVAL_LABELS[activeRange]}</span>
                </div>

                {/* Separator */}
                <div className="w-px h-4 bg-white/10 mx-1.5" />

                {/* Zoom Controls */}
                <button
                  onClick={handleZoomIn}
                  className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all border border-transparent hover:border-white/10"
                  title="Zoom In (+)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all border border-transparent hover:border-white/10"
                  title="Zoom Out (-)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
                <button
                  onClick={handleResetZoom}
                  className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all border border-transparent hover:border-white/10"
                  title="Reset View (0)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    <polyline points="1 4 1 10 7 10"/>
                  </svg>
                </button>
            </div>

            {/* RIGHT: Toggle & Fullscreen Controls */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
                
                {/* Indicator Legend (Only in TACTICAL/QUANT) */}
                {(mode === 'TACTICAL' || mode === 'QUANT') && (
                  <>
                    <button
                      onClick={() => setShowSMA(s => !s)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-semibold tracking-wide transition-all border ${
                        showSMA 
                          ? 'text-indigo-400 bg-indigo-500/8 border-indigo-500/20' 
                          : 'text-zinc-600 border-transparent hover:text-zinc-400'
                      }`}
                      title="Toggle SMA overlays"
                    >
                      <span className="w-2 h-0.5 rounded-full bg-indigo-400/60 inline-block" />
                      SMA
                    </button>
                    <button
                      onClick={() => setShowVolume(v => !v)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-semibold tracking-wide transition-all border ${
                        showVolume 
                          ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20' 
                          : 'text-zinc-600 border-transparent hover:text-zinc-400'
                      }`}
                      title="Toggle volume bars"
                    >
                      <span className="w-2 h-2 rounded-sm bg-emerald-400/30 inline-block" />
                      Vol
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                  </>
                )}

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all border border-transparent hover:border-white/10"
                  title="Toggle Fullscreen (F)"
                >
                  {isFullscreen ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="4 14 10 14 10 20"/>
                      <polyline points="20 10 14 10 14 4"/>
                      <line x1="14" y1="10" x2="21" y2="3"/>
                      <line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="15 3 21 3 21 9"/>
                      <polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/>
                      <line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  )}
                </button>
            </div>
        </div>

        {/* === CHART CANVAS === */}
        <div 
            ref={chartContainerRef} 
            className="w-full" 
            style={{ height: chartHeight }}
            aria-hidden="true"
        />

        {/* === FLOATING TOOLTIP === */}
        {tooltip.visible && (
          <div 
            className="absolute z-50 pointer-events-none bg-[#0A0A0C]/95 backdrop-blur-xl border border-white/8 p-3.5 rounded-lg shadow-2xl shadow-black/50 transition-opacity duration-100"
            style={{ 
              ...getTooltipStyle(),
              minWidth: '220px'
            }}
          >
            <div className="text-[9px] font-mono text-zinc-400 mb-3 border-b border-white/5 pb-2 flex justify-between items-center">
                <span className="tracking-wide">{tooltip.time}</span>
                <span className={`font-bold ${tooltip.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tooltip.isPositive ? '▲' : '▼'} {tooltip.isPositive ? '+' : ''}{tooltip.changePercent}%
                </span>
            </div>
            <div className="space-y-1.5">
               {tooltip.opening_price && (
                 <div className="flex justify-between gap-6">
                    <span className="text-[9px] text-zinc-500">Open</span>
                    <span className="text-[11px] font-mono font-semibold text-zinc-300 tabular-nums">${tooltip.opening_price}</span>
                 </div>
               )}
               {tooltip.highest_price && (
                 <div className="flex justify-between gap-6">
                    <span className="text-[9px] text-zinc-500">High</span>
                    <span className="text-[10px] font-mono text-emerald-400/80 tabular-nums">${tooltip.highest_price}</span>
                 </div>
               )}
               {tooltip.lowest_price && (
                 <div className="flex justify-between gap-6">
                    <span className="text-[9px] text-zinc-500">Low</span>
                    <span className="text-[10px] font-mono text-rose-400/80 tabular-nums">${tooltip.lowest_price}</span>
                 </div>
               )}
               <div className="flex justify-between gap-6 pt-1 border-t border-white/5">
                  <span className="text-[9px] text-zinc-500">Close</span>
                  <span className="text-[12px] font-mono font-bold text-white tabular-nums">${tooltip.closing_price}</span>
               </div>
               {tooltip.volume && (
                 <div className="flex justify-between gap-6">
                    <span className="text-[9px] text-zinc-500">Volume</span>
                    <span className="text-[10px] font-mono font-medium text-zinc-300 tabular-nums">{tooltip.volume}</span>
                 </div>
               )}
               <div className="flex justify-between gap-6">
                  <span className="text-[9px] text-zinc-500">Change</span>
                  <span className={`text-[10px] font-mono font-bold tabular-nums ${tooltip.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tooltip.isPositive ? '+' : ''}{tooltip.change}
                  </span>
               </div>
            </div>
          </div>
        )}

        {/* === INDICATOR LEGEND (when SMA is active) === */}
        {showSMA && (mode === 'TACTICAL' || mode === 'QUANT') && (
          <div className="absolute top-12 left-4 z-20 flex items-center gap-4 opacity-50">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-indigo-400/60 inline-block" />
              <span className="text-[8px] font-mono text-indigo-400/60 tracking-wider">SMA 20</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-amber-400/50 inline-block" />
              <span className="text-[8px] font-mono text-amber-400/50 tracking-wider">SMA 50</span>
            </div>
          </div>
        )}
        
        {/* === OPTIC MODE SELECTOR === */}
        <div className="absolute bottom-16 left-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0 z-20">
           {(['Simple', 'Tactical', 'Advanced'] as string[]).map((label, idx) => {
              const modes = ['ZEN', 'TACTICAL', 'QUANT'] as OpticMode[];
              const m = modes[idx];
              return (
                <button 
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg border transition-all text-[10px] font-semibold backdrop-blur-xl shadow-lg ${
                    mode === m 
                    ? 'bg-matrix/15 text-matrix border-matrix/30 shadow-[0_0_20px_rgba(129,140,248,0.2)]' 
                    : 'bg-black/60 text-zinc-500 border-white/8 hover:border-white/20 hover:text-zinc-300'
                    }`}
                >
                    {label}
                </button>
              );
           })}
        </div>

        {/* === KEYBOARD HINTS (subtle, on hover) === */}
        <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-30 transition-opacity duration-700">
          <div className="flex items-center gap-3 text-[7px] font-mono text-zinc-500 tracking-wider">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/8 text-[6px]">+</kbd><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/8 text-[6px]">-</kbd> Zoom</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/8 text-[6px]">0</kbd> Reset</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/8 text-[6px]">F</kbd> Fullscreen</span>
          </div>
        </div>
    </div>
  );
};
