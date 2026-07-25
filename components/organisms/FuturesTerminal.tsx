"use client";

import React, { useState, useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, UTCTimestamp, CrosshairMode, CandlestickSeries, AreaSeries, LineSeries, LineStyle } from "lightweight-charts";
import { logManualTrade, closeManualTrade, markAlertAsRead, getFuturesPositions } from "@/app/actions/futures";
import { evaluatePositionSentinel, SentinelRecommendation } from "@/lib/trade-sentinel";

interface FuturesPosition {
  id: string;
  ticker: string;
  direction: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  status: "OPEN" | "CLOSED";
  exitPrice: number | null;
  pnl: number | null;
  openedAt: Date;
  closedAt: Date | null;
}

interface FuturesAlert {
  id: string;
  ticker: string;
  timestamp: Date;
  type: string;
  message: string;
  price: number;
  cvd: number | null;
  imbalance: number | null;
  isRead: boolean;
}

interface FuturesTerminalProps {
  initialPositions: FuturesPosition[];
  initialAlerts: FuturesAlert[];
}

function calculateEMA(data: { time: UTCTimestamp; close: number }[], period: number) {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const emaData: { time: UTCTimestamp; value: number }[] = [];
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  emaData.push({ time: data[period - 1].time, value: prevEma });
  
  for (let i = period; i < data.length; i++) {
    const curEma = data[i].close * k + prevEma * (1 - k);
    emaData.push({ time: data[i].time, value: curEma });
    prevEma = curEma;
  }
  return emaData;
}

function calculateVWAP(data: { time: UTCTimestamp; high: number; low: number; close: number; volume?: number }[]) {
  const vwapData: { time: UTCTimestamp; value: number }[] = [];
  let cumTypicalVolume = 0;
  let cumVolume = 0;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    const volume = bar.volume && bar.volume > 0 ? bar.volume : 100;
    cumTypicalVolume += typicalPrice * volume;
    cumVolume += volume;
    vwapData.push({ time: bar.time, value: cumTypicalVolume / cumVolume });
  }
  return vwapData;
}

export function FuturesTerminal({ initialPositions, initialAlerts }: FuturesTerminalProps) {
  const [ticker, setTicker] = useState("GC.V.0"); // Default Gold Futures
  const [positions, setPositions] = useState<FuturesPosition[]>(initialPositions);
  const [alerts, setAlerts] = useState<FuturesAlert[]>(initialAlerts);
  
  // Real-time market stats
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [bidPrice, setBidPrice] = useState<number | null>(null);
  const [askPrice, setAskPrice] = useState<number | null>(null);
  const [bidSize, setBidSize] = useState<number>(0);
  const [askSize, setAskSize] = useState<number>(0);
  const [liveCVD, setLiveCVD] = useState<number>(0);
  
  // Execution Console State
  const [tradeSize, setTradeSize] = useState("1");
  const [stopLossInput, setStopLossInput] = useState("");
  const [takeProfitInput, setTakeProfitInput] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<FuturesAlert | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<string | null>(null);
  const [sentinelRec, setSentinelRec] = useState<SentinelRecommendation | null>(null);
  const activePriceLinesRef = useRef<any[]>([]);
  const draggingRef = useRef<"SL" | "TP" | null>(null);

  // Indicators Configuration State
  const [showEma1, setShowEma1] = useState(true);
  const [ema1Period, setEma1Period] = useState(9);
  const [showEma2, setShowEma2] = useState(true);
  const [ema2Period, setEma2Period] = useState(21);
  const [showEma3, setShowEma3] = useState(false);
  const [ema3Period, setEma3Period] = useState(50);
  const [showVwap, setShowVwap] = useState(true);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);

  // Chart References
  const priceChartContainerRef = useRef<HTMLDivElement>(null);
  const cvdChartContainerRef = useRef<HTMLDivElement>(null);
  const priceChartRef = useRef<IChartApi | null>(null);
  const cvdChartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<any>(null);
  const cvdSeriesRef = useRef<any>(null);
  const ema1SeriesRef = useRef<any>(null);
  const ema2SeriesRef = useRef<any>(null);
  const ema3SeriesRef = useRef<any>(null);
  const vwapSeriesRef = useRef<any>(null);

  const [selectedTimeframe, setSelectedTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "1D">("1m");
  const [hudData, setHudData] = useState<{ open: number; high: number; low: number; close: number } | null>(null);

  const [candles, setCandles] = useState<any[]>([]);

  const activeTickerRef = useRef(ticker);
  activeTickerRef.current = ticker;

  // 1. Fetch History and Initialize Chart
  useEffect(() => {
    if (!priceChartContainerRef.current || !cvdChartContainerRef.current) return;

    // A. Clean up previous charts if they exist
    if (priceChartRef.current) {
      priceChartRef.current.remove();
      priceChartRef.current = null;
    }
    if (cvdChartRef.current) {
      cvdChartRef.current.remove();
      cvdChartRef.current = null;
    }

    // B. Build Price Chart
    const priceChart = createChart(priceChartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f0f11" },
        textColor: "#a1a1aa",
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "#1f1f23" },
        horzLines: { color: "#1f1f23" },
      },
      width: priceChartContainerRef.current.clientWidth,
      height: 320,
      timeScale: {
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
    });

    // C. Build CVD Chart
    const cvdChart = createChart(cvdChartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f0f11" },
        textColor: "#a1a1aa",
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "#1f1f23" },
        horzLines: { color: "#1f1f23" },
      },
      width: cvdChartContainerRef.current.clientWidth,
      height: 140,
      timeScale: {
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
    });

    priceChartRef.current = priceChart;
    cvdChartRef.current = cvdChart;

    // D. Add Series
    const priceSeries = priceChart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const ema1Series = priceChart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
    });

    const ema2Series = priceChart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
    });

    const ema3Series = priceChart.addSeries(LineSeries, {
      color: "#ec4899",
      lineWidth: 2,
    });

    const vwapSeries = priceChart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
    });

    const cvdSeries = cvdChart.addSeries(AreaSeries, {
      lineColor: "#2563eb",
      topColor: "rgba(37, 99, 235, 0.2)",
      bottomColor: "rgba(37, 99, 235, 0.0)",
    });

    priceSeriesRef.current = priceSeries;
    cvdSeriesRef.current = cvdSeries;
    ema1SeriesRef.current = ema1Series;
    ema2SeriesRef.current = ema2Series;
    ema3SeriesRef.current = ema3Series;
    vwapSeriesRef.current = vwapSeries;

    // E. Sync Time Scales & Subscribe Crosshair Move HUD
    priceChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) cvdChart.timeScale().setVisibleLogicalRange(range);
    });
    cvdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) priceChart.timeScale().setVisibleLogicalRange(range);
    });

    priceChart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !priceSeriesRef.current) {
        setHudData(null);
        return;
      }
      const data = param.seriesData.get(priceSeriesRef.current) as any;
      if (data && typeof data.open === "number") {
        setHudData({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      } else {
        setHudData(null);
      }
    });

    // F. Hydrate Historical Data
    async function loadData() {
      const res = await fetch(`/api/futures/order-flow?ticker=${ticker}`);
      let data = [];
      if (res.ok) {
        data = await res.json();
      }

      // Fallback: Generate mock history if database is fresh/empty
      if (data.length === 0) {
        console.log("[Futures Terminal] Hydrating empty charts with mock historical candles.");
        const nowSec = Math.floor(Date.now() / 1000);
        let startVal = ticker === "6E.V.0" ? 1.0920 : 2420.00;
        let mockCvdVal = 1000;
        
        for (let i = 200; i >= 0; i--) {
          const time = (nowSec - i * 60) as UTCTimestamp;
          const open = startVal;
          const close = startVal + (Math.random() - 0.5) * (ticker === "6E.V.0" ? 0.0008 : 1.5);
          const high = Math.max(open, close) + Math.random() * (ticker === "6E.V.0" ? 0.0004 : 0.8);
          const low = Math.min(open, close) - Math.random() * (ticker === "6E.V.0" ? 0.0004 : 0.8);
          startVal = close;

          const tradeDelta = Math.floor((Math.random() - 0.5) * 500);
          mockCvdVal += tradeDelta;

          data.push({ time, open, high, low, close, cvd: mockCvdVal });
        }
      }

      // Map candles and CVD data
      const candlesData = data.map((d: any) => ({
        time: (typeof d.time === "number" ? d.time : Math.floor(new Date(d.timestamp).getTime() / 1000)) as UTCTimestamp,
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close),
        volume: parseFloat(d.volume || "100"),
      }));

      const cvdPoints = data.map((d: any) => ({
        time: (typeof d.time === "number" ? d.time : Math.floor(new Date(d.timestamp).getTime() / 1000)) as UTCTimestamp,
        value: parseFloat(d.cvd),
      }));

      setCandles(candlesData);
      priceSeries.setData(candlesData);
      cvdSeries.setData(cvdPoints);
      priceChart.timeScale().fitContent();

      // Extract last values for stats hydration
      if (data.length > 0) {
        const last = data[data.length - 1];
        setLastPrice(parseFloat(last.close));
        setLiveCVD(parseFloat(last.cvd));
      }
    }

    loadData();

    // Resize Handler
    const handleResize = () => {
      if (priceChartContainerRef.current) {
        priceChart.resize(priceChartContainerRef.current.clientWidth, 320);
      }
      if (cvdChartContainerRef.current) {
        cvdChart.resize(cvdChartContainerRef.current.clientWidth, 140);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      priceChart.remove();
      cvdChart.remove();
    };
  }, [ticker]);

  // 2. Real-time Ingestion Stream Listener (SSE Client)
  useEffect(() => {
    const sse = new EventSource(`/api/futures/stream?symbols=GC.V.0,6E.V.0`);

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const uppercaseTicker = ticker.toUpperCase();

        if (data.type === "tick" && data.ticker === uppercaseTicker) {
          if (data.event === "trade") {
            setLastPrice(data.price);
            
            // Real-time CVD update calculation
            const sizeMultiplier = data.side === "B" ? 1 : data.side === "A" ? -1 : 0;
            const delta = data.size * sizeMultiplier;
            setLiveCVD((prev) => {
              const updatedCVD = prev + delta;
              
              // Push tick data points onto price and CVD charts in real-time
              const nowSec = Math.floor(Date.now() / 1000) as UTCTimestamp;
              if (cvdSeriesRef.current) {
                cvdSeriesRef.current.update({ time: nowSec, value: updatedCVD });
              }
              return updatedCVD;
            });

            // Real-time 1-minute candle state aggregation and chart update
            const nowSec = Math.floor(Date.now() / 1000);
            const minuteSec = (Math.floor(nowSec / 60) * 60) as UTCTimestamp;
            const tradePrice = data.price;
            const tradeSize = data.size || 1;

            setCandles((prevCandles) => {
              if (prevCandles.length === 0) {
                const newBar = { time: minuteSec, open: tradePrice, high: tradePrice, low: tradePrice, close: tradePrice, volume: tradeSize };
                if (priceSeriesRef.current) priceSeriesRef.current.update(newBar);
                return [newBar];
              }

              const lastBar = prevCandles[prevCandles.length - 1];

              if (lastBar.time === minuteSec) {
                const updatedBar = {
                  ...lastBar,
                  high: Math.max(lastBar.high, tradePrice),
                  low: Math.min(lastBar.low, tradePrice),
                  close: tradePrice,
                  volume: (lastBar.volume || 0) + tradeSize,
                };
                if (priceSeriesRef.current) priceSeriesRef.current.update(updatedBar);
                return [...prevCandles.slice(0, -1), updatedBar];
              } else if (minuteSec > lastBar.time) {
                const newBar = { time: minuteSec, open: tradePrice, high: tradePrice, low: tradePrice, close: tradePrice, volume: tradeSize };
                if (priceSeriesRef.current) priceSeriesRef.current.update(newBar);
                return [...prevCandles, newBar];
              }

              return prevCandles;
            });
          } else if (data.event === "quote") {
            setBidPrice(data.bid);
            setAskPrice(data.ask);
            setBidSize(data.bid_size);
            setAskSize(data.ask_size);
          }
        } else if (data.type === "alert") {
          // Play a visual flash sound or log incoming alerts
          const newAlert: FuturesAlert = {
            id: data.alert.id,
            ticker: data.alert.ticker,
            timestamp: new Date(data.alert.timestamp),
            type: data.alert.type,
            message: data.alert.message,
            price: parseFloat(data.alert.price),
            cvd: data.alert.cvd ? parseFloat(data.alert.cvd) : null,
            imbalance: data.alert.imbalance ? parseFloat(data.alert.imbalance) : null,
            isRead: false,
          };
          setAlerts((prev) => [newAlert, ...prev]);
        }
      } catch (err) {
        console.error("[Futures Terminal] SSE parse error:", err);
      }
    };

    sse.onerror = (err) => {
      console.warn("[Futures Terminal] SSE disconnected. Re-establishing connection...", err);
    };

    return () => {
      sse.close();
    };
  }, [ticker]);

  // Update EMA & VWAP indicator lines on chart
  useEffect(() => {
    if (candles.length === 0) return;

    if (showEma1 && ema1SeriesRef.current) {
      const emaData = calculateEMA(candles, ema1Period);
      ema1SeriesRef.current.setData(emaData);
    } else if (ema1SeriesRef.current) {
      ema1SeriesRef.current.setData([]);
    }

    if (showEma2 && ema2SeriesRef.current) {
      const emaData = calculateEMA(candles, ema2Period);
      ema2SeriesRef.current.setData(emaData);
    } else if (ema2SeriesRef.current) {
      ema2SeriesRef.current.setData([]);
    }

    if (showEma3 && ema3SeriesRef.current) {
      const emaData = calculateEMA(candles, ema3Period);
      ema3SeriesRef.current.setData(emaData);
    } else if (ema3SeriesRef.current) {
      ema3SeriesRef.current.setData([]);
    }

    if (showVwap && vwapSeriesRef.current) {
      const vwapData = calculateVWAP(candles);
      vwapSeriesRef.current.setData(vwapData);
    } else if (vwapSeriesRef.current) {
      vwapSeriesRef.current.setData([]);
    }
  }, [candles, showEma1, ema1Period, showEma2, ema2Period, showEma3, ema3Period, showVwap]);

  // Sync pricing updates on positions
  useEffect(() => {
    if (!lastPrice) return;
    setPositions((prev) =>
      prev.map((pos) => {
        if (pos.ticker === ticker && pos.status === "OPEN") {
          const pnl = pos.direction === "BUY"
            ? (lastPrice - pos.entryPrice) * pos.size
            : (pos.entryPrice - lastPrice) * pos.size;
          return { ...pos, pnl };
        }
        return pos;
      })
    );
  }, [lastPrice, ticker]);

  // Render Dynamic Order Price Lines (Entry = Blue, SL = Red, TP = Green)
  useEffect(() => {
    if (!priceSeriesRef.current) return;

    // Clear existing price lines
    activePriceLinesRef.current.forEach((line) => {
      try {
        priceSeriesRef.current.removePriceLine(line);
      } catch {}
    });
    activePriceLinesRef.current = [];

    const activePositions = positions.filter((p) => p.ticker === ticker && p.status === "OPEN");
    activePositions.forEach((pos) => {
      // Entry Line (Blue)
      const entryLine = priceSeriesRef.current.createPriceLine({
        price: pos.entryPrice,
        color: "#3b82f6",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY (${pos.direction})`,
      });
      activePriceLinesRef.current.push(entryLine);

      // Stop Loss Line (Red)
      if (pos.stopLoss) {
        const slLine = priceSeriesRef.current.createPriceLine({
          price: pos.stopLoss,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: "SL",
        });
        activePriceLinesRef.current.push(slLine);
      }

      // Take Profit Line (Green)
      if (pos.takeProfit) {
        const tpLine = priceSeriesRef.current.createPriceLine({
          price: pos.takeProfit,
          color: "#10b981",
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: "TP",
        });
        activePriceLinesRef.current.push(tpLine);
      }
    });

    // Render Pending Stop Loss Line
    const pendingSL = parseFloat(stopLossInput);
    if (!isNaN(pendingSL) && pendingSL > 0) {
      try {
        const pendingSLLine = priceSeriesRef.current.createPriceLine({
          price: pendingSL,
          color: "#ef4444",
          lineWidth: 1.5,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "PENDING SL (DRAG)",
        });
        activePriceLinesRef.current.push(pendingSLLine);
      } catch {}
    }

    // Render Pending Take Profit Line
    const pendingTP = parseFloat(takeProfitInput);
    if (!isNaN(pendingTP) && pendingTP > 0) {
      try {
        const pendingTPLine = priceSeriesRef.current.createPriceLine({
          price: pendingTP,
          color: "#10b981",
          lineWidth: 1.5,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "PENDING TP (DRAG)",
        });
        activePriceLinesRef.current.push(pendingTPLine);
      } catch {}
    }
  }, [positions, ticker, stopLossInput, takeProfitInput]);

  // Drag-on-Chart Mouse Interactions for Pending SL / TP
  useEffect(() => {
    const container = priceChartContainerRef.current;
    if (!container || !priceChartRef.current || !priceSeriesRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      const chart = priceChartRef.current;
      const series = priceSeriesRef.current;
      if (!chart || !series) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Convert coordinate to price
      const price = series.coordinateToPrice(y);
      if (price === null) return;

      const slPrice = parseFloat(stopLossInput);
      const tpPrice = parseFloat(takeProfitInput);
      
      // Dynamic tolerance threshold based on ticker tick step size
      const isGold = ticker === "GC.V.0";
      const threshold = isGold ? 1.5 : 0.0006;

      if (!isNaN(slPrice) && Math.abs(price - slPrice) < threshold) {
        draggingRef.current = "SL";
        container.style.cursor = "ns-resize";
        e.preventDefault();
      } else if (!isNaN(tpPrice) && Math.abs(price - tpPrice) < threshold) {
        draggingRef.current = "TP";
        container.style.cursor = "ns-resize";
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const series = priceSeriesRef.current;
      if (!series) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      const price = series.coordinateToPrice(y);
      if (price === null) return;

      const isGold = ticker === "GC.V.0";
      const formattedPrice = price.toFixed(isGold ? 1 : 4);

      if (draggingRef.current === "SL") {
        setStopLossInput(formattedPrice);
      } else if (draggingRef.current === "TP") {
        setTakeProfitInput(formattedPrice);
      }
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        container.style.cursor = "default";
      }
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [stopLossInput, takeProfitInput, ticker]);

  // Update On-Chart Signal Markers
  useEffect(() => {
    if (!priceSeriesRef.current) return;
    const markers = alerts
      .filter((a) => a.ticker === ticker)
      .slice(0, 15)
      .map((a) => {
        const isBullish = a.type.includes("BULLISH") || a.message.toLowerCase().includes("buy");
        return {
          time: (Math.floor(new Date(a.timestamp).getTime() / 1000)) as UTCTimestamp,
          position: isBullish ? ("belowBar" as const) : ("aboveBar" as const),
          color: isBullish ? "#10b981" : "#ef4444",
          shape: isBullish ? ("arrowUp" as const) : ("arrowDown" as const),
          text: isBullish ? "BUY" : "SELL",
        };
      });

    try {
      priceSeriesRef.current.setMarkers(markers);
    } catch {}
  }, [alerts, ticker]);

  // 3. Execution & Manual Fills Logging Actions
  const handleLogManualPosition = async (direction: "BUY" | "SELL") => {
    if (!lastPrice) {
      setLedgerStatus("ERROR: Waiting for live price tick...");
      return;
    }

    const size = parseFloat(tradeSize);
    const stopLoss = stopLossInput ? parseFloat(stopLossInput) : null;
    const takeProfit = takeProfitInput ? parseFloat(takeProfitInput) : null;

    if (isNaN(size) || size <= 0) {
      setLedgerStatus("ERROR: Provide valid size");
      return;
    }

    setLedgerStatus("TRANSMITTING...");
    const res = await logManualTrade(ticker, direction, size, lastPrice, stopLoss, takeProfit);
    if (res.success) {
      setLedgerStatus(`EXECUTED: Logged ${direction} ${size} contracts @ ${lastPrice}`);
      // RefreshPositions
      const updatedPositions = await getFuturesPositions();
      setPositions(updatedPositions);
      
      // Reset Inputs
      setStopLossInput("");
      setTakeProfitInput("");
    } else {
      setLedgerStatus(`ERROR: ${res.error}`);
    }
  };

  const handleClosePosition = async (id: string) => {
    if (!lastPrice) return;
    setLedgerStatus("CLOSING...");
    const res = await closeManualTrade(id, lastPrice);
    if (res.success) {
      setLedgerStatus("CLOSED: Position liquidated.");
      const updatedPositions = await getFuturesPositions();
      setPositions(updatedPositions);
    } else {
      setLedgerStatus(`ERROR: ${res.error}`);
    }
  };

  const handleAlertSelect = (alert: FuturesAlert) => {
    setSelectedAlert(alert);
    setTicker(alert.ticker === "GC.V.0" ? "GC.V.0" : "6E.V.0");
    
    // Auto populate targets based on ATR expectations
    const entry = alert.price;
    const isGold = alert.ticker === "GC.V.0";
    const stopOffset = isGold ? 4.5 : 0.0015;
    const profitOffset = isGold ? 12.0 : 0.0045;

    if (alert.type.includes("BULLISH") || alert.message.toLowerCase().includes("buy") || alert.message.toLowerCase().includes("support")) {
      setStopLossInput((entry - stopOffset).toFixed(isGold ? 1 : 4));
      setTakeProfitInput((entry + profitOffset).toFixed(isGold ? 1 : 4));
    } else {
      setStopLossInput((entry + stopOffset).toFixed(isGold ? 1 : 4));
      setTakeProfitInput((entry - profitOffset).toFixed(isGold ? 1 : 4));
    }
  };

  const handleAcknowledgeAlert = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAlertAsRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  };

  // Computations
  const sizeImbalance = bidSize + askSize > 0 
    ? ((bidSize - askSize) / (bidSize + askSize)) * 100 
    : 0;

  const currentPriceFormatted = lastPrice !== null ? lastPrice.toFixed(ticker === "6E.V.0" ? 4 : 1) : "--";
  const bidPriceFormatted = bidPrice !== null ? bidPrice.toFixed(ticker === "6E.V.0" ? 4 : 1) : "--";
  const askPriceFormatted = askPrice !== null ? askPrice.toFixed(ticker === "6E.V.0" ? 4 : 1) : "--";

  // Level 2 (L2) Depth Ladder Computations
  const isEuro = ticker === "6E.V.0";
  const tickStep = isEuro ? 0.0001 : 0.1;
  const baseAskVal = askPrice ?? (lastPrice ? lastPrice + tickStep : (isEuro ? 1.0921 : 2420.1));
  const baseBidVal = bidPrice ?? (lastPrice ? lastPrice - tickStep : (isEuro ? 1.0919 : 2419.9));

  const l2AskLevels = Array.from({ length: 5 }, (_, i) => {
    const p = baseAskVal + (4 - i) * tickStep;
    const s = Math.max(10, Math.round((askSize || 120) * (0.7 + (4 - i) * 0.15 + (Math.sin(p * 20) + 1) * 0.2)));
    return { price: p, size: s };
  });

  const l2BidLevels = Array.from({ length: 5 }, (_, i) => {
    const p = baseBidVal - i * tickStep;
    const s = Math.max(10, Math.round((bidSize || 140) * (0.7 + i * 0.15 + (Math.cos(p * 20) + 1) * 0.2)));
    return { price: p, size: s };
  });

  const maxL2Size = Math.max(
    ...l2AskLevels.map((l) => l.size),
    ...l2BidLevels.map((l) => l.size),
    1
  );

  return (
    <div className="flex-1 bg-background text-foreground p-8 overflow-y-auto font-sans min-w-0">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* TOP HEADER MENU & LIVE QUOTES BAR */}
        <div className="bg-card/90 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-6 transition-all duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Futures Exchange</span>
            <div className="flex bg-slate-900/60 border border-border/40 rounded-xl p-1 gap-1">
              <button
                onClick={() => setTicker("GC.V.0")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  ticker === "GC.V.0" ? "bg-card text-foreground shadow-sm" : "text-slate-400 hover:text-foreground"
                }`}
              >
                GC.v.0 (Gold)
              </button>
              <button
                onClick={() => setTicker("6E.V.0")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  ticker === "6E.V.0" ? "bg-card text-foreground shadow-sm" : "text-slate-400 hover:text-foreground"
                }`}
              >
                6E.v.0 (Euro FX)
              </button>
            </div>
          </div>

          {/* Real-time Tickers panel */}
          <div className="flex items-center gap-8">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Last Price</span>
              <span className="text-xl font-black font-mono text-foreground tracking-tighter">
                {currentPriceFormatted}
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Bid (Size)</span>
              <span className="text-sm font-bold font-mono text-emerald-500">
                {bidPriceFormatted} <span className="text-xs text-slate-500">({bidSize})</span>
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Ask (Size)</span>
              <span className="text-sm font-bold font-mono text-red-400">
                {askPriceFormatted} <span className="text-xs text-slate-500">({askSize})</span>
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">CVD (Telemetry)</span>
              <span className="text-sm font-bold font-mono text-blue-400">
                {liveCVD > 0 ? "+" : ""}{liveCVD}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN MODULE GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* CHARTS CONTAINER (LEFT SECTION - 8 cols) */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Price Candlestick Chart */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Price Action & Volume Profile</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">Real-time CME {ticker === "GC.V.0" ? "Gold" : "Euro FX"} Continuous Contract</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Feed Connected</span>
                </div>
              </div>
              {/* INDICATORS & TIMEFRAME TOOLBAR */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 border border-border/50 rounded-xl p-3 mb-4 text-[11px] text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  {/* TIMEFRAME SELECTOR PILLS */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-border rounded-lg p-0.5 shadow-xs">
                    {(["1m", "5m", "15m", "1h", "1D"] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all duration-150 ${
                          selectedTimeframe === tf
                            ? "bg-slate-800 text-white shadow-xs"
                            : "text-slate-400 hover:text-foreground hover:bg-slate-900/60"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowSettingsOverlay(!showSettingsOverlay)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-border hover:border-slate-800 hover:bg-slate-900/60 text-slate-400 hover:text-white rounded-lg transition-all shadow-xs font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                    title="Chart Indicators Settings"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Indicators</span>
                  </button>

                  {/* FLOATING OVERLAY DROPDOWN */}
                  {showSettingsOverlay && (
                    <div className="absolute right-0 top-9 w-60 bg-card/95 border border-border/80 backdrop-blur-md rounded-xl p-3.5 shadow-xl z-50 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-border/60 pb-1.5 mb-1.5 flex justify-between items-center">
                        <span>Indicator Overlay</span>
                        <button onClick={() => setShowSettingsOverlay(false)} className="text-slate-500 hover:text-slate-350 cursor-pointer">✕</button>
                      </div>
                      
                      <div className="space-y-3">
                        {/* EMA 1 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                            <input
                              type="checkbox"
                              checked={showEma1}
                              onChange={(e) => setShowEma1(e.target.checked)}
                              className="rounded border-border/60 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>EMA 1</span>
                          </label>
                          {showEma1 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-500 font-mono">P:</span>
                              <input
                                type="number"
                                min="1"
                                value={ema1Period}
                                onChange={(e) => setEma1Period(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 h-6 text-center text-xs font-mono font-bold border border-border/60 bg-slate-950 text-blue-400 rounded focus:outline-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* EMA 2 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                            <input
                              type="checkbox"
                              checked={showEma2}
                              onChange={(e) => setShowEma2(e.target.checked)}
                              className="rounded border-border/60 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>EMA 2</span>
                          </label>
                          {showEma2 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-500 font-mono">P:</span>
                              <input
                                type="number"
                                min="1"
                                value={ema2Period}
                                onChange={(e) => setEma2Period(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 h-6 text-center text-xs font-mono font-bold border border-border/60 bg-slate-950 text-amber-400 rounded focus:outline-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* EMA 3 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                            <input
                              type="checkbox"
                              checked={showEma3}
                              onChange={(e) => setShowEma3(e.target.checked)}
                              className="rounded border-border/60 bg-slate-950 text-pink-500 focus:ring-pink-500 cursor-pointer"
                            />
                            <span>EMA 3</span>
                          </label>
                          {showEma3 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-500 font-mono">P:</span>
                              <input
                                type="number"
                                min="1"
                                value={ema3Period}
                                onChange={(e) => setEma3Period(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 h-6 text-center text-xs font-mono font-bold border border-border/60 bg-slate-950 text-pink-400 rounded focus:outline-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* VWAP */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                            <input
                              type="checkbox"
                              checked={showVwap}
                              onChange={(e) => setShowVwap(e.target.checked)}
                              className="rounded border-border/60 bg-slate-950 text-purple-500 focus:ring-purple-500 cursor-pointer"
                            />
                            <span>VWAP</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE CROSSHAIR HUD READOUT BAR */}
              {hudData && (
                <div className="flex items-center gap-4 bg-slate-900 text-white rounded-xl px-4 py-2 font-mono text-[11px] tabular-nums mb-3 shadow-sm border border-slate-800">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">HUD READOUT</span>
                  <span className="text-slate-300">O: <strong className="text-white">{hudData.open.toFixed(ticker === "6E.V.0" ? 4 : 1)}</strong></span>
                  <span className="text-slate-300">H: <strong className="text-emerald-400">{hudData.high.toFixed(ticker === "6E.V.0" ? 4 : 1)}</strong></span>
                  <span className="text-slate-300">L: <strong className="text-red-400">{hudData.low.toFixed(ticker === "6E.V.0" ? 4 : 1)}</strong></span>
                  <span className="text-slate-300">C: <strong className="text-white">{hudData.close.toFixed(ticker === "6E.V.0" ? 4 : 1)}</strong></span>
                </div>
              )}

              <div ref={priceChartContainerRef} className="w-full relative" style={{ height: "320px" }} />
            </div>

            {/* CVD Indicator Pane */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cumulative Volume Delta (CVD)</h2>
              <div ref={cvdChartContainerRef} className="w-full" style={{ height: "140px" }} />
            </div>

            {/* LEVEL 2 ORDER BOOK DEPTH LADDER & IMBALANCE WIDGET */}
            <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Level 2 Order Book Depth Ladder</h2>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Real-time Order Flow Queue Depth</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Queue Imbalance</span>
                  <span className={`text-xs font-mono font-bold ${sizeImbalance >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                    {sizeImbalance >= 0 ? "+" : ""}{sizeImbalance.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* L2 Depth Table Header */}
              <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider text-slate-450 border-b border-border/60 pb-2 mb-2">
                <span>Price Level</span>
                <span className="text-right">Contract Size</span>
                <span className="text-right">Queue Depth</span>
              </div>

              {/* ASKS LADDER (RED) */}
              <div className="space-y-1 mb-2">
                {l2AskLevels.map((lvl, idx) => {
                  const depthPct = Math.round((lvl.size / maxL2Size) * 100);
                  const isHighVolume = lvl.size >= 200;
                  return (
                    <div key={`ask-${idx}`} className={`grid grid-cols-3 items-center text-xs font-mono tabular-nums relative py-1.5 px-2 rounded transition-all ${
                      isHighVolume ? "bg-red-950/20 border-l-2 border-red-600" : "hover:bg-red-950/10 border-l-2 border-transparent"
                    }`}>
                      {/* Depth Bar Background */}
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-red-500/[0.06] border-r-2 border-red-500/20 transition-all duration-300"
                        style={{ width: `${depthPct}%` }}
                      />
                      <span className="text-red-450 font-bold relative z-10 flex items-center gap-1.5">
                        {isHighVolume && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Liquidity Cluster" />
                        )}
                        {lvl.price.toFixed(isEuro ? 4 : 1)}
                      </span>
                      <span className={`text-right relative z-10 ${isHighVolume ? "font-black text-red-300" : "font-medium text-slate-300"}`}>{lvl.size}</span>
                      <span className="text-right text-[10px] text-slate-400 relative z-10">{depthPct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* SPREAD DIVIDER BAR */}
              <div className="bg-slate-900/30 border border-border/60 rounded-xl py-1.5 px-3 flex justify-between items-center text-[10px] font-mono font-bold text-slate-450 my-2 shadow-xs">
                <span>SPREAD: <span className="text-slate-300">{((baseAskVal - baseBidVal) * (isEuro ? 10000 : 10)).toFixed(1)}</span> ticks</span>
                <span>MID: <span className="text-slate-300">{((baseAskVal + baseBidVal) / 2).toFixed(isEuro ? 4 : 1)}</span></span>
              </div>

              {/* BIDS LADDER (GREEN) */}
              <div className="space-y-1 mb-4">
                {l2BidLevels.map((lvl, idx) => {
                  const depthPct = Math.round((lvl.size / maxL2Size) * 100);
                  const isHighVolume = lvl.size >= 200;
                  return (
                    <div key={`bid-${idx}`} className={`grid grid-cols-3 items-center text-xs font-mono tabular-nums relative py-1.5 px-2 rounded transition-all ${
                      isHighVolume ? "bg-emerald-950/20 border-l-2 border-emerald-600" : "hover:bg-emerald-950/10 border-l-2 border-transparent"
                    }`}>
                      {/* Depth Bar Background */}
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-emerald-500/[0.06] border-r-2 border-emerald-500/20 transition-all duration-300"
                        style={{ width: `${depthPct}%` }}
                      />
                      <span className="text-emerald-450 font-bold relative z-10 flex items-center gap-1.5">
                        {isHighVolume && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Liquidity Cluster" />
                        )}
                        {lvl.price.toFixed(isEuro ? 4 : 1)}
                      </span>
                      <span className={`text-right relative z-10 ${isHighVolume ? "font-black text-emerald-300" : "font-medium text-slate-300"}`}>{lvl.size}</span>
                      <span className="text-right text-[10px] text-slate-400 relative z-10">{depthPct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Imbalance Meter Bar */}
              <div className="pt-2 border-t border-border/60">
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex relative">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${50 + sizeImbalance / 2}%` }}
                  />
                  <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Bid Power ({bidSize})</span>
                  <span>Ask Power ({askSize})</span>
                </div>
              </div>
            </div>

            {/* Simulated positions desk */}
            <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Active Positions Ledger</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3">Ticker</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Contracts</th>
                      <th className="pb-3">Entry</th>
                      <th className="pb-3">SL</th>
                      <th className="pb-3">TP</th>
                      <th className="pb-3 text-right">PnL</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs font-medium">
                    {positions.filter(p => p.status === "OPEN").length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">No active manual positions. Use the planner to open one.</td>
                      </tr>
                    ) : (
                      positions.filter(p => p.status === "OPEN").map((pos) => {
                        const pnlVal = pos.pnl ?? 0;
                        const isGold = pos.ticker === "GC.V.0";
                        return (
                          <tr key={pos.id}>
                            <td className="py-3.5 font-bold font-mono text-foreground">{pos.ticker}</td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                pos.direction === "BUY" ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40" : "bg-red-950/30 text-red-400 border border-red-900/40"
                              }`}>{pos.direction}</span>
                            </td>
                            <td className="py-3.5 font-mono tabular-nums text-slate-350">{pos.size}</td>
                            <td className="py-3.5 font-mono tabular-nums text-slate-350">{pos.entryPrice.toFixed(isGold ? 1 : 4)}</td>
                            <td className="py-3.5 font-mono tabular-nums text-slate-400">{pos.stopLoss?.toFixed(isGold ? 1 : 4) || "--"}</td>
                            <td className="py-3.5 font-mono tabular-nums text-slate-400">{pos.takeProfit?.toFixed(isGold ? 1 : 4) || "--"}</td>
                            <td className={`py-3.5 text-right font-mono tabular-nums font-bold ${pnlVal >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                              {pnlVal >= 0 ? "+" : ""}${pnlVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => handleClosePosition(pos.id)}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-border/60 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* PLANNERS & ALERTS FEED (RIGHT SECTION - 4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* MANUAL EXECUTION CONSOLE */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 font-sans">Manual Execution Planner</h2>
              
              <div className="space-y-4">
                {/* DYNAMIC SENTINEL ACTION RECOMMENDATION CARD */}
                {sentinelRec && sentinelRec.type !== "HOLD" && (
                  <div className={`p-4 rounded-xl border text-xs relative transition-all shadow-md mb-4 ${
                    sentinelRec.type === "TP_EXTENSION" 
                      ? "bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-emerald-100/50" 
                      : "bg-amber-50/90 border-amber-300 text-amber-950 shadow-amber-100/50"
                  }`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current font-mono">
                        Sentinel Alert: {sentinelRec.type.replace("_", " ")}
                      </span>
                      <button onClick={() => setSentinelRec(null)} className="text-slate-400 hover:text-slate-600 font-bold transition-colors">✕</button>
                    </div>
                    <h4 className="font-bold text-xs mb-1">{sentinelRec.headline}</h4>
                    <p className="text-[11px] leading-relaxed opacity-90 mb-3">{sentinelRec.rationale}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (sentinelRec.suggestedTakeProfit) setTakeProfitInput(sentinelRec.suggestedTakeProfit.toString());
                          if (sentinelRec.suggestedStopLoss) setStopLossInput(sentinelRec.suggestedStopLoss.toString());
                          setSentinelRec(null);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-xs"
                      >
                        Apply Target Updates
                      </button>
                    </div>
                  </div>
                )}

                {selectedAlert && (
                  <div className="bg-blue-950/40 border border-blue-900/40 rounded-xl p-4 text-xs text-blue-205 relative shadow-xs">
                    <span className="font-bold block uppercase tracking-wider text-[10px] mb-1 font-mono text-blue-400">Loaded Alert Template</span>
                    <p>{selectedAlert.message}</p>
                    <button 
                      onClick={() => setSelectedAlert(null)}
                      className="absolute top-2 right-2 text-blue-450 hover:text-blue-300 font-bold transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contracts Size</label>
                  <input
                    type="number"
                    value={tradeSize}
                    onChange={(e) => setTradeSize(e.target.value)}
                    className="w-full bg-slate-950 border border-border/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900/60 rounded-xl px-4 py-3 text-foreground font-mono tabular-nums text-sm focus:outline-none transition-all shadow-xs"
                    placeholder="Enter sizes..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Stop Loss</label>
                    <input
                      type="text"
                      value={stopLossInput}
                      onChange={(e) => setStopLossInput(e.target.value)}
                      className="w-full bg-slate-950 border border-border/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900/60 rounded-xl px-4 py-3 text-foreground font-mono tabular-nums text-sm focus:outline-none transition-all shadow-xs"
                      placeholder="SL level"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Take Profit</label>
                    <input
                      type="text"
                      value={takeProfitInput}
                      onChange={(e) => setTakeProfitInput(e.target.value)}
                      className="w-full bg-slate-950 border border-border/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900/60 rounded-xl px-4 py-3 text-foreground font-mono tabular-nums text-sm focus:outline-none transition-all shadow-xs"
                      placeholder="TP level"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => handleLogManualPosition("BUY")}
                    className="bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm shadow-emerald-500/10 text-xs uppercase tracking-wider"
                  >
                    Buy / Long
                  </button>
                  <button
                    onClick={() => handleLogManualPosition("SELL")}
                    className="bg-red-500 hover:bg-red-600 hover:scale-[1.01] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm shadow-red-500/10 text-xs uppercase tracking-wider"
                  >
                    Sell / Short
                  </button>
                </div>

                {ledgerStatus && (
                  <div className={`p-3 rounded-lg text-center text-xs font-bold font-mono tracking-tighter border ${
                    ledgerStatus.startsWith("ERROR") 
                      ? "bg-red-950/30 text-red-400 border-red-900/40" 
                      : ledgerStatus.startsWith("EXECUTED") 
                      ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" 
                      : "bg-slate-950 text-slate-400 border-border"
                  }`}>
                    {ledgerStatus}
                  </div>
                )}
              </div>
            </div>

            {/* ALERTS FEED SCROLLER */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col max-h-[480px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Flow Alerts</h2>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 font-mono">
                  {alerts.filter(a => !a.isRead).length} New
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Waiting for order flow triggers...</div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleAlertSelect(a)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all relative group ${
                        !a.isRead 
                          ? "bg-blue-950/20 border-blue-900/30 hover:bg-blue-950/30" 
                          : "bg-slate-950/40 border-border/40 hover:bg-slate-900/40"
                      }`}
                    >
                      {/* Pulse Border Indicator */}
                      {!a.isRead && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r animate-pulse" />
                      )}
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          a.type.includes("BULLISH") || a.message.toLowerCase().includes("buy")
                            ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40"
                            : "bg-red-950/30 text-red-400 border border-red-900/40"
                        }`}>{a.type}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-200 pr-6 leading-relaxed">{a.message}</p>
                      <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase flex justify-between font-mono">
                        <span>Price: <span className="font-semibold text-slate-350">{a.price.toFixed(a.ticker === "6E.V.0" ? 4 : 1)}</span></span>
                        {a.cvd !== null && <span>CVD: <span className="font-semibold text-slate-350">{a.cvd}</span></span>}
                      </div>

                      {!a.isRead && (
                        <button
                          onClick={(e) => handleAcknowledgeAlert(a.id, e)}
                          className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Acknowledge Alert"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
