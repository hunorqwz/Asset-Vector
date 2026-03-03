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
        
        // DRAW GRADIENT FILL
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        
        // Unified color resolution from the centralized Design Tokens
        const colorValues = color.includes('var(') ? resolveCanvasColor(color) : color;
        const isHSL = color.includes('var(');

        // Normalize space-separated HSL values (e.g. from modern CSS variables) to comma-separated format for Canvas API compatibility
        const cv = typeof colorValues === 'string' ? colorValues.replace(/\s+/g, ', ') : colorValues;
        
        const baseColor = isHSL ? `hsla(${cv}, 0.2)` : `${color}20`;
        const transparentColor = isHSL ? `hsla(${cv}, 0)` : `${color}00`;
        const strokeColor = isHSL ? `hsl(${cv})` : color;
        
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, transparentColor);
        
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 8) - 4;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fillStyle = gradient;
        ctx.fill();

        // DRAW LINE
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 8) - 4;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.stroke();
    }, [data, color, height]);

    return <canvas ref={canvasRef} style={{ width: 140, height }} className="block opacity-90 transition-opacity group-hover:opacity-100" />;
}


import { MarketSignal } from "@/lib/market-data";

// 2. THE NEW "DATA-GRID" (Systematic Table)
export const WatchlistGrid = ({ children }: { children: React.ReactNode }) => {
    const isEmpty = React.Children.count(children) === 0;

    return (
        <div className="w-full glass-card overflow-hidden">
             <div className="flex items-center px-4 py-3 border-b border-white/10 text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-[#070707]">
                <div className="w-[100px] lg:w-[140px] shrink-0">Asset</div>
                <div className="w-[100px] lg:w-[160px] shrink-0 ml-2">Market Price</div>
                <div className="flex-1 min-w-[60px] px-2 lg:px-6 border-l border-white/5">Trend</div>
                <div className="w-[140px] shrink-0 hidden md:block border-l border-white/5 pl-4">Tech Confluence</div>
                <div className="w-[120px] shrink-0 hidden lg:block border-l border-white/5 pl-4">Narrative</div>
                <div className="w-[140px] shrink-0 hidden xl:flex border-l border-white/5 pl-4">Synthesis</div>
                <div className="w-10 shrink-0"></div>
             </div>
             {isEmpty ? (
                 <div className="py-32 flex flex-col items-center justify-center text-center px-6">
                     <div className="w-12 h-12 border border-white/10 flex items-center justify-center mb-6">
                        <div className="w-2 h-2 bg-zinc-500 animate-ping"></div>
                     </div>
                     <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-widest">No Assets Yet</h3>
                     <p className="text-[11px] text-zinc-500 max-w-[220px] leading-relaxed">
                         Search for a ticker symbol to start tracking its performance.
                     </p>
                 </div>
             ) : (
                 <div className="flex flex-col divide-y divide-white/5">
                     {children}
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
}

export function WatchlistItem({ signal, onRemove, alpha }: WatchlistItemProps) {
  
  const change = signal.history.length >= 2 ? ((signal.price - signal.history[signal.history.length-2].close) / signal.history[signal.history.length-2].close) * 100 : 0;
  
  React.useEffect(() => {
    // Pulse effect removed to ensure a stable, static interface as per institutional requirements.
    // Price updates are now reflected purely via the numeric value and sparkline.
  }, [signal.price]);


  const isBull = change >= 0;
  const color = isBull ? "hsl(var(--bull))" : "hsl(var(--bear))"; 

  // Compute Tags
  const isTechBullish = signal.tech.macd.histogram > 0 && signal.tech.rsi14 > 40;
  const sentScore = signal.sentiment.score;

  return (
      <div 
        className="group relative flex items-center px-4 py-3 min-h-[5rem] transition-colors hover:bg-white/[0.02]"
      >
          {/* ACTIVE INDICATOR */}
          <div className={`absolute left-0 top-0 bottom-0 w-[2px] opacity-0 transition-opacity group-hover:opacity-100 ${isBull ? 'bg-bull drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-bear drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} aria-hidden="true"></div>
          
          {/* MAIN CLICKABLE AREA */}
          <Link href={`/asset/${signal.ticker}`} className="flex flex-1 items-center min-w-0 h-full">
          <div className="w-[100px] lg:w-[140px] flex flex-col shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[14px] sm:text-[15px] font-bold text-white tracking-tight leading-none group-hover:text-zinc-300 transition-colors truncate">
                      {signal.ticker}
                  </span>
                  {alpha && (
                    <span className="ml-1 text-[7px] font-black bg-matrix/20 text-matrix px-1 rounded-sm border border-matrix/30 leading-none py-0.5 tracking-tighter uppercase shrink-0">
                      α
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col gap-1 mt-1" aria-hidden="true">
                     <span className="text-[9px] uppercase font-medium tracking-wider text-zinc-500">
                        {signal.benchmark ? (
                            <span className="flex items-center gap-2">
                                 <span className={signal.benchmark.alpha > 0 ? 'text-bull' : 'text-zinc-500'}>
                                     Alpha {signal.benchmark.alpha}%
                                 </span>
                                 <span className="text-zinc-500">Corr {signal.benchmark.correlation}</span>
                                 <span className="text-zinc-500">Beta {signal.benchmark.beta}</span>
                            </span>
                        ) : signal.regime.split('_')[0]}
                     </span>
                     {signal.quality && (
                        <div className="flex items-center gap-1.5 leading-none">
                            <div className={`w-1 h-1 rounded-full ${
                                signal.quality.level === 'INSTITUTIONAL' || signal.quality.level === 'HIGH' ? 'bg-bull' : 
                                signal.quality.level === 'AVERAGE' ? 'bg-zinc-500' : 'bg-bear'
                            }`} />
                            <span className={`text-[8px] font-black tracking-widest uppercase ml-1.5 ${
                                signal.quality.level === 'INSTITUTIONAL' || signal.quality.level === 'HIGH' ? 'text-bull' : 
                                signal.quality.level === 'AVERAGE' ? 'text-zinc-500' : 'text-bear'
                            }`}>
                                {signal.quality.level}
                            </span>
                        </div>
                     )}
                </div>
          </div>

          {/* COL 2: PRICE */}
          <div className="w-[100px] lg:w-[160px] flex flex-col justify-center shrink-0 ml-2">
               <div className="font-mono text-[13px] sm:text-[14px] font-bold text-white tabular-nums">
                   {fmt(signal.price)}
               </div>
               <div className={`text-[10px] sm:text-[11px] font-bold font-mono tracking-wide tabular-nums ${isBull ? 'text-bull' : 'text-bear'}`}>
                   {isBull ? '+' : ''}{fmtPct(change)}
               </div>
          </div>

          {/* COL 3: SPARKLINE */}
          <div className="flex-1 px-1 lg:px-6 min-w-[60px] h-9 border-l border-white/5 flex items-center overflow-hidden" role="img">
               <Sparkline data={signal.history.map(h => h.close)} color={color} height={36} />
          </div>

          {/* COL 4: TECH (Confluence Gauge) */}
          <div className="w-[140px] shrink-0 hidden md:flex flex-col justify-center border-l border-white/5 pl-4">
                <div className="flex items-baseline gap-1 mb-1.5">
                   <span className={`text-[9.5px] font-bold uppercase tracking-wider ${signal.tech.signal === 'BUY' || signal.tech.signal === 'STRONG BUY' ? 'text-bull' : signal.tech.signal === 'SELL' || signal.tech.signal === 'STRONG SELL' ? 'text-bear' : 'text-zinc-500'}`}>
                      {signal.tech.signal}
                   </span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                     <div 
                        className={`h-full transition-all duration-700 ${signal.tech.confluenceScore > 60 ? 'bg-bull' : signal.tech.confluenceScore < 40 ? 'bg-bear' : 'bg-zinc-500'}`}
                        style={{ width: `${signal.tech.confluenceScore}%` }}
                     />
                  </div>
                   <span className="text-[10px] font-mono font-bold text-zinc-400 w-5 text-right">{signal.tech.confluenceScore}</span>
                </div>
                {signal.structuralProbability && signal.structuralProbability.length > 0 && (
                    <div className="mt-2.5 space-y-1">
                        {signal.structuralProbability.slice(0, 2).map((p, i) => (
                            <div key={i} className="flex justify-between items-center text-[8px] font-mono tracking-tighter uppercase leading-none">
                                <span className="text-zinc-500 truncate pr-2">{p.type} {Math.round(p.price)}</span>
                                <span className={p.probability > 0.6 ? 'text-bull' : 'text-zinc-500'}>
                                    {Math.round(p.probability * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                {signal.tech.volatilityCompression.isSqueezing && (
                    <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1 bg-amber-500/5 border border-amber-500/20 rounded-sm">
                        <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap">Volatility Squeeze</span>
                    </div>
                )}
           </div>

          {/* COL 5: NARRATIVE MOMENTUM */}
          <div className="w-[120px] shrink-0 hidden lg:flex flex-col justify-center border-l border-white/5 pl-4">
               <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    signal.sentiment.drift === 'ACCELERATING_BULL' ? 'bg-bull animate-pulse' : 
                    signal.sentiment.drift === 'ACCELERATING_BEAR' ? 'bg-bear animate-pulse' : 
                    signal.sentiment.drift === 'REVERSAL' ? 'bg-amber-500' : 'bg-zinc-500 opacity-50'
                  }`} />
                  <span className={`text-[10px] font-bold font-mono tracking-tight ${sentScore > 0 ? 'text-bull' : sentScore < 0 ? 'text-bear' : 'text-zinc-400'}`}>
                      {signal.sentiment.label}
                  </span>
               </div>
               <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-tighter">
                   {signal.sentiment.drift.replace('_', ' ')}
               </span>
          </div>

          {/* COL 6: SYNTHESIS */}
          <div className="w-[140px] shrink-0 hidden xl:flex flex-col justify-center border-l border-white/5 pl-4 overflow-hidden">
               <div className="flex items-center justify-between mb-1.5 pr-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest opacity-0">Confidence</span>
                  <span className={`text-[10px] font-mono font-bold ${
                    signal.synthesis.score >= 60 ? 'text-bull' : 
                    signal.synthesis.score <= 40 ? 'text-bear' : 'text-zinc-400'
                  }`}>
                      {signal.synthesis.score}%
                  </span>
               </div>
               <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex mr-2">
                   <div 
                      className={`h-full transition-all duration-500 ${
                        signal.synthesis.score >= 60 ? 'bg-bull' : 
                        signal.synthesis.score <= 40 ? 'bg-bear' : 'bg-zinc-500'
                      }`} 
                      style={{ width: `${signal.synthesis.score}%` }} 
                   />
               </div>
               <div className="flex flex-col gap-0.5 mt-2">
                  <span className={`text-[9px] font-bold uppercase tracking-tight ${
                    signal.synthesis.signal.includes('BUY') ? 'text-bull' : 
                    signal.synthesis.signal.includes('SELL') ? 'text-bear' : 'text-zinc-300'
                  }`}>
                     {signal.synthesis.signal}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
                    Rel: {signal.synthesis.confidence}
                  </span>
               </div>
          </div>

          </Link>

          {/* COL 7: REMOVE */}
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

