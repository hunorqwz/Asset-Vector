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


// 2. THE NEW "CARD-GRID" (Systematic)
export const WatchlistGrid = ({ children }: { children: React.ReactNode }) => {
    const isEmpty = React.Children.count(children) === 0;

    return (
        <div className="w-full flex flex-col gap-2">
             {isEmpty ? (
                 <div className="border border-white/10 py-32 flex flex-col items-center justify-center text-center px-6">
                     <div className="w-12 h-12 border border-white/10 flex items-center justify-center mb-6">
                        <div className="w-2 h-2 bg-zinc-500 animate-ping"></div>
                     </div>
                     <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-widest">No Assets Yet</h3>
                     <p className="text-[11px] text-zinc-500 max-w-[220px] leading-relaxed">
                         Search for a ticker symbol to start tracking its performance.
                     </p>
                 </div>
             ) : (
                 children
             )}
        </div>
    );
}


// 3. THE "STRICT GRID" ROW (Surgical Density)
export const WatchlistItem = ({
  ticker,
  name,
  price,
  change,
  history,
  aiSignal,
  onRemove
}: {
  ticker: string;
  name?: string;
  price: number;
  change: number; 
  history: number[]; 
  aiSignal?: number;
  onRemove?: () => void;
}) => {
  const [pulseClass, setPulseClass] = useState("");
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price !== prevPriceRef.current) {
        const isHigher = price > prevPriceRef.current;
        setPulseClass(isHigher ? "animate-pulse-bull" : "animate-pulse-bear");
        prevPriceRef.current = price;
        const timer = setTimeout(() => setPulseClass(""), 1000);
        return () => clearTimeout(timer);
    }
  }, [price]);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(n);
  
  const fmtPct = (n: number) => (n > 0 ? "+" : "") + n.toFixed(2) + "%";

  const isBull = change >= 0;
  const color = isBull ? "hsl(var(--bull))" : "hsl(var(--bear))"; 

  return (
      <Link 
        href={`/asset/${ticker}`} 
        aria-label={`View detailed analytics for ${name || ticker}`}
        className="group relative block glass-card overflow-hidden"
      >
          {/* SHIMMER EFFECT LAYER */}
          <div className="shimmer-effect group-hover:animate-shimmer pointer-events-none" aria-hidden="true"></div>

          {/* ACTIVE INDICATOR */}
          <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-transform origin-top scale-y-0 group-hover:scale-y-100 ${isBull ? 'bg-bull' : 'bg-bear'}`} aria-hidden="true"></div>
          
          <div className="px-6 py-4 flex items-center gap-10 relative z-10">
              
              {/* COL 1: IDENTITY (Surgical) */}
              <div className="w-52 flex items-center gap-6 shrink-0">
                   <div className={`w-11 h-11 flex items-center justify-center font-bold text-[12px] border transition-all duration-300 group-hover:scale-105 ${isBull ? 'bg-bull/10 border-bull/30 text-bull' : 'bg-bear/10 border-bear/30 text-bear'}`} aria-hidden="true">
                        {ticker}
                   </div>
                   
                   <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-bold text-white tracking-tight mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-zinc-300 transition-colors">
                            {name || ticker}
                        </span>
                        <div className="flex items-center gap-2.5" aria-hidden="true">
                             <div className="flex gap-1">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`w-1 h-3 ${i < 4 ? 'bg-zinc-300' : 'bg-white/10'}`}></div>
                                ))}
                             </div>
                             <span className="text-[11px] uppercase font-bold tracking-[0.15em] text-zinc-500">Synced</span>
                        </div>
                   </div>
              </div>

              {/* COL 2: SPARKLINE (Tactical) */}
              <div className="flex-1 h-12 relative opacity-60 group-hover:opacity-100 transition-opacity duration-300" role="img" aria-label={`Price history sparkline for ${name || ticker}`}>
                   <Sparkline data={history} color={color} height={40} />
              </div>

              {/* COL 3: PRICE ARCHITECTURE */}
              <div className="w-56 flex items-center justify-end gap-12 shrink-0">
                   <div className="flex flex-col items-end">
                        <div className={`font-mono text-xl font-bold text-white tracking-tight data-value transition-all group-hover:translate-x-[-2px] tabular-nums ${pulseClass}`}>
                            {fmt(price)}
                        </div>
                        <div className={`text-[12px] font-bold font-mono px-2.5 py-1 ${isBull ? 'bg-bull/10 border border-bull/20 text-bull' : 'bg-bear/10 border border-bear/20 text-bear'} tabular-nums`}>
                            {isBull ? '+' : ''}{fmtPct(change)}
                        </div>
                   </div>

                   {/* ACTION: PURGE */}
                   <button 
                      onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemove?.();
                      }}
                      className="w-10 h-10 flex items-center justify-center border border-white/10 text-zinc-600 hover:border-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                   >
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                           <path d="M18 6L6 18M6 6l12 12" />
                       </svg>
                   </button>
              </div>
          
          </div>
      </Link>

  );
}

