'use client';

import React, { useState } from 'react';
import { QuarterlyReport } from '@/lib/stock-details';

interface InteractiveEarningsProps {
  reports: QuarterlyReport[];
  currency: string;
}

export const InteractiveEarnings = React.memo(function InteractiveEarnings({ reports, currency }: InteractiveEarningsProps) {
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
              className={`flex-1 py-2 px-1 transition-all relative overflow-hidden group ${
                isSelected ? 'bg-[#111111] shadow-none' : 'hover:bg-[#111111]/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[11px] font-bold tracking-widest uppercase ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  {q.date}
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  beat === true ? 'bg-bull' : 
                  beat === false ? 'bg-bear' : 
                  'bg-zinc-700'
                }`} />
              </div>
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── FLASH REPORT CARD ────────────────────────────────── */}
      <div className="bg-[#0a0a0a] p-5 border border-white/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h4 className="text-white font-bold text-[15px] tracking-tight">{active.date} Flash Report</h4>
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Released on {active.reportedDate || 'STABLE'}</span>
          </div>
          <div className={`px-3 py-1.5 text-[11px] font-bold tracking-[0.15em] border shadow-none ${
            active.epsSurprise && active.epsSurprise > 0 ? 'bg-bull/10 border-bull/30 text-bull' : 'bg-bear/10 border-bear/30 text-bear'
          }`}>
            {active.epsSurprise && active.epsSurprise > 0 ? 'BULLISH SURPRISE' : 'BEARISH DEVIATION'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          {/* Top Line: Revenue */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-[0.15em] mb-2">Total Output (Rev)</span>
              <span className="text-2xl font-mono font-bold text-white tracking-tighter tabular-nums">{fmtBig(active.revenue)}</span>
            </div>
            
            {/* Visual Bar: Revenue vs Net Income */}
            <div className="space-y-2">
               <div className="flex justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                 <span>Efficiency Capture</span>
                 <span className={`${margin && margin > 0 ? 'text-bull' : 'text-bear'}`}>{margin ? `${margin.toFixed(1)}% Margin` : '—'}</span>
               </div>
               <div className="h-4 w-full bg-white/5 overflow-hidden border border-white/10 p-1">
                 <div className="h-full bg-white transition-all duration-1000 shadow-none" 
                      style={{ width: `${margin ? Math.min(100, margin * 2) : 0}%` }} />
               </div>
               <span className="text-[11px] text-zinc-500 font-medium block mt-2 leading-relaxed">
                 Retained <span className="text-zinc-200 font-bold">{active.netIncome ? fmtBig(active.netIncome) : '—'}</span> as pure capital from total output.
               </span>
            </div>
          </div>

          {/* Bottom Line: EPS Details */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-[0.15em] mb-2">Earnings Per Share</span>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-mono font-bold text-white tracking-tighter tabular-nums">{fmtEPS(active.epsActual)}</span>
                <span className="text-[12px] text-zinc-500 font-mono font-bold tracking-widest">/ {fmtEPS(active.epsEstimate)} EST</span>
              </div>
            </div>

            <div className="p-4 bg-transparent border border-white/10 space-y-3 shadow-none">
               <div className="flex justify-between items-center">
                 <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Variance Delta</span>
                 <span className={`text-[12px] font-mono font-bold px-2 py-0.5 border ${active.epsSurprise && active.epsSurprise > 0 ? 'bg-bull/10 border-bull/30 text-bull' : 'bg-bear/10 border-bear/30 text-bear'}`}>
                   {active.epsSurprise && active.epsSurprise > 0 ? '+' : ''}{active.epsSurprise?.toFixed(2)}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Percentage</span>
                 <span className={`text-[12px] font-mono font-bold ${active.epsSurprisePercent && active.epsSurprisePercent > 0 ? 'text-bull' : 'text-bear'}`}>
                   {active.epsSurprisePercent && active.epsSurprisePercent > 0 ? '+' : ''}{active.epsSurprisePercent?.toFixed(1)}%
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL HIGHLIGHTS ────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-white/5">
           <div className="grid grid-cols-3 gap-4">
         <div className="grid grid-cols-3 gap-8">
           <div className="flex flex-col">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Net Income</span>
              <span className="text-[12px] font-mono font-bold text-zinc-200 uppercase">{fmtBig(active.netIncome)}</span>
           </div>
           <div className="flex flex-col">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Fiscal Period</span>
              <span className="text-[12px] font-mono font-bold text-zinc-200 uppercase">{active.fiscalQuarter}</span>
           </div>
           <div className="flex flex-col items-end text-right">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Market Delta</span>
              {active.priceReactionPct !== null ? (
                <span className={`text-[13px] font-mono font-bold tracking-tighter ${active.priceReactionPct > 0 ? 'text-bull' : 'text-bear'}`}>
                  {active.priceReactionPct > 0 ? '▲' : '▼'} {Math.abs(active.priceReactionPct).toFixed(2)}%
                </span>
              ) : (
                <span className="text-[11px] font-bold text-zinc-600 bg-white/5 px-3 py-1 rounded-lg uppercase tracking-widest">N/A</span>
              )}
           </div>
         </div>
           </div>
        </div>
      </div>
      
      {/* Mini Legend */}
      <div className="flex justify-center gap-10 text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] pt-4">
        <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-bull" /> Growth Consumed</div>
        <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-bear" /> Target Divergence</div>
      </div>
    </div>
  );
});
