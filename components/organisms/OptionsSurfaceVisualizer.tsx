"use client";
import React, { useMemo } from 'react';
import { OptionsIntelligence } from '@/lib/options-pricing';
import { fmt, fmtCount } from '@/lib/format';

interface OptionsSurfaceVisualizerProps {
  data: OptionsIntelligence;
}

export function OptionsSurfaceVisualizer({ data }: OptionsSurfaceVisualizerProps) {
  if (!data || !data.isValid || !data.strikes || data.strikes.length === 0) return null;

  // We visualize Call Gamma (Long Dealer) vs Put Gamma (Short Dealer) to see GEX Walls.
  const maxGEX = useMemo(() => {
    let max = 0;
    data.strikes.forEach(s => {
      const cGex = s.callGamma * s.callOI * 100;
      const pGex = s.putGamma * s.putOI * 100;
      if (cGex > max) max = cGex;
      if (pGex > max) max = pGex;
    });
    return max || 1; 
  }, [data.strikes]);

  const currentPrice = data.currentPrice;

  return (
     <div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
       <div className="flex items-center gap-3 mb-6">
         <div className="w-1.5 h-6 bg-[linear-gradient(to_bottom,theme(colors.bull),theme(colors.bear))] opacity-80" />
         <div>
            <h3 className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.2em] flex items-center gap-2">
              Gamma Exposure <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">GEX</span>
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              Net: <span className={data.totalGEX > 0 ? "text-bull" : "text-bear"}>{fmtCount(Math.abs(data.totalGEX))}</span> | Flip Line: <span className="text-white">${data.zeroGammaLevel.toFixed(1)}</span>
            </p>
         </div>
       </div>

       <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex justify-between mb-4 px-2">
          <span>Put Gamma (Short)</span>
          <span>Strike</span>
          <span>Call Gamma (Long)</span>
       </div>

       <div className="space-y-1 mt-4 max-h-[400px] overflow-y-auto scrollbar-hide">
         {data.strikes.map((s) => {
           const isITMCall = s.strike < currentPrice;
           const isITMPut = s.strike > currentPrice;
           
           const cGex = s.callGamma * s.callOI * 100;
           const pGex = s.putGamma * s.putOI * 100;

           const callPercent = (cGex / maxGEX) * 100;
           const putPercent = (pGex / maxGEX) * 100;

           const isAtMoney = Math.abs(s.strike - currentPrice) / currentPrice < 0.01;
           const isGravityWell = data.gravityWells.includes(s.strike);
           const isZeroGamma = data.zeroGammaLevel === s.strike;

           return (
             <div key={s.strike} className={`flex items-center text-[10px] font-mono group/row hover:bg-white/5 transition-colors rounded-sm ${isAtMoney ? 'bg-white/5 py-1' : ''}`}>
               {/* PUT SIDE (Left) */}
               <div className="flex-1 flex items-center justify-end pr-3 relative h-6">
                 <div 
                   className={`h-3 rounded-l-sm transition-all duration-500 ${isZeroGamma ? 'bg-zinc-500' : (isITMPut ? 'bg-bear/40' : 'bg-bear/80')}`} 
                   style={{ width: `${putPercent}%` }} 
                 />
                 <span className={`absolute right-4 hidden group-hover/row:block font-bold ${isITMPut ? 'text-bear/80' : 'text-bear'}`}>
                   {fmtCount(pGex)}
                 </span>
               </div>

               {/* STRIKE (Center) */}
               <div className={`w-20 text-center font-bold relative z-10 tabular-nums flex items-center justify-center gap-1
                  ${isAtMoney ? 'text-white text-[11px] bg-black/50 py-0.5 rounded px-1' : 'text-zinc-400'}
                  ${isZeroGamma ? 'border-b border-zinc-500 border-dashed' : ''}
               `}>
                 {isGravityWell && <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${s.netGamma > 0 ? 'bg-bull' : 'bg-bear'}`} />}
                 {s.strike.toFixed(1)}
                 {isGravityWell && <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${s.netGamma > 0 ? 'bg-bull' : 'bg-bear'}`} />}
               </div>

               {/* CALL SIDE (Right) */}
               <div className="flex-1 flex items-center justify-start pl-3 relative h-6">
                 <div 
                   className={`h-3 rounded-r-sm transition-all duration-500 ${isZeroGamma ? 'bg-zinc-500' : (isITMCall ? 'bg-bull/40' : 'bg-bull/80')}`} 
                   style={{ width: `${callPercent}%` }} 
                 />
                 <span className={`absolute left-4 hidden group-hover/row:block font-bold ${isITMCall ? 'text-bull/80' : 'text-bull'}`}>
                   {fmtCount(cGex)}
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
