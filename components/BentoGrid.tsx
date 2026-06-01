"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { resolveCanvasColor } from "@/lib/chart-config";
import { fmt } from "@/lib/format";
import { useToast } from "@/components/providers/ToastProvider";

// SPARKLINE COMPONENT (High-Fidelity)
const Sparkline = ({ data, color, height = 30 }: { data: number[]; color: string; height?: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 120;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        ctx.clearRect(0, 0, width, height);

        ctx.beginPath();
        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 8) - 4;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        const colorValues = color.includes('var(') ? resolveCanvasColor(color) : color;
        const isHSL = color.includes('var(');
        const cv = typeof colorValues === 'string' ? colorValues.replace(/\s+/g, ', ') : colorValues;
        const strokeColor = isHSL ? `hsl(${cv})` : color;
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, [data, color, height]);

    return <canvas ref={canvasRef} style={{ width: "100%", height }} className="block opacity-100" />;
}

import { MarketSignal } from "@/lib/market-data";
import { useEducation, EducationCategory } from "@/components/providers/EducationProvider";

// Tooltip Component for Headers
function HeaderWithTooltip({ label, tooltip, align = 'left', insightKey, category = 'QUANT' }: { label: string; tooltip: string; align?: 'left' | 'right'; insightKey?: string; category?: EducationCategory }) {
  const { openEducation } = useEducation();
  return (
    <div 
      onClick={(e) => {
        if (insightKey) {
          e.stopPropagation();
          openEducation(insightKey, category);
        }
      }}
      className={`group relative flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'} cursor-help`}
    >
      <span className="border-b border-dashed border-zinc-700 hover:text-zinc-300 transition-colors pb-[1px]">{label}</span>
      <div className={`absolute bottom-full ${align === 'right' ? 'right-0' : 'left-0'} mb-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50`}>
        <div className="bg-zinc-900 border border-white/10 rounded-md shadow-2xl p-3 text-left">
          <p className="text-[11px] text-zinc-300 font-normal leading-relaxed whitespace-normal normal-case tracking-normal">
            {tooltip}
          </p>
          {insightKey && <span className="text-[8.5px] font-bold text-zinc-500 block mt-2 uppercase tracking-wide">Click to open calculator ↗</span>}
        </div>
        <div className={`absolute bottom-[-4px] ${align === 'right' ? 'right-4' : 'left-4'} w-2 h-2 bg-zinc-900 border-b border-r border-white/10 transform rotate-45`}></div>
      </div>
    </div>
  );
}const ALL_COLUMNS = [
  { id: "sector", label: "Sector" },
  { id: "price", label: "Price" },
  { id: "trend", label: "Trend (Sparkline)" },
  { id: "projection", label: "AI Projection" },
  { id: "forensics", label: "Forensic Alerts" },
  { id: "beta", label: "Beta" },
  { id: "alpha", label: "Alpha" },
  { id: "volatility", label: "Volatility" },
  { id: "quality", label: "Quality Score" },
  { id: "pe", label: "Forward P/E" },
  { id: "synthesis_pillars", label: "Synthesis Pillars" }
];

export const WatchlistGrid = ({ items, onRemoveAction }: { items: { signal: MarketSignal, alpha: boolean }[], onRemoveAction: (ticker: string) => void }) => {
    const { showToast } = useToast();
    const handleRemove = async (ticker: string) => {
        try {
            await onRemoveAction(ticker);
            showToast(`${ticker} removed from watchlist`, "success");
        } catch {
            showToast(`Failed to remove ${ticker}`, "error");
        }
    };

    const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y" | "ALL">("1M");
    const [forecastHorizon, setForecastHorizon] = useState<"4H" | "1D" | "3D" | "1W" | "1M">("1D");
    const [filter, setFilter] = useState("");
    
    // Sort and Preset states
    const [visibleColumns, setVisibleColumns] = useState<string[]>(["sector", "price", "trend", "projection", "forensics"]);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [viewMode, setViewMode] = useState<"GENERAL" | "RISK" | "VALUATION" | "SYNTHESIS">("GENERAL");
    const [sortField, setSortField] = useState<string | null>("conviction");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem("watchlist_visible_columns");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setVisibleColumns(parsed);
                    // Determine initial view mode based on loaded columns matching a preset
                    const colsStr = parsed.slice().sort().join(",");
                    if (colsStr === ["sector", "price", "trend", "projection", "forensics"].sort().join(",")) {
                        setViewMode("GENERAL");
                    } else if (colsStr === ["beta", "alpha", "volatility", "forensics"].sort().join(",")) {
                        setViewMode("RISK");
                    } else if (colsStr === ["sector", "price", "quality", "pe", "forensics"].sort().join(",")) {
                        setViewMode("VALUATION");
                    } else if (colsStr === ["synthesis_pillars", "projection", "forensics"].sort().join(",")) {
                        setViewMode("SYNTHESIS");
                    }
                }
            } catch {
                // Keep default
            }
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePresetChange = (mode: "GENERAL" | "RISK" | "VALUATION" | "SYNTHESIS") => {
        setViewMode(mode);
        let cols: string[] = [];
        if (mode === "GENERAL") {
            cols = ["sector", "price", "trend", "projection", "forensics"];
        } else if (mode === "RISK") {
            cols = ["beta", "alpha", "volatility", "forensics"];
        } else if (mode === "VALUATION") {
            cols = ["sector", "price", "quality", "pe", "forensics"];
        } else if (mode === "SYNTHESIS") {
            cols = ["synthesis_pillars", "projection", "forensics"];
        }
        setVisibleColumns(cols);
        localStorage.setItem("watchlist_visible_columns", JSON.stringify(cols));
        setSortField(
            mode === "GENERAL" ? "conviction" : 
            mode === "RISK" ? "beta" : 
            mode === "VALUATION" ? "quality" : "conviction"
        );
        setSortDirection("desc");
    };

    const filteredItems = items.filter(item => 
      item.signal.ticker.toLowerCase().includes(filter.toLowerCase()) || 
      (item.signal.companyName || '').toLowerCase().includes(filter.toLowerCase()) ||
      (item.signal.sector || '').toLowerCase().includes(filter.toLowerCase())
    );

    const getSortValue = (item: { signal: MarketSignal, alpha: boolean }, field: string) => {
      const s = item.signal;
      switch (field) {
        case "ticker": return s.ticker;
        case "sector": return s.sector || "";
        case "price": return s.price || 0;
        case "change": {
          const sliceLength = range === "ALL" ? 2500 : 
                              range === "5Y" ? 1260 : 
                              range === "2Y" ? 504 : 
                              range === "1Y" ? 252 : 
                              range === "6M" ? 126 : 
                              range === "3M" ? 63 : 21;
          const historySlice = s.history.slice(-sliceLength);
          if (historySlice.length > 0) {
            const startPrice = historySlice[0].close;
            return ((s.price - startPrice) / startPrice) * 100;
          }
          return s.changePercent ?? 0;
        }
        case "expected": {
          const forecast = forecastHorizon === "1D" && s.prediction 
            ? s.prediction 
            : s.multiHorizonPrediction?.[forecastHorizon];
          if (forecast && s.price) {
            return ((forecast.p50 - s.price) / s.price) * 100;
          }
          return -99999;
        }
        case "forensics": return s.forensicAlerts?.length || 0;
        case "conviction": return s.synthesis?.score || 0;
        
        // Risk view fields
        case "beta": return s.benchmark?.beta ?? 1.0;
        case "alpha": return s.benchmark?.alpha ?? 0.0;
        case "volatility": {
          if (s.history.length > 30) {
            return Math.sqrt(
              s.history.slice(-60).reduce((acc: number, h: any, i: number, arr: any[]) => {
                if (i === 0) return acc;
                const ret = Math.log(h.close / arr[i - 1].close);
                return acc + ret * ret;
              }, 0) / 59
            ) * Math.sqrt(252);
          }
          return 0.25;
        }
        
        // Valuation view fields
        case "pe": return s.forwardPE ?? 99999;
        case "quality": return s.quality?.score ?? 0;
        
        default: return 0;
      }
    };

    const sortedItems = [...filteredItems].sort((a, b) => {
      if (!sortField) return 0;
      const valA = getSortValue(a, sortField);
      const valB = getSortValue(b, sortField);
      
      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });

    const isEmpty = sortedItems.length === 0;

    const renderHeader = (label: string, field: string, widthClass: string, tooltip?: string, insightKey?: string, category: EducationCategory = "QUANT") => {
      const isSorted = sortField === field;
      return (
        <button 
          onClick={() => {
            if (sortField === field) {
              setSortDirection(d => d === "asc" ? "desc" : "asc");
            } else {
              setSortField(field);
              setSortDirection("desc");
            }
          }}
          className={`${widthClass} flex items-center gap-1.5 hover:text-white transition-colors text-left select-none cursor-pointer`}
          aria-label={`Sort by ${label} in ${isSorted && sortDirection === "desc" ? "ascending" : "descending"} order`}
        >
          {tooltip ? (
            <HeaderWithTooltip label={label} tooltip={tooltip} insightKey={insightKey} category={category} />
          ) : (
            <span>{label}</span>
          )}
          {isSorted && (
            <span className="text-[9px] font-mono font-bold text-zinc-400">
              {sortDirection === "asc" ? "▲" : "▼"}
            </span>
          )}
        </button>
      );
    };

    return (
        <div className="w-full bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden">
             {/* Header Tools */}
             <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <input 
                    type="text" 
                    placeholder="Filter by ticker, company, or sector..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full max-w-sm bg-black/40 border border-white/5 rounded px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/10 transition-colors"
                 />
                 
                 {/* Preset Toggles & Column Customizer */}
                 <div className="flex items-center gap-3">
                     <div className="flex items-center bg-black/30 border border-white/5 p-1 gap-1 rounded-lg">
                         {(["GENERAL", "RISK", "VALUATION", "SYNTHESIS"] as const).map(mode => (
                            <button
                              key={mode}
                              onClick={() => handlePresetChange(mode)}
                              className={`px-3 py-1 text-[9px] font-bold tracking-wider rounded transition-all uppercase cursor-pointer ${
                                viewMode === mode 
                                  ? "bg-zinc-800 text-white" 
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                              aria-label={`Switch to ${mode.toLowerCase()} metrics view`}
                            >
                              {mode === "GENERAL" ? "General" : mode === "RISK" ? "Risk" : mode === "VALUATION" ? "Valuation" : "Synthesis"}
                            </button>
                         ))}
                     </div>

                     {/* Columns Settings Dropdown */}
                     <div className="relative" ref={dropdownRef}>
                         <button
                           onClick={() => setShowColumnMenu(!showColumnMenu)}
                           className="px-3 py-1 text-[9px] font-bold tracking-wider rounded border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all uppercase cursor-pointer flex items-center gap-1.5 bg-black/20 h-[26px]"
                           aria-label="Customize columns"
                         >
                            Columns ⚙️
                         </button>
                         {showColumnMenu && (
                            <div className="absolute right-0 mt-2 w-52 bg-zinc-950 border border-white/10 rounded-lg shadow-2xl p-4 z-50 flex flex-col gap-2.5">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-1">Toggle Columns</span>
                                {ALL_COLUMNS.map(col => {
                                    const isChecked = visibleColumns.includes(col.id);
                                    return (
                                        <label key={col.id} className="flex items-center gap-2.5 text-[11px] font-medium text-zinc-300 hover:text-white cursor-pointer select-none py-0.5">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    const newCols = isChecked
                                                        ? visibleColumns.filter(id => id !== col.id)
                                                        : [...visibleColumns, col.id];
                                                    setVisibleColumns(newCols);
                                                    localStorage.setItem("watchlist_visible_columns", JSON.stringify(newCols));
                                                    setViewMode("GENERAL"); // Customize deviates from presets
                                                }}
                                                className="rounded bg-black/40 border-white/10 text-matrix/50 focus:ring-0 focus:ring-offset-0"
                                            />
                                            <span>{col.label}</span>
                                        </label>
                                    );
                                })}
                                <button
                                    onClick={() => {
                                        const defaultCols = ["sector", "price", "trend", "projection", "forensics"];
                                        setVisibleColumns(defaultCols);
                                        localStorage.setItem("watchlist_visible_columns", JSON.stringify(defaultCols));
                                        setViewMode("GENERAL");
                                    }}
                                    className="mt-2 text-center text-[9px] font-bold text-zinc-500 hover:text-zinc-300 uppercase py-1 border-t border-white/5 cursor-pointer"
                                >
                                    Reset View
                                </button>
                            </div>
                         )}
                     </div>
                 </div>
             </div>
 
             {/* Horizontal Scroll Wrapper */}
             <div className="w-full overflow-x-auto scrollbar-hide">
                   <div className="min-w-[850px]">
                        {/* Table Header */}
                        <div className="flex items-center px-6 py-3.5 border-b border-white/5 text-[10px] font-bold text-zinc-500 bg-white/[0.005] uppercase tracking-widest">
                           {renderHeader("Asset", "ticker", "w-[100px] shrink-0")}
                           
                           {visibleColumns.includes("sector") && renderHeader("Sector", "sector", "w-[100px] shrink-0 hidden md:block")}
                           {visibleColumns.includes("price") && renderHeader("Price", "price", "w-[100px] shrink-0")}
                           
                           {visibleColumns.includes("trend") && (
                               <div className="w-[150px] shrink-0 px-4 flex items-center gap-1.5 text-zinc-500">
                                   {renderHeader("Trend", "change", "", "Smoothed price action over the selected historical timeframe.", "ANNUALIZED_VOLATILITY")}
                                   <select
                                       value={range}
                                       onChange={(e) => setRange(e.target.value as any)}
                                       className="bg-black/40 border border-white/5 text-zinc-400 text-[10px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-white/10 cursor-pointer hover:text-white transition-colors"
                                   >
                                       <option value="1M" className="bg-zinc-950 text-zinc-300">1M</option>
                                       <option value="3M" className="bg-zinc-950 text-zinc-300">3M</option>
                                       <option value="6M" className="bg-zinc-950 text-zinc-300">6M</option>
                                       <option value="1Y" className="bg-zinc-950 text-zinc-300">1Y</option>
                                       <option value="2Y" className="bg-zinc-950 text-zinc-300">2Y</option>
                                       <option value="5Y" className="bg-zinc-950 text-zinc-300">5Y</option>
                                       <option value="ALL" className="bg-zinc-950 text-zinc-300">ALL</option>
                                   </select>
                               </div>
                           )}
                           
                           {visibleColumns.includes("projection") && (
                               <div className="flex-1 min-w-[150px] px-6 flex items-center gap-1.5 text-zinc-500">
                                   {renderHeader("Projection", "expected", "", "AI expected price path return and confidence envelopes (p10/p90) over the forecast horizon.", "MONTE_CARLO")}
                                   <select
                                       value={forecastHorizon}
                                       onChange={(e) => setForecastHorizon(e.target.value as any)}
                                       className="bg-black/40 border border-white/5 text-zinc-400 text-[10px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-white/10 cursor-pointer hover:text-white transition-colors"
                                   >
                                       <option value="4H" className="bg-zinc-950 text-zinc-300">4H</option>
                                       <option value="1D" className="bg-zinc-950 text-zinc-300">1D</option>
                                       <option value="3D" className="bg-zinc-950 text-zinc-300">3D</option>
                                       <option value="1W" className="bg-zinc-950 text-zinc-300">1W</option>
                                       <option value="1M" className="bg-zinc-950 text-zinc-300">1M</option>
                                   </select>
                                </div>
                           )}
                           
                           {visibleColumns.includes("forensics") && renderHeader("Forensics", "forensics", "w-[120px] shrink-0 px-4", "Active structural and divergence alerts detected by the Forensic Analyst.", "CONFLUENCE_SCORE")}
                           
                           {visibleColumns.includes("beta") && renderHeader("Beta", "beta", "w-[100px] shrink-0", "Sensitivity to systematic market moves (SPY).", "REGIME_BETA")}
                           {visibleColumns.includes("alpha") && renderHeader("Alpha", "alpha", "w-[100px] shrink-0", "Excess adjusted return generated by asset.", "JENSENS_ALPHA")}
                           {visibleColumns.includes("volatility") && renderHeader("Vol (1Y)", "volatility", "w-[150px] shrink-0 px-4", "Annualized historical asset price volatility.", "ANNUALIZED_VOLATILITY")}
                           
                           {visibleColumns.includes("quality") && renderHeader("Quality", "quality", "w-[150px] shrink-0 px-4", "QARP Score: profitability, solvency, and growth.", "PROFITABILITY", "FUNDAMENTAL")}
                           {visibleColumns.includes("pe") && renderHeader("Forward P/E", "pe", "flex-1 min-w-[150px] px-6", "Forward Price to Earnings multiple.", "PE_RATIO", "FUNDAMENTAL")}
                           
                           {visibleColumns.includes("synthesis_pillars") && renderHeader("Pillars", "conviction", "w-[150px] shrink-0 px-4", "Visual breakdown of Technical, Fundamental, and Sentiment rating vectors.", "CONFLUENCE_SCORE")}
                           
                           {renderHeader("Conviction", "conviction", "w-[100px] shrink-0 pr-6 text-right", "Weighted multi-factor score (0-100) and directional signal.", "CONFLUENCE_SCORE")}
                           <div className="w-10 shrink-0"></div>
                        </div>
 
                        {isEmpty ? (
                            <div className="py-32 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-12 h-12 border border-white/10 flex items-center justify-center mb-6 rounded-lg">
                                   <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                                </div>
                                <h3 className="text-sm font-semibold text-white mb-2 tracking-wide">No Matches</h3>
                                <p className="text-sm text-zinc-400 max-w-[220px] leading-relaxed">
                                    Could not find any assets matching your criteria.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-white/5">
                                 {sortedItems.map((item, i) => {
                                   return (
                                     <WatchlistItem 
                                       key={item.signal.ticker} 
                                       signal={item.signal}
                                       alpha={item.alpha}
                                       onRemove={() => handleRemove(item.signal.ticker)}
                                       range={range}
                                       forecastHorizon={forecastHorizon}
                                       visibleColumns={visibleColumns}
                                     />
                                   );
                                 })}
                            </div>
                        )}
                   </div>
             </div>
        </div>
    );
}

// WATCHLIST ROW ITEM
export interface WatchlistItemProps {
  signal: MarketSignal;
  onRemove?: () => void;
  alpha?: boolean;
  range?: "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y" | "ALL";
  forecastHorizon?: "4H" | "1D" | "3D" | "1W" | "1M";
  visibleColumns?: string[];
}

export function WatchlistItem({ signal, onRemove, alpha, range = "1M", forecastHorizon = "1D", visibleColumns = ["sector", "price", "trend", "projection", "forensics"] }: WatchlistItemProps) {
  // Dynamically compute cumulative return for the selected trend range
  const sliceLength = range === "ALL" ? 2500 : 
                      range === "5Y" ? 1260 : 
                      range === "2Y" ? 504 : 
                      range === "1Y" ? 252 : 
                      range === "6M" ? 126 : 
                      range === "3M" ? 63 : 21;
  const historySlice = signal.history.slice(-sliceLength);
  
  let change = 0;
  if (historySlice.length > 0) {
    const startPrice = historySlice[0].close;
    change = ((signal.price - startPrice) / startPrice) * 100;
  } else {
    change = signal.changePercent ?? 0;
  }
 
  const isBull = change >= 0;
  const color = isBull ? "hsl(var(--bull))" : "hsl(var(--bear))"; 
 
  // Retrieve selected forecast
  const forecast = forecastHorizon === "1D" && signal.prediction 
    ? signal.prediction 
    : signal.multiHorizonPrediction?.[forecastHorizon];
 
  let expectedPct: number | null = null;
  let p10Pct: number | null = null;
  let p90Pct: number | null = null;
  if (forecast && signal.price) {
    expectedPct = ((forecast.p50 - signal.price) / signal.price) * 100;
    p10Pct = ((forecast.p10 - signal.price) / signal.price) * 100;
    p90Pct = ((forecast.p90 - signal.price) / signal.price) * 100;
  }

  const fmtExpected = expectedPct !== null ? `${expectedPct >= 0 ? '+' : ''}${expectedPct.toFixed(2)}%` : "N/A";
  const fmtP10 = p10Pct !== null ? `${p10Pct >= 0 ? '+' : ''}${p10Pct.toFixed(1)}%` : "--";
  const fmtP90 = p90Pct !== null ? `${p90Pct >= 0 ? '+' : ''}${p90Pct.toFixed(1)}%` : "--";
 
  const realizedVol = signal.history.length > 30
    ? Math.sqrt(
        signal.history.slice(-60).reduce((acc, h, i, arr) => {
          if (i === 0) return acc;
          const ret = Math.log(h.close / arr[i - 1].close);
          return acc + ret * ret;
        }, 0) / 59
      ) * Math.sqrt(252)
    : 0.25;

  const techScore = signal.tech.confluenceScore;
  const fundScore = signal.quality?.score ?? 50;
  const sentScore = Math.round((signal.sentiment.score + 1) * 50);
 
  return (
      <div 
        className="group relative flex items-center px-6 py-2 min-h-[3.5rem] transition-all hover:bg-zinc-900/40"
      >
          <div className={`absolute left-0 top-0 bottom-0 w-[2px] opacity-0 transition-opacity group-hover:opacity-100 ${isBull ? 'bg-bull' : 'bg-bear'}`} aria-hidden="true"></div>
          
          <Link href={`/asset/${signal.ticker}`} className="flex flex-1 items-center min-w-0 h-full pl-2">
          {/* COL 1: ASSET */}
          <div className="w-[100px] flex flex-col shrink-0">
                <span className="text-[14px] font-bold text-white tracking-tight leading-none group-hover:text-zinc-300 transition-colors truncate">
                    {signal.ticker}
                </span>
                <span className="text-[11px] font-medium text-zinc-500 mt-1.5 truncate">
                    {signal.companyName || "Equities"}
                </span>
          </div>
 
          {/* VIEW DYNAMIC COLUMNS */}
          {visibleColumns.includes("sector") && (
            <div className="w-[100px] shrink-0 hidden md:flex flex-col justify-center">
                  <span className="text-[11px] font-medium text-zinc-400 truncate">
                      {signal.sector || "Unknown"}
                  </span>
            </div>
          )}

          {visibleColumns.includes("price") && (
            <div className="w-[100px] flex flex-col justify-center shrink-0">
                 <div className="font-mono text-[14px] font-medium text-white tabular-nums">
                     {fmt(signal.price)}
                 </div>
                 <div className="mt-1">
                     <span className={`inline-flex items-center text-[11px] font-medium font-mono px-1.5 py-0.5 rounded-sm tabular-nums ${isBull ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                         {isBull ? '+' : ''}{change.toFixed(2)}% <span className="opacity-50 text-[8px] ml-1 font-sans font-normal tracking-wide">{range}</span>
                     </span>
                 </div>
            </div>
          )}

          {visibleColumns.includes("trend") && (
            <div className="w-[150px] shrink-0 px-4 h-8 flex items-center" role="img">
                 <Sparkline 
                    data={signal.history.slice(-sliceLength).map(h => h.close)} 
                    color={color} 
                    height={32} 
                 />
            </div>
          )}

          {visibleColumns.includes("projection") && (
            <div className="flex-1 px-6 flex flex-col justify-center min-w-[150px]">
                 <div className="flex items-center gap-1.5">
                     <span className={`text-[12px] font-mono font-bold ${expectedPct !== null ? (expectedPct >= 0 ? 'text-bull' : 'text-bear') : 'text-zinc-500'}`}>
                         {fmtExpected}
                     </span>
                     <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-tighter">Expected</span>
                 </div>
                 <div className="flex items-center gap-2 mt-1 text-[9.5px] font-mono font-bold text-zinc-600">
                     <span className="flex items-center gap-0.5">
                        <span className="text-bear">p10:</span> {fmtP10}
                     </span>
                     <span className="w-px h-2.5 bg-white/5" />
                     <span className="flex items-center gap-0.5">
                        <span className="text-bull">p90:</span> {fmtP90}
                     </span>
                 </div>
            </div>
          )}

          {visibleColumns.includes("forensics") && (
            <div className="w-[120px] shrink-0 px-4 flex items-center">
                {signal.forensicAlerts && signal.forensicAlerts.length > 0 ? (
                  <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider ${
                    signal.forensicAlerts.some(a => a.severity === 'CRITICAL')
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : signal.forensicAlerts.some(a => a.severity === 'WARNING')
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    {signal.forensicAlerts.some(a => a.severity === 'CRITICAL') ? '⚠️ Critical' : signal.forensicAlerts.some(a => a.severity === 'WARNING') ? '⚡ Warning' : 'ℹ️ Notice'} ({signal.forensicAlerts.length})
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider bg-green-500/10 text-green-500 border-green-500/20">
                    ✓ Nominal
                  </span>
                )}
            </div>
          )}

          {visibleColumns.includes("beta") && (
            <div className="w-[100px] shrink-0 flex flex-col justify-center">
                  <span className="text-[12px] font-mono font-bold text-zinc-300">
                      {signal.benchmark?.beta ? signal.benchmark.beta.toFixed(2) : "1.00"}
                  </span>
            </div>
          )}

          {visibleColumns.includes("alpha") && (
            <div className="w-[100px] shrink-0 flex flex-col justify-center">
                 <span className={`text-[12px] font-mono font-bold ${
                   signal.benchmark?.alpha && signal.benchmark.alpha >= 0 ? 'text-bull' : 'text-bear'
                 }`}>
                     {signal.benchmark?.alpha ? `${signal.benchmark.alpha >= 0 ? '+' : ''}${signal.benchmark.alpha.toFixed(2)}%` : "0.00%"}
                 </span>
            </div>
          )}

          {visibleColumns.includes("volatility") && (
            <div className="w-[150px] shrink-0 px-4 flex flex-col justify-center">
                 <span className="text-[12px] font-mono font-bold text-zinc-300">
                     {(realizedVol * 100).toFixed(1)}%
                 </span>
            </div>
          )}

          {visibleColumns.includes("quality") && (
            <div className="w-[150px] shrink-0 px-4 flex flex-col justify-center">
                 <span className={`text-[12px] font-mono font-bold ${
                   signal.quality?.score && signal.quality.score > 75 ? 'text-bull' : 'text-zinc-300'
                 }`}>
                     {signal.quality?.score ? `${signal.quality.score}/100` : "N/A"}
                 </span>
            </div>
          )}

          {visibleColumns.includes("pe") && (
            <div className="flex-1 px-6 flex flex-col justify-center min-w-[150px]">
                 <div className="flex items-center gap-1.5">
                     <span className="text-[12px] font-mono font-bold text-zinc-300">
                         {signal.forwardPE ? `${signal.forwardPE.toFixed(1)}x` : "N/A"}
                     </span>
                     <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">FWD P/E</span>
                 </div>
            </div>
          )}

          {visibleColumns.includes("synthesis_pillars") && (
             <div className="group/pillar relative w-[150px] shrink-0 px-4 flex flex-col justify-center cursor-help">
               <div className="flex flex-col gap-1 justify-center py-1">
                 <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 font-mono tracking-wide">
                   <span>T: {techScore}</span>
                   <span>F: {fundScore}</span>
                   <span>S: {sentScore}</span>
                 </div>
                 <div className="flex gap-1 h-1.5 w-full">
                   <div className="flex-1 bg-zinc-800 rounded-sm overflow-hidden h-full">
                     <div className="bg-blue-500 h-full" style={{ width: `${techScore}%` }} />
                   </div>
                   <div className="flex-1 bg-zinc-800 rounded-sm overflow-hidden h-full">
                     <div className="bg-green-500 h-full" style={{ width: `${fundScore}%` }} />
                   </div>
                   <div className="flex-1 bg-zinc-800 rounded-sm overflow-hidden h-full">
                     <div className="bg-amber-500 h-full" style={{ width: `${sentScore}%` }} />
                   </div>
                 </div>
               </div>
               
               {/* Tooltip Content */}
               <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 opacity-0 invisible group-hover/pillar:opacity-100 group-hover/pillar:visible transition-all duration-200 z-50">
                 <div className="bg-zinc-950 border border-white/10 rounded-lg shadow-2xl p-4 text-left space-y-3">
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-1.5 block">Synthesis Pillars</span>
                   <div className="space-y-2 text-[11px]">
                     <div className="flex items-center justify-between">
                       <span className="text-zinc-500 font-bold">TECHNICAL CONFLUENCE:</span>
                       <span className="font-mono font-bold text-blue-400">{techScore}/100</span>
                     </div>
                     <div className="w-full bg-zinc-900 h-1 rounded-sm overflow-hidden">
                       <div className="bg-blue-500 h-full" style={{ width: `${techScore}%` }} />
                     </div>
                     
                     <div className="flex items-center justify-between mt-1">
                       <span className="text-zinc-500 font-bold">FUNDAMENTAL QUALITY:</span>
                       <span className="font-mono font-bold text-green-400">{fundScore}/100</span>
                     </div>
                     <div className="w-full bg-zinc-900 h-1 rounded-sm overflow-hidden">
                       <div className="bg-green-500 h-full" style={{ width: `${fundScore}%` }} />
                     </div>
                     
                     <div className="flex items-center justify-between mt-1">
                       <span className="text-zinc-500 font-bold">SENTIMENT VECTOR:</span>
                       <span className="font-mono font-bold text-amber-400">{sentScore}/100</span>
                     </div>
                     <div className="w-full bg-zinc-900 h-1 rounded-sm overflow-hidden">
                       <div className="bg-amber-500 h-full" style={{ width: `${sentScore}%` }} />
                     </div>
                   </div>
                   <p className="text-[9px] text-zinc-500 leading-normal border-t border-white/5 pt-2 mt-2">
                     Primary Driver: {signal.synthesis.primaryDriver || "Balanced Multi-Factor Assessment"}
                   </p>
                 </div>
                 <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-zinc-950 border-b border-r border-white/10 rotate-45"></div>
               </div>
             </div>
          )}

          {/* COL 7: CONVICTION */}
          <div className="w-[100px] shrink-0 flex flex-col items-end justify-center pr-6">
              <span className={`text-[11px] font-bold tracking-wider uppercase mb-1 ${
                  signal.synthesis.signal.includes('BUY') ? 'text-green-500' : 
                  signal.synthesis.signal.includes('SELL') ? 'text-red-500' : 
                  'text-zinc-500'
              }`}>
                  {signal.synthesis.signal}
              </span>
              <span className="text-[10px] font-medium text-zinc-500 font-mono">
                  {signal.synthesis.score}/100
              </span>
          </div>
          </Link>

          {/* COL 8: REMOVE */}
          <div className="w-10 shrink-0 flex items-center justify-end relative z-10">
              <button 
                 onClick={(e: React.MouseEvent) => {
                     e.preventDefault();
                     e.stopPropagation();
                     onRemove?.();
                 }}
                 className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                 aria-label="Untrack Asset"
              >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
              </button>
          </div>
      </div>
  );
}
