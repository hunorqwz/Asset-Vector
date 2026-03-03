"use client";
import React from 'react';
import { OptionsIntelligence } from '@/lib/options-pricing';
import { fmt, fmtPct } from '@/lib/format';

interface OptionsProbabilityPanelProps {
  data: OptionsIntelligence;
}

export function OptionsProbabilityPanel({ data }: OptionsProbabilityPanelProps) {
  if (!data || !data.isValid) return null;

  return (
    <div className="glass-card mt-10 p-6 border border-white/10 relative overflow-hidden group">
       <div className="flex items-center gap-3 mb-6">
         <div className="w-1.5 h-6 bg-[#38bdf8]" />
         <h3 className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-widest leading-none">Options Engine</h3>
       </div>

       <div className="space-y-6">
         {/* ATM Implied Volatility */}
         <div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Implied Volatility (ATM)</div>
            <div className="text-3xl font-mono font-bold text-white tracking-tight tabular-nums">
               {fmtPct(data.atmImpliedVolatility)}
            </div>
         </div>

         {/* Market Maker Expected Move */}
         <div className="pt-4 border-t border-white/5 space-y-4">
            <div>
               <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex justify-between">
                 <span>{data.daysToExpiration}D Expected Move</span>
                 <span className="text-[#38bdf8]">±{fmtPct(data.expectedMovePercentage)}</span>
               </div>
               <div className="text-xl font-mono font-bold text-white tracking-tight tabular-nums relative inline-block">
                 <span className="text-zinc-500 mr-2">±</span>{fmt(data.expectedMoveDollars)}
               </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                 <span className="text-[9px] font-bold text-bull uppercase tracking-widest">Upper Bound</span>
                 <span className="text-[13px] font-mono font-bold text-bull">{fmt(data.upperBound)}</span>
              </div>
              <div className="w-full flex-1 mx-4 h-px bg-white/10 dashed relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
              <div className="flex flex-col gap-1 text-right">
                 <span className="text-[9px] font-bold text-bear uppercase tracking-widest">Lower Bound</span>
                 <span className="text-[13px] font-mono font-bold text-bear">{fmt(data.lowerBound)}</span>
              </div>
            </div>
         </div>

         {/* Put/Call Ratio */}
         {data.putCallRatio > 0 && (
           <div className="pt-4 border-t border-white/5 flex items-center justify-between">
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Put/Call Ratio</span>
             <span className={`text-[12px] font-mono font-bold ${data.putCallRatio > 1.2 ? 'text-bear' : data.putCallRatio < 0.8 ? 'text-bull' : 'text-zinc-300'}`}>
               {data.putCallRatio.toFixed(2)}
             </span>
           </div>
         )}
         
         <div className="pt-4 text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">
           Exp: {new Date(data.expirationDate).toISOString().split('T')[0]}
         </div>
       </div>
    </div>
  );
}
