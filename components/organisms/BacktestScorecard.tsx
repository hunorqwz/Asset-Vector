"use client";
import React from "react";

import { BacktestReport } from "@/app/actions/backtest";
import Link from "next/link";

export function BacktestScorecard({ data }: { data: BacktestReport | null }) {
  if (!data) return null;

  return (
    <div className="glass-card border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/80 backdrop-blur-md p-6 overflow-hidden relative group transition-all duration-300">
      <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300">
        <span className="text-[50px] font-black text-matrix">AUDIT</span>
      </div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-sm bg-matrix shadow-[0_0_8px_hsla(var(--matrix)/0.6)]" />
          <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Alpha Track Record</h2>
        </div>
        <Link 
          href="/discovery/performance" 
          className="text-[9px] font-bold text-matrix uppercase tracking-widest hover:text-white transition-colors"
        >
          Full Report →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
        <div>
          <p className="text-[32px] tracking-tighter shadow-sm drop-shadow-[0_0_12px_rgba(255,255,255,0.1)] font-bold text-white leading-none">
            {data.winRate.toFixed(1)}%
          </p>
          <p className="text-[9px] font-bold text-matrix uppercase tracking-[0.2em] mt-2 delay-100">Accuracy</p>
        </div>
        <div>
          <p className="text-[32px] tracking-tighter shadow-sm drop-shadow-[0_0_12px_rgba(255,255,255,0.1)] font-bold text-white leading-none">
            {data.avgAlpha > 0 ? "+" : ""}{(data.avgAlpha * 100).toFixed(2)}%
          </p>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-2">Avg Alpha</p>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.15em]">
          <span>Recent Picks</span>
          <span>Status</span>
        </div>
        {data.recentPicks.slice(0, 5).map((pick, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] font-mono group-hover:bg-white/[0.02] p-1.5 -mx-1.5 rounded transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold tracking-wider">{pick.ticker}</span>
              <span className="text-zinc-600 text-[10px] tabular-nums">@{pick.entry.toFixed(2)}</span>
            </div>
            <span className={`font-bold px-1.5 py-0.5 rounded-sm text-[9px] tracking-wider uppercase ${
              pick.status === 'WIN' ? 'bg-bull/10 text-bull border border-bull/20' :
              pick.status === 'LOSS' ? 'bg-bear/10 text-bear border border-bear/20' :
              'bg-white/5 text-zinc-400 border border-white/10'
            }`}>
              {pick.status}
            </span>
          </div>
        ))}
        {data.totalPicks === 0 && (
          <p className="text-[10px] text-zinc-600 italic py-4">No institutional picks archived yet.</p>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] relative z-10">
        <span>Total: {data.totalPicks}</span>
        <span>Audited: {data.evaluatedCount}</span>
      </div>
    </div>
  );
}
