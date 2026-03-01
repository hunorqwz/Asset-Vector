"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";

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
        
        // Canvas API cannot resolve CSS variables. Map the theme tokens to raw colors.
        const resolveColor = (c: string) => {
            if (c.includes('--bull')) return '142, 76%, 45%';
            if (c.includes('--bear')) return '346, 84%, 61%';
            return '250, 89%, 65%'; // Default matrix
        };

        const colorValues = color.includes('var(') ? resolveColor(color) : color;
        const isHSL = color.includes('var(');

        const baseColor = isHSL ? `hsla(${colorValues}, 0.2)` : `${color}20`;
        const transparentColor = isHSL ? `hsla(${colorValues}, 0)` : `${color}00`;
        const strokeColor = isHSL ? `hsl(${colorValues})` : color;
        
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
                <div className="w-[120px] lg:w-[140px] shrink-0">Asset Vector</div>
                <div className="w-[140px] lg:w-[160px] shrink-0">Last Price (USD)</div>
                <div className="flex-1 min-w-[80px] px-2 lg:px-6 border-l border-white/5">Trend (1Y)</div>
                <div className="w-[140px] shrink-0 hidden md:block border-l border-white/5 pl-4">Tech Confluence</div>
                <div className="w-[120px] shrink-0 hidden lg:block border-l border-white/5 pl-4">Narrative Momentum</div>
                <div className="w-[140px] shrink-0 hidden xl:flex border-l border-white/5 pl-4">Synthesis (Confidence)</div>
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
  const [pulseClass, setPulseClass] = React.useState("");
  
  const change = signal.history.length >= 2 ? ((signal.price - signal.history[signal.history.length-2].close) / signal.history[signal.history.length-2].close) * 100 : 0;
  
  React.useEffect(() => {
    setPulseClass("animate-pulse text-matrix");
    const t = setTimeout(() => setPulseClass(""), 2000);
    return () => clearTimeout(t);
  }, [signal.price]);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  
  const fmtPct = (n: number) => (n > 0 ? "+" : "") + n.toFixed(2) + "%";

  const isBull = change >= 0;
  const color = isBull ? "hsl(var(--bull))" : "hsl(var(--bear))"; 

  // Compute Tags
  const isTechBullish = signal.tech.macd.histogram > 0 && signal.tech.rsi14 > 40;
  const sentScore = signal.sentiment.score;

  return (
      <Link 
        href={`/asset/${signal.ticker}`} 
        className="group relative flex items-center px-4 py-1 h-16 hover:bg-white/[0.02] transition-colors"
      >
          {/* ACTIVE INDICATOR */}
          <div className={`absolute left-0 top-0 bottom-0 w-[2px] opacity-0 transition-opacity group-hover:opacity-100 ${isBull ? 'bg-bull' : 'bg-bear'}`} aria-hidden="true"></div>
          
          {/* COL 1: IDENTITY */}
          <div className="w-[120px] lg:w-[140px] flex flex-col shrink-0">
               <div className="flex items-center gap-2">
                 <span className="text-[15px] font-bold text-white tracking-tight leading-none group-hover:text-zinc-300 transition-colors">
                     {signal.ticker}
                 </span>
                 {alpha && (
                   <span className="text-[8px] font-black bg-matrix/20 text-matrix px-1 rounded-sm border border-matrix/30 leading-none py-0.5 tracking-widest">
                     ALPHA
                   </span>
                 )}
               </div>
               <div className="flex items-center gap-1.5 mt-1" aria-hidden="true">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-zinc-500">{signal.regime.split('_')[0]}</span>
               </div>
          </div>

          {/* COL 2: PRICE */}
          <div className="w-[140px] lg:w-[160px] flex flex-col justify-center shrink-0">
               <div className={`font-mono text-[14px] font-bold text-white tabular-nums ${pulseClass}`}>
                   {fmt(signal.price)}
               </div>
               <div className={`text-[11px] font-bold font-mono tracking-wide tabular-nums ${isBull ? 'text-bull' : 'text-bear'}`}>
                   {isBull ? '+' : ''}{fmtPct(change)}
               </div>
          </div>

          {/* COL 3: SPARKLINE */}
          <div className="flex-1 px-2 lg:px-6 min-w-[80px] h-9 border-l border-white/5 opacity-70 group-hover:opacity-100 transition-opacity flex items-center overflow-hidden" role="img">
               <Sparkline data={signal.history.map(h => h.close)} color={color} height={36} />
          </div>

          {/* COL 4: TECH (Confluence Gauge) */}
          <div className="w-[140px] shrink-0 hidden md:flex flex-col justify-center border-l border-white/5 pl-4">
                <div className="flex items-baseline gap-1 mb-1">
                   <span className={`text-[9px] font-bold uppercase ${signal.tech.signal === 'BUY' || signal.tech.signal === 'STRONG BUY' ? 'text-bull' : signal.tech.signal === 'SELL' || signal.tech.signal === 'STRONG SELL' ? 'text-bear' : 'text-zinc-500'}`}>
                      {signal.tech.signal}
                   </span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                     <div 
                        className={`h-full transition-all duration-700 ${signal.tech.confluenceScore > 60 ? 'bg-bull' : signal.tech.confluenceScore < 40 ? 'bg-bear' : 'bg-zinc-600'}`}
                        style={{ width: `${signal.tech.confluenceScore}%` }}
                     />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-500">{signal.tech.confluenceScore}</span>
               </div>
          </div>

          {/* COL 5: NARRATIVE MOMENTUM */}
          <div className="w-[120px] shrink-0 hidden lg:flex flex-col justify-center border-l border-white/5 pl-4">
               <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    signal.sentiment.drift.startsWith('ACCELERATING') ? 'bg-bull animate-pulse' : 
                    signal.sentiment.drift === 'REVERSAL' ? 'bg-amber-500' : 'bg-zinc-500 opacity-50'
                  }`} />
                  <span className={`text-[10px] font-bold font-mono tracking-tight ${sentScore > 0 ? 'text-bull' : sentScore < 0 ? 'text-bear' : 'text-zinc-400'}`}>
                      {signal.sentiment.label}
                  </span>
               </div>
               <span className="text-[9px] font-black uppercase text-zinc-600 tracking-tighter">
                   {signal.sentiment.drift.replace('_', ' ')}
               </span>
          </div>

          {/* COL 6: SYNTHESIS */}
          <div className="w-[140px] shrink-0 hidden xl:flex flex-col justify-center border-l border-white/5 pl-4 overflow-hidden">
               <div className="flex items-center justify-between mb-1.5 pr-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Confidence</span>
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
                  <span className="text-[8px] font-medium text-zinc-500 uppercase tracking-tighter">
                    Rel: {signal.synthesis.confidence}
                  </span>
               </div>
          </div>

          {/* COL 7: REMOVE */}
          <div className="w-10 shrink-0 flex items-center justify-end">
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
      </Link>
  );
}

