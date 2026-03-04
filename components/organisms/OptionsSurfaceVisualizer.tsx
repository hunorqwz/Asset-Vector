"use client";
import React, { useMemo } from 'react';
import { OptionsIntelligence } from '@/lib/options-pricing';
import { fmt, fmtCount } from '@/lib/format';

interface OptionsSurfaceVisualizerProps {
  data: OptionsIntelligence;
}

export function OptionsSurfaceVisualizer({ data }: OptionsSurfaceVisualizerProps) {
  if (!data || !data.isValid || !data.strikes || data.strikes.length === 0) return null;

  // We want to visualize Call OI vs Put OI to see where "dealers" might be hedging (Gamma Wall proxy)
  // Max OI determines the 100% width of the bars
  const maxOI = useMemo(() => {
    let max = 0;
    data.strikes.forEach(s => {
      if (s.callOI > max) max = s.callOI;
      if (s.putOI > max) max = s.putOI;
    });
    return max || 1; // Prevent div by 0
  }, [data.strikes]);

  const currentPrice = data.currentPrice;

  return (
    <div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
       <div className="flex items-center gap-3 mb-6">
         <div className="w-1.5 h-6 bg-bull" />
         <h3 className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Options Surface (GEX Proxy)</h3>
       </div>

       <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex justify-between mb-4 px-2">
          <span>Put Volatility (OI)</span>
          <span>Strike</span>
          <span>Call Volatility (OI)</span>
       </div>

       <div className="space-y-1 mt-4 max-h-[400px] overflow-y-auto scrollbar-hide">
         {data.strikes.map((s) => {
           const isITMCall = s.strike < currentPrice;
           const isITMPut = s.strike > currentPrice;
           
           const callPercent = (s.callOI / maxOI) * 100;
           const putPercent = (s.putOI / maxOI) * 100;

           const isAtMoney = Math.abs(s.strike - currentPrice) / currentPrice < 0.01;

           return (
             <div key={s.strike} className={`flex items-center text-[10px] font-mono group/row hover:bg-white/5 transition-colors rounded-sm ${isAtMoney ? 'bg-white/5 py-1' : ''}`}>
               {/* PUT SIDE (Left) */}
               <div className="flex-1 flex items-center justify-end pr-3 relative h-6">
                 <div 
                   className={`h-3 rounded-l-sm transition-all duration-500 ${isITMPut ? 'bg-bear/40' : 'bg-bear/80'}`} 
                   style={{ width: `${putPercent}%` }} 
                 />
                 <span className={`absolute right-4 hidden group-hover/row:block font-bold ${isITMPut ? 'text-bear/80' : 'text-bear'}`}>
                   {fmtCount(s.putOI)}
                 </span>
               </div>

               {/* STRIKE (Center) */}
               <div className={`w-16 text-center font-bold relative z-10 tabular-nums ${isAtMoney ? 'text-white text-[11px] bg-black/50 py-0.5 rounded px-1' : 'text-zinc-400'}`}>
                 {s.strike.toFixed(1)}
               </div>

               {/* CALL SIDE (Right) */}
               <div className="flex-1 flex items-center justify-start pl-3 relative h-6">
                 <div 
                   className={`h-3 rounded-r-sm transition-all duration-500 ${isITMCall ? 'bg-bull/40' : 'bg-bull/80'}`} 
                   style={{ width: `${callPercent}%` }} 
                 />
                 <span className={`absolute left-4 hidden group-hover/row:block font-bold ${isITMCall ? 'text-bull/80' : 'text-bull'}`}>
                   {fmtCount(s.callOI)}
                 </span>
               </div>
             </div>
           );
         })}
       </div>

       <div className="mt-6 flex justify-between items-center bg-black/40 rounded-lg p-3 border border-white/5">
         <div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Expected 30D Move</div>
            <div className="text-white font-mono font-bold">±{fmt(data.expectedMoveDollars)} ({fmt(data.expectedMovePercentage * 100)}%)</div>
         </div>
         <div className="text-right">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Implied Volatility</div>
            <div className={`font-mono font-bold ${data.atmImpliedVolatility > 0.5 ? 'text-bear' : 'text-zinc-300'}`}>
               {fmt(data.atmImpliedVolatility * 100)}%
            </div>
         </div>
       </div>
    </div>
  );
}
