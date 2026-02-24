'use client';

import React, { useState } from 'react';
import { QuarterlyReport } from '@/lib/stock-details';

interface InteractiveEarningsProps {
  reports: QuarterlyReport[];
  currency: string;
}

export function InteractiveEarnings({ reports, currency }: InteractiveEarningsProps) {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  
  if (!reports || reports.length === 0) {
    return <div className="text-[11px] text-zinc-600 italic">No historical quarterly data available.</div>;
  }

  const active = reports[activeIdx];

  // Helper for formatting large numbers
  const fmtBig = (val: number | null) => {
    if (val === null) return '—';
    const abs = Math.abs(val);
    if (abs >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const fmtEPS = (val: number | null) => (val !== null ? `$${val.toFixed(2)}` : '—');

  // Calculate Net Margin
  const margin = active.revenue && active.netIncome 
    ? (active.netIncome / active.revenue) * 100 
    : null;

  return (
    <div className="space-y-6">
      {/* ── QUARTER SELECTOR ─────────────────────────────────── */}
      <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
        {reports.map((q, idx) => {
          const isSelected = activeIdx === idx;
          const beat = q.epsSurprise !== null ? q.epsSurprise > 0 : null;
          
          return (
            <button
              key={q.date}
              onClick={() => setActiveIdx(idx)}
              className={`flex-1 py-2 px-1 rounded-md transition-all relative overflow-hidden group ${
                isSelected ? 'bg-white/10 shadow-sm' : 'hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium tracking-tight ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                  {q.date}
                </span>
                <div className={`w-1 h-1 rounded-full ${
                  beat === true ? 'bg-bull shadow-[0_0_6px_#10b981]' : 
                  beat === false ? 'bg-bear shadow-[0_0_6px_#f43f5e]' : 
                  'bg-zinc-700'
                }`} />
              </div>
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-matrix" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── FLASH REPORT CARD ────────────────────────────────── */}
      <div className="glass-panel p-5 bg-matrix/[0.02] border-matrix/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-matrix/5 rounded-full blur-3xl" />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h4 className="text-white font-semibold text-sm tracking-tight">{active.date} Flash Report</h4>
            <span className="text-[10px] text-zinc-500 mt-0.5">Reported on {active.reportedDate || 'TBD'}</span>
          </div>
          <div className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-widest border ${
            active.epsSurprise && active.epsSurprise > 0 ? 'bg-bull/10 border-bull/20 text-bull' : 'bg-bear/10 border-bear/20 text-bear'
          }`}>
            {active.epsSurprise && active.epsSurprise > 0 ? 'TRIPLE BEAT' : 'UNDERPERFORMED'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          {/* Top Line: Revenue */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 focus-ring">Total Revenue</span>
              <span className="text-lg font-mono font-bold text-white tracking-tight">{fmtBig(active.revenue)}</span>
            </div>
            
            {/* Visual Bar: Revenue vs Net Income */}
            <div className="space-y-1.5">
               <div className="flex justify-between text-[9px] text-zinc-500 uppercase tracking-tighter">
                 <span>Capture Ratio</span>
                 <span>{margin ? `${margin.toFixed(1)}% Margin` : '—'}</span>
               </div>
               <div className="h-3 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5 p-[1.5px]">
                 <div className="h-full bg-gradient-to-r from-matrix/60 to-matrix rounded-full transition-all duration-1000" 
                      style={{ width: `${margin ? Math.min(100, margin * 2) : 0}%` }} />
               </div>
               <span className="text-[9px] text-zinc-600 block mt-1 leading-tight">
                 For every dollar of revenue, {active.netIncome ? fmtBig(active.netIncome) : '—'} was retained as pure profit.
               </span>
            </div>
          </div>

          {/* Bottom Line: EPS Details */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Earnings Per Share</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-bold text-white tracking-tight">{fmtEPS(active.epsActual)}</span>
                <span className="text-[10px] text-zinc-500 font-mono">/ {fmtEPS(active.epsEstimate)} est</span>
              </div>
            </div>

            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-lg">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] text-zinc-500">Surprise Delta</span>
                 <span className={`text-[11px] font-mono font-bold ${active.epsSurprise && active.epsSurprise > 0 ? 'text-bull' : 'text-bear'}`}>
                   {active.epsSurprise && active.epsSurprise > 0 ? '+' : ''}{active.epsSurprise?.toFixed(2)}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[10px] text-zinc-500">Percentage</span>
                 <span className={`text-[11px] font-mono font-bold ${active.epsSurprisePercent && active.epsSurprisePercent > 0 ? 'text-bull' : 'text-bear'}`}>
                   {active.epsSurprisePercent && active.epsSurprisePercent > 0 ? '+' : ''}{active.epsSurprisePercent?.toFixed(1)}%
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL HIGHLIGHTS ────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-white/5">
           <div className="grid grid-cols-3 gap-4">
             <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase mb-1">Net Income</span>
                <span className="text-xs font-mono text-zinc-300">{fmtBig(active.netIncome)}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase mb-1">Fiscal Pd</span>
                <span className="text-xs font-mono text-zinc-300">{active.fiscalQuarter}</span>
             </div>
             <div className="flex flex-col items-end text-right">
                <span className="text-[9px] text-zinc-600 uppercase mb-1">Market Reaction</span>
                {active.priceReactionPct !== null ? (
                  <span className={`text-[11px] font-mono font-bold ${active.priceReactionPct > 0 ? 'text-bull' : 'text-bear'}`}>
                    {active.priceReactionPct > 0 ? '▲' : '▼'} {Math.abs(active.priceReactionPct).toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded italic whitespace-nowrap">Hist. Unavailable</span>
                )}
             </div>
           </div>
        </div>
      </div>
      
      {/* Mini Legend */}
      <div className="flex justify-center gap-6 text-[9px] text-zinc-600 uppercase tracking-widest">
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-bull" /> Beat Estimate</div>
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-bear" /> Missed Estimate</div>
      </div>
    </div>
  );
}
