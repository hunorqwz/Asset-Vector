"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, IChartApi, LineSeries, UTCTimestamp, CrosshairMode } from "lightweight-charts";
import { ComparisonAsset } from "@/app/actions/compare";
import { CHART_COLORS } from "@/lib/chart-config";

interface CompareChartOverlayProps {
  assets: ComparisonAsset[];
}

const LINE_COLORS = ["#23d18b", "#38bdf8", "#a855f7", "#f97316"];

export function CompareChartOverlay({ assets }: CompareChartOverlayProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeRange, setTimeRange] = useState<"3M" | "6M" | "1Y" | "ALL">("1Y");

  // Filter histories to align times and compute normalized returns
  const chartSeriesData = useMemo(() => {
    if (assets.length === 0) return [];

    // Find the slice length
    const limit = timeRange === "3M" ? 63 : timeRange === "6M" ? 126 : timeRange === "1Y" ? 252 : 500;

    return assets.map((asset, assetIdx) => {
      const history = asset.signal.history;
      // Slice history to requested range
      const sliced = history.slice(-limit);
      if (sliced.length === 0) return { ticker: asset.ticker, data: [], color: LINE_COLORS[assetIdx % LINE_COLORS.length] };

      const basePrice = sliced[0].close;

      const normalizedData = sliced.map((bar) => {
        const pctReturn = basePrice > 0 ? ((bar.close - basePrice) / basePrice) * 100 : 0;
        return {
          time: bar.time as UTCTimestamp,
          value: pctReturn,
        };
      });

      return {
        ticker: asset.ticker,
        data: normalizedData,
        color: LINE_COLORS[assetIdx % LINE_COLORS.length],
      };
    });
  }, [assets, timeRange]);

  useEffect(() => {
    if (!chartContainerRef.current || chartSeriesData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#666",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
      grid: {
        vertLines: { color: CHART_COLORS.GRID_LINES },
        horzLines: { color: CHART_COLORS.GRID_LINES },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
      },
      timeScale: {
        borderVisible: false,
        rightOffset: 15,
        fixLeftEdge: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelBackgroundColor: "#111" },
        horzLine: { labelBackgroundColor: "#111" },
      },
    });

    chartRef.current = chart;

    // Add lines for each asset
    chartSeriesData.forEach((series) => {
      if (series.data.length === 0) return;
      const line = chart.addSeries(LineSeries, {
        color: series.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: series.ticker,
      });
      line.setData(series.data);
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartSeriesData]);

  return (
    <div className="glass-card border border-white/5 bg-black/40 backdrop-blur-md p-6 rounded-xl space-y-4">
      {/* Legend & Time Range Toggles */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-wrap gap-4">
        {/* Ticker Legends */}
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-1">Normalized Price Performance</span>
          {chartSeriesData.map((series) => (
            <div key={series.ticker} className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: series.color }} />
              <span className="text-white uppercase">{series.ticker}</span>
            </div>
          ))}
        </div>

        {/* Time Ranges */}
        <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
          {(["3M", "6M", "1Y", "ALL"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-[10px] font-bold tracking-widest rounded-md transition-all cursor-pointer ${
                timeRange === r ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
              aria-label={`Show ${r} performance timeframe`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full relative" />
    </div>
  );
}
