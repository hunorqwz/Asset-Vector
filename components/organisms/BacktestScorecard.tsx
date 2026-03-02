"use client";
import React from "react";

interface BacktestStats {
  winRate: number;
  totalPicks: number;
  evaluatedCount: number;
  avgPerformance: number;
  latestPicks: Array<{
    ticker: string;
    entry: number;
    current: number | null;
    status: 'WIN' | 'LOSS' | 'PENDING';
    date: Date;
  }>;
}

export function BacktestScorecard({ data }: { data: BacktestStats | null }) {
  if (!data) return null;

  return (
    <div className="glass-card border border-matrix/20 bg-matrix/5 p-6 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
        <span className="text-[40px] font-black text-matrix">AUDIT</span>
      </div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-2 rounded-full bg-matrix shadow-[0_0_8px_hsla(var(--matrix)/0.6)]" />
        <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Alpha Track Record</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="text-[24px] font-bold text-white leading-none">
            {data.winRate.toFixed(1)}%
          </p>
          <p className="text-[9px] font-bold text-matrix uppercase tracking-widest mt-1">Accuracy</p>
        </div>
        <div>
          <p className="text-[24px] font-bold text-white leading-none">
            {data.avgPerformance > 0 ? "+" : ""}{data.avgPerformance.toFixed(2)}%
          </p>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Avg Alpha</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          <span>Recent Picks</span>
          <span>Status</span>
        </div>
        {data.latestPicks.map((pick, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{pick.ticker}</span>
              <span className="text-zinc-500 text-[10px] tabular-nums">@{pick.entry.toFixed(2)}</span>
            </div>
            <span className={`font-bold px-1.5 py-0.5 rounded-sm text-[9px] tracking-tighter ${
              pick.status === 'WIN' ? 'bg-bull/20 text-bull border border-bull/30' :
              pick.status === 'LOSS' ? 'bg-bear/20 text-bear border border-bear/30' :
              'bg-white/5 text-zinc-500 border border-white/10'
            }`}>
              {pick.status}
            </span>
          </div>
        ))}
        {data.totalPicks === 0 && (
          <p className="text-[10px] text-zinc-600 italic py-4">No institutional picks archived yet.</p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-[0.1em]">
        <span>Samples: {data.totalPicks}</span>
        <span>Audited: {data.evaluatedCount}</span>
      </div>
    </div>
  );
}
