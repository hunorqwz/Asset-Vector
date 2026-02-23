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
        <div className="w-full flex flex-col space-y-[1px] bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
             {isEmpty ? (
                 <div className="bg-black/40 backdrop-blur-md py-32 flex flex-col items-center justify-center text-center px-6">
                     <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center mb-6">
                        <div className="w-2 h-2 bg-zinc-700 animate-ping rounded-full"></div>
                     </div>
                     <h3 className="text-sm font-semibold text-white mb-2">No Assets Yet</h3>
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
        className="group relative block glass-card shimmer-trigger mb-2 overflow-hidden"
      >
          {/* SHIMMER EFFECT LAYER */}
          <div className="shimmer-effect group-hover:animate-shimmer pointer-events-none" aria-hidden="true"></div>

          {/* ACTIVE INDICATOR */}
          <div className={`absolute left-0 top-0 bottom-0 w-[2px] transition-transform scale-y-0 group-hover:scale-y-100 ${isBull ? 'bg-bull glow-bull' : 'bg-bear glow-bear'}`} aria-hidden="true"></div>
          
          <div className="px-6 py-4 flex items-center gap-10 relative z-10">
              
              {/* COL 1: IDENTITY (Surgical) */}
              <div className="w-44 flex items-center gap-5 shrink-0">
                   <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-[10px] border transition-all duration-500 group-hover:scale-105 ${isBull ? 'bg-bull/5 border-bull/10 text-bull' : 'bg-bear/5 border-bear/10 text-bear'}`} aria-hidden="true">
                        {ticker}
                   </div>
                   
                   <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-semibold text-white tracking-tight mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-matrix transition-colors">
                            {name || ticker}
                        </span>
                        <div className="flex items-center gap-2" aria-hidden="true">
                             <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`w-1 h-1.5 rounded-full ${i < 5 ? 'bg-matrix shadow-[0_0_4px_hsla(var(--matrix)/0.5)]' : 'bg-white/10'}`}></div>
                                ))}
                             </div>
                             <span className="text-[9px] text-zinc-600">Synced</span>
                        </div>
                   </div>
              </div>

              {/* COL 2: SPARKLINE (Tactical) */}
              <div className="flex-1 h-10 relative opacity-40 group-hover:opacity-100 transition-opacity duration-500" role="img" aria-label={`Price history sparkline for ${name || ticker}`}>
                   <Sparkline data={history} color={color} height={40} />
              </div>

              {/* COL 3: PRICE ARCHITECTURE */}
              <div className="w-48 flex items-center justify-end gap-8 shrink-0">
                   <div className="flex flex-col items-end">
                        <div className={`font-mono text-base font-semibold text-white tracking-tight data-value transition-all group-hover:translate-x-[-4px] rounded px-1 -mx-1 tabular-nums ${pulseClass}`}>
                            {fmt(price)}
                        </div>
                        <div className={`text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded ${isBull ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'} tabular-nums`}>
                            <span className="sr-only">Price change: </span>
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
                      aria-label={`Remove ${ticker} from watchlist`}
                      title={`Remove ${ticker}`}
                      className="w-8 h-8 flex items-center justify-center rounded border border-white/5 text-zinc-800 hover:border-bear/40 hover:bg-bear/10 hover:text-bear transition-all opacity-0 group-hover:opacity-100 active:scale-90"
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

