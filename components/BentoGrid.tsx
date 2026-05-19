"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { resolveCanvasColor } from "@/lib/chart-config";
import { fmt, fmtPct } from "@/lib/format";

// 1. SPARKLINE COMPONENT (Ultra-Minimalist)
// 1. SPARKLINE COMPONENT (High-Fidelity)
const Sparkline = ({ data, color, height = 30 }: { data: number[]; color: string; height?: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Account for high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        const width = 140;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        ctx.clearRect(0, 0, width, height);
        
        // Gradient fill removed for institutional clarity

        // DRAW LINE
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 8) - 4;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        // Unified color resolution from the centralized Design Tokens
        const colorValues = color.includes('var(') ? resolveCanvasColor(color) : color;
        const isHSL = color.includes('var(');
        const cv = typeof colorValues === 'string' ? colorValues.replace(/\s+/g, ', ') : colorValues;
        const strokeColor = isHSL ? `hsl(${cv})` : color;
        
        ctx.strokeStyle = strokeColor; // Solid explicit color for institutional look
        ctx.lineWidth = 1.5; // Thinner, crisper line
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, [data, color, height]);

    return <canvas ref={canvasRef} style={{ width: 140, height }} className="block opacity-100" />;
}

import { MarketSignal } from "@/lib/market-data";

// Tooltip Component for Headers
function HeaderWithTooltip({ label, tooltip, align = 'left' }: { label: string; tooltip: string; align?: 'left' | 'right' }) {
  return (
    <div className={`group relative flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'} cursor-help`}>
      <span className="border-b border-dashed border-zinc-700 hover:text-zinc-300 transition-colors pb-[1px]">{label}</span>
      <div className={`absolute bottom-full ${align === 'right' ? 'right-0' : 'left-0'} mb-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50`}>
        <div className="bg-zinc-900 border border-white/10 rounded-md shadow-2xl p-3 text-left">
          <p className="text-[11px] text-zinc-300 font-normal leading-relaxed whitespace-normal normal-case tracking-normal">
            {tooltip}
          </p>
        </div>
        {/* Subtle arrow pointing down */}
        <div className={`absolute bottom-[-4px] ${align === 'right' ? 'right-4' : 'left-4'} w-2 h-2 bg-zinc-900 border-b border-r border-white/10 transform rotate-45`}></div>
      </div>
    </div>
  );
}

export const WatchlistGrid = ({ items, onRemoveAction }: { items: { signal: MarketSignal, alpha: boolean }[], onRemoveAction: (ticker: string) => void }) => {
    const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y">("1M");
    const [forecastHorizon, setForecastHorizon] = useState<"1D" | "3D" | "1W" | "1M">("1D");
    const [filter, setFilter] = useState("");

    const filteredItems = items.filter(item => 
      item.signal.ticker.toLowerCase().includes(filter.toLowerCase()) || 
      (item.signal.companyName || '').toLowerCase().includes(filter.toLowerCase()) ||
      (item.signal.sector || '').toLowerCase().includes(filter.toLowerCase())
    );

    const isEmpty = filteredItems.length === 0;

    return (
        <div className="w-full glass-card rounded-xl">
             <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                 <input 
                    type="text" 
                    placeholder="Filter by ticker, company, or sector..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full max-w-sm bg-black/20 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                 />
             </div>
             <div className="flex items-center px-6 py-2.5 border-b border-white/5 text-[11px] font-medium text-zinc-500 bg-white/[0.01] uppercase tracking-wider">
                <div className="w-[100px] shrink-0">Asset</div>
                <div className="w-[100px] shrink-0 hidden md:block">Sector</div>
                <div className="w-[100px] shrink-0">Price</div>
                <div className="flex-1 min-w-[100px] px-6 flex items-center gap-2 flex-wrap">
                    <HeaderWithTooltip label="Trend" tooltip="Smoothed price action over the selected timeframe." />
                    <div className="flex items-center gap-0.5 bg-black/30 border border-white/5 rounded px-1 py-0.5 ml-1">
                         {(["1M", "3M", "6M", "1Y"] as const).map(r => (
                             <button 
                                key={r} 
                                onClick={(e) => { e.stopPropagation(); setRange(r); }} 
                                className={`text-[8px] font-bold px-1 py-0.5 rounded-sm transition-colors ${range === r ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                             >
                                {r}
                             </button>
                         ))}
                    </div>
                </div>
                <div className="w-[120px] shrink-0 pl-6 flex flex-col gap-0.5">
                    <HeaderWithTooltip label="Proj. Return" tooltip="Ensemble quantitative price target projections." />
                    <div className="flex items-center gap-0.5">
                         {(["1D", "3D", "1W", "1M"] as const).map(h => (
                             <button 
                                key={h} 
                                onClick={(e) => { e.stopPropagation(); setForecastHorizon(h); }} 
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm transition-colors ${forecastHorizon === h ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                             >
                                {h}
                             </button>
                         ))}
                    </div>
                </div>
                <div className="w-[100px] shrink-0 hidden md:block pl-6">
                    <HeaderWithTooltip label="Technicals" tooltip="Algorithmic confluence score (0-100) combining momentum, volatility, and structural support levels." />
                </div>
                <div className="w-[120px] shrink-0 hidden lg:block pl-6">
                    <HeaderWithTooltip label="Sentiment" tooltip="AI-driven analysis of real-time news narratives, institutional money flow, and momentum shifts." />
                </div>
                <div className="w-[100px] shrink-0 pr-6 text-right">
                    <HeaderWithTooltip label="Conviction" tooltip="Final institutional synthesis score (0-100) representing directional confidence and risk/reward." align="right" />
                </div>
                <div className="w-10 shrink-0"></div>
             </div>
             {isEmpty ? (
                 <div className="py-32 flex flex-col items-center justify-center text-center px-6">
                     <div className="w-12 h-12 border border-white/10 flex items-center justify-center mb-6">
                        <div className="w-2 h-2 bg-zinc-500 animate-ping"></div>
                     </div>
                     <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-widest">No Matches</h3>
                     <p className="text-[11px] text-zinc-500 max-w-[220px] leading-relaxed">
                         Could not find any assets matching your filter criteria.
                     </p>
                 </div>
             ) : (
                 <div className="flex flex-col divide-y divide-white/5">
                     {filteredItems.map((item, i) => {
                        return (
                          <WatchlistItem 
                            key={i} 
                            signal={item.signal}
                            alpha={item.alpha}
                            onRemove={() => onRemoveAction(item.signal.ticker)}
                            range={range}
                            forecastHorizon={forecastHorizon}
                          />
                        );
                     })}
                 </div>
             )}
        </div>
    );
}


// 3. THE "STRICT ROW" (Surgical Density)
export interface WatchlistItemProps {
  signal: MarketSignal;
  onRemove?: () => void;
  alpha?: boolean;
  range?: "1M" | "3M" | "6M" | "1Y";
  forecastHorizon?: "1D" | "3D" | "1W" | "1M";
}

export function WatchlistItem({ signal, onRemove, alpha, range = "1M", forecastHorizon = "1D" }: WatchlistItemProps) {
  
  const change = signal.changePercent ?? (signal.history.length >= 2 ? ((signal.price - signal.history[signal.history.length-2].close) / signal.history[signal.history.length-2].close) * 100 : 0);
  
  React.useEffect(() => {
    // Pulse effect removed to ensure a stable, static interface as per institutional requirements.
    // Price updates are now reflected purely via the numeric value and sparkline.
  }, [signal.price]);


  const isBull = change >= 0;
  const color = isBull ? "hsl(var(--bull))" : "hsl(var(--bear))"; 

  // Compute Tags
  const isTechBullish = signal.tech.macd.histogram > 0 && signal.tech.rsi14 > 40;
  const sentScore = signal.sentiment.score;

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

  return (
      <div 
        className="group relative flex items-center px-4 py-2 min-h-[4rem] transition-colors hover:bg-white/[0.02]"
      >
          {/* ACTIVE INDICATOR */}
          <div className={`absolute left-0 top-0 bottom-0 w-[2px] opacity-0 transition-opacity group-hover:opacity-100 ${isBull ? 'bg-bull drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-bear drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} aria-hidden="true"></div>
          
          {/* MAIN CLICKABLE AREA */}
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

          {/* COL 2: SECTOR */}
          <div className="w-[100px] shrink-0 hidden md:flex flex-col justify-center">
                <span className="text-[11px] font-medium text-zinc-400 truncate">
                    {signal.sector || "Unknown"}
                </span>
          </div>

          {/* COL 3: PRICE */}
          <div className="w-[100px] flex flex-col justify-center shrink-0">
               <div className="font-mono text-[14px] font-medium text-white tabular-nums">
                   {fmt(signal.price)}
               </div>
               <div className="mt-1">
                   <span className={`inline-flex items-center text-[11px] font-medium font-mono px-1.5 py-0.5 rounded-sm tabular-nums ${isBull ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                       {isBull ? '+' : ''}{change.toFixed(2)}%
                   </span>
               </div>
          </div>

          {/* COL 4: SPARKLINE */}
          <div className="flex-1 px-6 h-8 flex items-center" role="img">
               <Sparkline 
                  data={signal.history.slice(-(range === "1Y" ? 252 : range === "6M" ? 126 : range === "3M" ? 63 : 21)).map(h => h.close)} 
                  color={color} 
                  height={32} 
               />
          </div>

          {/* COL 5: PROJ. RETURN */}
          <div className="w-[120px] shrink-0 flex flex-col justify-center pl-6">
               {expectedPct !== null ? (
                    <>
                        <span className={`text-[12px] font-bold font-mono tracking-tight tabular-nums leading-none ${expectedPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {fmtExpected}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 mt-1 tabular-nums leading-none">
                            [{fmtP10} / {fmtP90}]
                        </span>
                    </>
               ) : (
                    <span className="text-[11px] font-mono text-zinc-500">N/A</span>
               )}
          </div>

          {/* COL 6: TECHNICALS */}
          <div className="w-[100px] shrink-0 hidden md:flex flex-col justify-center pl-6">
               <div className="flex items-center gap-2">
                   <span className={`text-[11px] font-bold uppercase tracking-wider ${signal.tech.signal.includes('BUY') ? 'text-green-500' : signal.tech.signal.includes('SELL') ? 'text-red-500' : 'text-zinc-500'}`}>
                      {signal.tech.signal.replace('STRONG ', '')}
                   </span>
               </div>
           </div>

          {/* COL 7: SENTIMENT */}
          <div className="w-[120px] shrink-0 hidden lg:flex flex-col justify-center pl-6">
               <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    signal.sentiment.label.includes('BULL') ? 'bg-green-500' : 
                    signal.sentiment.label.includes('BEAR') ? 'bg-red-500' : 'bg-zinc-500'
                  }`} />
                  <span className={`text-[12px] font-medium capitalize ${signal.sentiment.label.includes('BULL') ? 'text-zinc-200' : signal.sentiment.label.includes('BEAR') ? 'text-zinc-200' : 'text-zinc-400'}`}>
                      {signal.sentiment.label.toLowerCase()}
                  </span>
               </div>
               {signal.sentiment.drift !== 'STABLE' && (
                  <span className="text-[11px] font-medium text-zinc-500 mt-0.5 flex items-center gap-1 whitespace-nowrap">
                      <span className="opacity-50">↳</span>
                      {signal.sentiment.drift === 'ACCELERATING_BULL' ? 'Momentum Building' :
                       signal.sentiment.drift === 'ACCELERATING_BEAR' ? 'Momentum Dropping' :
                       'Trend Reversing'}
                  </span>
               )}
          </div>

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

