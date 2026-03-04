"use client";
import React from "react";
import { SectorMetric, MarketPulseData } from "@/lib/market-pulse";
import { StealthTooltip } from "@/components/LiveTelemetry";

interface MarketPulseProps {
  data: MarketPulseData;
}

export function MarketPulse({ data }: MarketPulseProps) {
  const { breadthPercent, sectors, breadthAdvancing, breadthDeclining, macro, regime } = data;

  return (
    <div className="space-y-6">
      {/* GLOBAL REGIME RADAR */}
      <div className="glass-card p-6 border border-white/10 relative overflow-hidden bg-gradient-to-br from-zinc-900/50 to-black/80">
        <div className="flex items-center gap-2 mb-6">
           <div className={`w-1.5 h-1.5 rounded-full ${regime.type === 'MOMENTUM' ? 'bg-bull' : regime.type === 'MEAN_REVERSION' ? 'bg-matrix' : 'bg-zinc-500'} animate-pulse`} />
           <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Regime Radar</h2>
        </div>
        
        <div className="mb-4">
           <p className="text-[12px] font-black text-white uppercase tracking-wider mb-1">{regime.type.replace('_', ' ')}</p>
           <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Predictability</span>
              <span className="text-[11px] font-mono font-bold text-matrix">{Math.round(regime.predictability * 100)}%</span>
           </div>
        </div>

        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
           <div 
             className={`h-full transition-all duration-1000 ${regime.type === 'MOMENTUM' ? 'bg-bull shadow-[0_0_10px_rgba(34,197,94,0.5)]' : regime.type === 'MEAN_REVERSION' ? 'bg-matrix shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-zinc-700'}`}
             style={{ width: `${regime.predictability * 100}%` }}
           />
        </div>
        
        <p className="mt-4 text-[9px] text-zinc-500 font-medium leading-relaxed uppercase tracking-tighter">
           Hurst Index: <span className="text-zinc-300 font-mono">{regime.score.toFixed(3)}</span>. Market is currently <span className="text-white">{regime.type === 'RANDOM_WALK' ? 'stochastic/noisy' : regime.type === 'MOMENTUM' ? 'trending persistently' : 'reverting to mean'}</span>.
        </p>
      </div>

      {/* Macro Environment */}
      <div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
          Macro pulse
        </h2>
        <div className="flex flex-col gap-5">
           <MacroPanelItem name="SPY" desc="S&P 500" value={macro.spy.value.toFixed(2)} change={macro.spy.change} />
           <MacroPanelItem name="VIX" desc="Volatility" value={macro.vix.value.toFixed(2)} change={macro.vix.change} />
           <MacroPanelItem name="BTC" desc="Bitcoin" value={macro.btc.value.toFixed(2)} change={macro.btc.change} />
           <div className="h-px bg-white/5 w-full my-1" />
           <MacroPanelItem name="US10Y" desc="10Y Yield" value={`${macro.us10y.value.toFixed(2)}%`} change={macro.us10y.change} />
        </div>
      </div>

      {/* Breadth Engine Widget */}
      <div className="glass-card p-6 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${breadthPercent >= 50 ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
          Market Breadth
        </h2>
        
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-3xl font-bold font-mono text-white tracking-tighter">{breadthPercent}%</span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-zinc-400">
            <span className="flex items-center gap-0.5">{breadthAdvancing}<span className="text-bull text-[10px]">▲</span></span>
            <span className="opacity-30">/</span>
            <span className="flex items-center gap-0.5">{breadthDeclining}<span className="text-bear text-[10px]">▼</span></span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
          <div 
            className={`h-full transition-all duration-1000 ${breadthPercent > 50 ? 'bg-bull' : 'bg-bear'}`} 
            style={{ width: `${breadthPercent}%` }} 
          />
        </div>
      </div>

      {/* Sector Momentum Heatmap */}
      <div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
          Sector Health
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {sectors.slice(0, 8).map((s) => (
            <SectorRow key={s.ticker} sector={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MacroPanelItem({ name, desc, value, change }: { name: string; desc: string; value: string; change: number }) {
  const isUp = change >= 0;
  return (
    <div className="flex items-center justify-between group/item">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-white tracking-tight">{name}</span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">{desc}</p>
      </div>
      <div className="text-right">
        <span className="text-[13px] font-bold font-mono text-zinc-400 group-hover/item:text-white transition-colors">{value}</span>
      </div>
    </div>
  );
}

function SectorRow({ sector }: { sector: SectorMetric }) {
  const isUp = sector.changePercent > 0;
  
  return (
    <div className="flex items-center justify-between group/row p-2 -mx-2 hover:bg-white/[0.02] transition-all rounded-md">
      <div className="flex items-center gap-3">
        <div className={`w-[2px] h-3 transition-all duration-300 ${isUp ? 'bg-bull shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-bear/30'}`} />
        <span className="text-[11px] font-bold text-zinc-500 group-hover/row:text-zinc-300 transition-colors uppercase tracking-[0.1em]">
          {sector.name}
        </span>
      </div>
      <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-bull' : 'text-bear'}`}>
        {isUp ? '▲' : '▼'} {Math.abs(sector.changePercent).toFixed(1)}%
      </span>
    </div>
  );
}
