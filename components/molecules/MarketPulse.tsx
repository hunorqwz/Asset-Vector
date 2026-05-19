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
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] relative overflow-hidden">
        <h3 className="text-[13px] font-semibold text-white mb-6">Market Trend</h3>
        
        <div className="mb-4">
           <p className="text-[14px] font-medium text-white mb-1">
             {regime.type === 'MOMENTUM' ? 'Trending' : regime.type === 'MEAN_REVERSION' ? 'Reverting' : 'Choppy / Uncertain'}
           </p>
           <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-zinc-500">Trend Strength</span>
              <span className="text-[12px] font-mono font-medium text-zinc-300">{Math.round(regime.predictability * 100)}%</span>
           </div>
        </div>

        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
           <div 
             className={`h-full transition-all duration-1000 ${regime.type === 'MOMENTUM' ? 'bg-green-500' : regime.type === 'MEAN_REVERSION' ? 'bg-blue-500' : 'bg-zinc-500'}`}
             style={{ width: `${regime.predictability * 100}%` }}
           />
        </div>
      </div>

      {/* Macro Environment */}
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] relative overflow-hidden">
        <h3 className="text-[13px] font-semibold text-white mb-6">Macro Environment</h3>
        <div className="flex flex-col gap-4">
           <MacroPanelItem name="SPY" desc="S&P 500" value={macro.spy.value.toFixed(2)} change={macro.spy.change} />
           <MacroPanelItem name="VIX" desc="Volatility" value={macro.vix.value.toFixed(2)} change={macro.vix.change} />
           <MacroPanelItem name="BTC" desc="Bitcoin" value={macro.btc.value.toFixed(2)} change={macro.btc.change} />
           <div className="h-px bg-white/5 w-full my-1" />
           <MacroPanelItem name="US10Y" desc="10Y Yield" value={`${macro.us10y.value.toFixed(2)}%`} change={macro.us10y.change} />
        </div>
      </div>

      {/* Breadth Engine Widget */}
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] relative overflow-hidden">
        <h3 className="text-[13px] font-semibold text-white mb-6">Market Breadth</h3>
        
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-2xl font-semibold font-mono text-white tracking-tight">{breadthPercent}%</span>
          <div className="flex items-center gap-2 text-[12px] font-mono font-medium text-zinc-400">
            <span className="flex items-center gap-1">{breadthAdvancing}<span className="text-green-500">▲</span></span>
            <span className="opacity-30">/</span>
            <span className="flex items-center gap-1">{breadthDeclining}<span className="text-red-500">▼</span></span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
          <div 
            className={`h-full transition-all duration-1000 ${breadthPercent > 50 ? 'bg-green-500' : 'bg-red-500'}`} 
            style={{ width: `${breadthPercent}%` }} 
          />
        </div>
      </div>

      {/* Sector Momentum Heatmap */}
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] relative overflow-hidden">
        <h3 className="text-[13px] font-semibold text-white mb-4">Sector Health</h3>

        <div className="grid grid-cols-1 gap-2">
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
          <span className="text-[13px] font-medium text-white">{name}</span>
          <span className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${isUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <p className="text-[12px] text-zinc-500 font-medium">{desc}</p>
      </div>
      <div className="text-right">
        <span className="text-[13px] font-medium font-mono text-zinc-400 group-hover/item:text-white transition-colors">{value}</span>
      </div>
    </div>
  );
}

function SectorRow({ sector }: { sector: SectorMetric }) {
  const isUp = sector.changePercent > 0;
  
  return (
    <div className="flex items-center justify-between group/row p-2 -mx-2 hover:bg-white/[0.02] transition-all rounded-md">
      <div className="flex items-center gap-3">
        <div className={`w-[3px] h-3 rounded-full transition-all duration-300 ${isUp ? 'bg-green-500' : 'bg-red-500/30'}`} />
        <span className="text-[12px] font-medium text-zinc-400 group-hover/row:text-zinc-200 transition-colors tracking-wide">
          {sector.name}
        </span>
      </div>
      <span className={`text-[12px] font-mono font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
        {isUp ? '+' : ''}{sector.changePercent.toFixed(1)}%
      </span>
    </div>
  );
}
