"use client";
import React from 'react';
import { MacroSnapshot, MacroIndicator } from "@/lib/macro-analysis";
import { fmtPct, fmtRatio } from "@/lib/format";
import { AIIcon, HealthIcon, StatsIcon, CalendarIcon } from "@/components/Icons";

interface MacroOverlayProps {
  snapshot: MacroSnapshot;
}

export function MacroOverlay({ snapshot }: MacroOverlayProps) {
  const { regime, implications, fedFunds, inflation, yieldCurve, unemployment } = snapshot;

  const getRegimeColor = (r: string) => {
    switch(r) {
      case 'GOLDILOCKS': return 'text-bull';
      case 'RECESSION':
      case 'STAGFLATION': return 'text-bear';
      case 'REFLATION': return 'text-amber-400';
      default: return 'text-zinc-400';
    }
  };

  const getRegimeBg = (r: string) => {
    switch(r) {
      case 'GOLDILOCKS': return 'bg-bull/10 border-bull/20';
      case 'RECESSION':
      case 'STAGFLATION': return 'bg-bear/10 border-bear/20';
      case 'REFLATION': return 'bg-amber-500/10 border-amber-500/20';
      default: return 'bg-white/5 border-white/10';
    }
  };

  return (
    <section className="glass-card border border-white/10 overflow-hidden relative group bg-[#050505]">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/40 to-transparent" />
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between lg:flex-row flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 glass-card rounded-lg flex items-center justify-center text-matrix bg-matrix/5 border-matrix/20">
            <HealthIcon />
          </div>
          <div>
            <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] mb-1">Macro Overlay</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Global Economic Context Layer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Market Regime</span>
            <div className={`px-3 py-1 border text-[11px] font-bold uppercase tracking-widest ${getRegimeBg(regime)} ${getRegimeColor(regime)}`}>
              {regime}
            </div>
          </div>
        </div>
      </div>

      {/* Logic Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5 border-b border-white/5">
        <MacroMetric indicator={fedFunds} label="Fed Funds" />
        <MacroMetric indicator={inflation} label="Inflation YoY" />
        <MacroMetric indicator={yieldCurve} label="Yield Spread" />
        <MacroMetric indicator={unemployment} label="Unemployment" />
      </div>

      {/* Strategic Implications */}
      <div className="p-6 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-4">
          <AIIcon />
          <span className="text-[10px] font-bold text-matrix uppercase tracking-[0.2em]">Institutional Implications</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {implications.map((imp, i) => (
            <div key={i} className="flex gap-3 items-start p-3 bg-black/40 border border-white/5 rounded-lg">
              <div className="w-1 h-1 bg-matrix rounded-full mt-1.5 shrink-0" />
              <p className="text-[12px] text-zinc-400 font-medium leading-relaxed">{imp}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 bg-white/[0.02] text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] flex justify-between">
        <span>Source: Federal Reserve Economic Data (FRED)</span>
        <span className="text-zinc-500 italic">Global Macro Synthesis Active</span>
      </div>
    </section>
  );
}

function MacroMetric({ indicator, label }: { indicator: MacroIndicator, label: string }) {
  const isUp = indicator.status === 'UP';
  const isDown = indicator.status === 'DOWN';
  const color = isUp ? 'text-bull' : isDown ? 'text-bear' : 'text-zinc-400';

  return (
    <div className="p-6 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-mono font-bold text-white tracking-tighter">
          {indicator.unit === 'pct' ? `${indicator.currentValue.toFixed(2)}%` : indicator.currentValue.toFixed(2)}
        </span>
        <span className={`text-[10px] font-bold font-mono ${color}`}>
          {isUp ? '↑' : isDown ? '↓' : '→'}
        </span>
      </div>
      <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-zinc-500 font-mono">
        <span>PREV: {indicator.previousValue.toFixed(2)}</span>
        <span className={color}>{indicator.change > 0 ? '+' : ''}{indicator.change.toFixed(2)}</span>
      </div>
    </div>
  );
}
