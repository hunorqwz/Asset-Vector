"use client";

import React, { useRef, useEffect } from "react";
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
        gradient.addColorStop(0, `${color}20`);
        gradient.addColorStop(1, `${color}00`);
        
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
        
        ctx.strokeStyle = color;
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
                        <div className="w-2 h-2 bg-zinc-700 animate-ping rounded-full font-black text-white"></div>
                     </div>
                     <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Matrix Node Offline.</h3>
                     <p className="text-[10px] text-zinc-500 max-w-[200px] font-medium uppercase tracking-wider leading-relaxed">
                         Identify a target symbol to initiate real-time vector tracking.
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
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(n);
  
  const fmtPct = (n: number) => (n > 0 ? "+" : "") + n.toFixed(2) + "%";

  const isBull = change >= 0;
  const color = isBull ? "#10b981" : "#f43f5e"; 

  return (
      <Link 
        href={`/asset/${ticker}`} 
        className="group relative block glass-card shimmer-trigger mb-2 overflow-hidden"
      >
          {/* SHIMMER EFFECT LAYER */}
          <div className="shimmer-effect absolute inset-0 bg-gradient-to-r from-transparent via-matrix/5 to-transparent -translate-x-full pointer-events-none"></div>

          {/* ACTIVE INDICATOR */}
          <div className={`absolute left-0 top-0 bottom-0 w-[2px] transition-transform scale-y-0 group-hover:scale-y-100 ${isBull ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-rose-500 shadow-[0_0_15px_#f43f5e]'}`}></div>
          
          <div className="px-8 py-5 flex items-center gap-12 relative z-10">
              
              {/* COL 1: IDENTITY (Surgical) */}
              <div className="w-48 flex items-center gap-6 shrink-0">
                   <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xs border transition-all duration-500 group-hover:scale-110 ${isBull ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-rose-500/5 border-rose-500/10 text-rose-400'}`}>
                        {ticker}
                   </div>
                   
                   <div className="flex flex-col min-w-0">
                        <span className="text-telemetry opacity-60 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                            {name || "Asset_Vector"}
                        </span>
                        <div className="flex items-center gap-2">
                             {aiSignal && <div className="w-1.5 h-1.5 rounded-full bg-matrix glow-matrix"></div>}
                             <span className="text-[11px] font-mono text-white font-bold tracking-tight">DATA_INT: 0.98</span>
                        </div>
                   </div>
              </div>

              {/* COL 2: SPARKLINE (Tactical) */}
              <div className="flex-1 h-12 relative group-hover:opacity-100 opacity-60 transition-opacity">
                   <Sparkline data={history} color={color} height={48} />
              </div>

              {/* COL 3: PRICE ARCHITECTURE */}
              <div className="w-56 flex items-center justify-end gap-10 shrink-0">
                   <div className="flex flex-col items-end">
                        <span className="text-telemetry text-zinc-500 mb-1">Live_Valuation</span>
                        <div className="font-mono text-lg font-bold text-white tracking-tighter group-hover:text-matrix transition-colors">
                            {fmt(price)}
                        </div>
                        <div className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${isBull ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {fmtPct(change)}
                        </div>
                   </div>

                   {/* ACTION: PURGE */}
                   <button 
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemove?.();
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/5 text-zinc-700 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                   >
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                           <path d="M18 6L6 18M6 6l12 12" />
                       </svg>
                   </button>
              </div>
          
          </div>
      </Link>

  );
}

