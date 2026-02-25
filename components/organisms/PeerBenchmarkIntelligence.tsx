"use client";
import React from 'react';
import { PeerMetrics } from '@/lib/stock-details';
import { fmtPct, fmtRatio, fmt } from '@/lib/format';

interface PeerBenchmarkIntelligenceProps {
  currentTicker: string;
  currentPrice: number;
  currentPE: number | null;
  currentMargin: number | null;
  currentGrowth: number | null;
  peer: PeerMetrics | null;
}

export function PeerBenchmarkIntelligence({ 
  currentTicker, 
  currentPrice, 
  currentPE, 
  currentMargin, 
  currentGrowth, 
  peer 
}: PeerBenchmarkIntelligenceProps) {
  if (!peer) return null;

  const metrics = [
    { label: 'Forward P/E', current: currentPE, peer: peer.forwardPE, type: 'ratio' as const },
    { label: 'Profit Margin', current: currentMargin, peer: peer.profitMargin, type: 'pct' as const },
    { label: 'Revenue Growth', current: currentGrowth, peer: peer.revenueGrowth, type: 'pct' as const },
  ];

  return (
    <div className="glass-card border border-white/10 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-indigo-500" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300">Forensic Peer Comparison</h3>
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 py-0.5 border border-white/10">Competitor: {peer.ticker}</span>
      </div>

      <div className="p-6 space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
           <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Benchmark Mode</span>
              <h4 className="text-sm font-bold text-white uppercase">{currentTicker} <span className="text-zinc-500 mx-2 text-[10px]">VS</span> {peer.name}</h4>
           </div>
           <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Peer Value</span>
              <span className="text-lg font-mono font-bold text-white">{fmt(peer.price)}</span>
           </div>
        </div>

        <div className="space-y-8">
           {metrics.map((m, i) => {
             const diff = (m.current && m.peer) ? m.current - m.peer : 0;
             const isBetter = m.label === 'Forward P/E' ? diff < 0 : diff > 0;
             
             return (
               <div key={i} className="space-y-3">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                    <span className="text-zinc-400">{m.label}</span>
                    <span className={isBetter ? 'text-bull' : 'text-bear'}>
                       {diff > 0 ? '+' : ''}{m.type === 'pct' ? (diff * 100).toFixed(2) + '%' : diff.toFixed(2)} vs Sector
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/[0.02] border border-white/5 p-3">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">{currentTicker}</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {m.current !== null ? (m.type === 'pct' ? fmtPct(m.current) : fmtRatio(m.current)) : '—'}
                        </span>
                     </div>
                     <div className="bg-white/[0.02] border border-white/5 p-3">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">{peer.ticker}</span>
                        <span className="text-sm font-mono font-bold text-zinc-400">
                          {m.peer !== null ? (m.type === 'pct' ? fmtPct(m.peer) : fmtRatio(m.peer)) : '—'}
                        </span>
                     </div>
                  </div>

                  <div className="relative h-1 bg-white/5 w-full">
                     <div 
                       className={`absolute top-0 bottom-0 transition-all duration-700 ${isBetter ? 'bg-bull' : 'bg-bear'}`} 
                       style={{ 
                         left: isBetter ? '0' : 'auto', 
                         right: isBetter ? 'auto' : '0',
                         width: `${Math.min(100, Math.abs(diff / (m.peer || 1)) * 100)}%` 
                       }} 
                     />
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
}
