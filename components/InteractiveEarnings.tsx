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
    return <div className="text-[11px] text-zinc-600 italic border border-white/5 p-4">No historical quarterly data available.</div>;
  }

  // Ensure reports are sorted chronologically for the chart (oldest to newest left-to-right)
  const sortedReports = [...reports].reverse();
  const active = reports[activeIdx];
  const activeSortedIdx = sortedReports.findIndex(r => r.date === active.date);

  // Helper for formatting large numbers
  const fmtBig = (val: number | null) => {
    if (val === null) return '—';
    const abs = Math.abs(val);
    if (abs >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const fmtEPS = (val: number | null) => (val !== null ? `$${val.toFixed(2)}` : '—');

  // Chart Calculations
  const maxEps = Math.max(...sortedReports.map(r => Math.max(r.epsActual || 0, r.epsEstimate || 0)), 0.01);
  const minEps = Math.min(...sortedReports.map(r => Math.min(r.epsActual || 0, r.epsEstimate || 0)), 0);
  const range = maxEps - minEps;
  
  return (
    <div className="space-y-6">
      {/* ── VISUAL BEAT/MISS TIMELINE ───────────────────────────────── */}
      <div className="bg-[#0a0a0a] border border-white/10 p-5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
           <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Quarterly Alpha Trajectory</span>
           <div className="flex items-center gap-4 text-[9px] font-mono font-bold tracking-widest uppercase">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-white" /> Actual</span>
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-zinc-700" /> Estimate</span>
           </div>
        </div>

        <div className="h-48 flex items-end justify-between gap-2 relative">
           {sortedReports.map((q, idx) => {
             const isSelected = activeSortedIdx === idx;
             const actualH = q.epsActual !== null ? ((q.epsActual - minEps) / range) * 100 : 0;
             const estH = q.epsEstimate !== null ? ((q.epsEstimate - minEps) / range) * 100 : 0;
             const isBeat = q.epsSurprise !== null && q.epsSurprise > 0;
             const isMiss = q.epsSurprise !== null && q.epsSurprise < 0;

             return (
                <button 
                  key={idx}
                  onClick={() => setActiveIdx(reports.findIndex(r => r.date === q.date))}
                  className="flex-1 group relative flex flex-col justify-end h-full outline-none"
                >
                  <div className={`absolute inset-0 border border-white/5 transition-all z-0 ${isSelected ? 'bg-white/[0.03] border-white/20' : 'group-hover:bg-white/[0.01]'}`} />
                  
                  {/* Price Reaction Marker (Earnings Beta) */}
                  {q.priceReactionPct !== null && (
                    <div className="absolute top-2 w-full flex justify-center z-20">
                      <div className={`text-[9px] font-mono font-bold px-1 py-0.5 border ${
                        q.priceReactionPct > 0 
                          ? 'text-bull border-bull/20 bg-bull/5' 
                          : 'text-bear border-bear/20 bg-bear/5'
                      }`}>
                        {q.priceReactionPct > 0 ? '+' : ''}{q.priceReactionPct.toFixed(1)}%
                      </div>
                    </div>
                  )}

                  <div className="w-full flex justify-center items-end gap-1 px-1 z-10 relative h-[80%] pb-2">
                     <div 
                       className="w-1/2 bg-zinc-700 transition-all" 
                       style={{ height: `${Math.max(estH, 2)}%` }} 
                     />
                     <div 
                       className={`w-1/2 transition-all ${isBeat ? 'bg-bull' : isMiss ? 'bg-bear' : 'bg-white'}`} 
                       style={{ height: `${Math.max(actualH, 2)}%` }} 
                     />
                  </div>
                  <div className={`text-center py-2 text-[10px] font-bold tracking-widest uppercase border-t z-10 transition-all ${isSelected ? 'text-white border-white/20' : 'text-zinc-500 border-white/5 group-hover:text-zinc-300'}`}>
                    {q.fiscalQuarter || q.date.substring(0, 7)}
                  </div>
                </button>
             );
           })}
        </div>
      </div>

      {/* ── FLASH REPORT CARD ────────────────────────────────── */}
      <div className="bg-[#111111] p-5 border border-white/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex flex-col">
            <h4 className="text-white font-bold text-[14px] tracking-[0.1em] uppercase">{active.fiscalQuarter || active.date} Earnings Block</h4>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-mono">Reported {active.reportedDate || active.date}</span>
          </div>
          <div className={`px-3 py-1 text-[11px] font-bold font-mono tracking-widest border transition-colors ${
            active.epsSurprise && active.epsSurprise > 0 ? 'bg-bull/10 border-bull/30 text-bull' : 
            active.epsSurprise && active.epsSurprise < 0 ? 'bg-bear/10 border-bear/30 text-bear' : 
            'bg-white/5 border-white/20 text-white'
          }`}>
            {active.epsSurprise && active.epsSurprise > 0 ? 'POSITIVE SURPRISE' : 
             active.epsSurprise && active.epsSurprise < 0 ? 'NEGATIVE DEVIATION' : 'IN-LINE RESULTS'}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Gross Output (Rev)</span>
              <div className="text-xl font-mono font-bold text-white tracking-tighter tabular-nums">{fmtBig(active.revenue)}</div>
           </div>
           
           <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Net Retention (Income)</span>
              <div className="text-xl font-mono font-bold text-white tracking-tighter tabular-nums">{fmtBig(active.netIncome)}</div>
           </div>

           <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">EPS (Actual vs Est)</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-white tracking-tighter tabular-nums">{fmtEPS(active.epsActual)}</span>
                <span className="text-[11px] font-mono font-bold text-zinc-500">/ {fmtEPS(active.epsEstimate)}</span>
              </div>
           </div>

           <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Price Reaction Beta</span>
              <div className="text-xl font-mono font-bold tracking-tighter tabular-nums">
                {active.priceReactionPct !== null ? (
                  <span className={active.priceReactionPct > 0 ? 'text-bull' : 'text-bear'}>
                    {active.priceReactionPct > 0 ? '+' : ''}{active.priceReactionPct.toFixed(2)}%
                  </span>
                ) : <span className="text-zinc-600">—</span>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
});
