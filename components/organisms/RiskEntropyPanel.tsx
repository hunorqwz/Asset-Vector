"use client";
import React from 'react';
import { RiskMetrics } from '@/lib/stock-details';
import { fmtPct } from '@/lib/format';

interface RiskEntropyPanelProps {
  metrics: RiskMetrics | null;
}

export const RiskEntropyPanel = React.memo(function RiskEntropyPanel({ metrics }: RiskEntropyPanelProps) {
  if (!metrics || !metrics.isValid) return null;

  const getSharpeQuality = (val: number) => {
    if (val >= 3) return { label: 'Exceptional', color: 'text-bull' };
    if (val >= 2) return { label: 'Very Good', color: 'text-bull' };
    if (val >= 1) return { label: 'Adequate', color: 'text-zinc-400' };
    return { label: 'Sub-Optimal', color: 'text-bear' };
  };

  const getSortinoQuality = (val: number) => {
    if (val >= 3) return { label: 'High Efficiency', color: 'text-bull' };
    if (val >= 2) return { label: 'Good Efficiency', color: 'text-bull' };
    if (val >= 1) return { label: 'Fair Balance', color: 'text-zinc-400' };
    return { label: 'Inefficient', color: 'text-bear' };
  };

  const sharpe = getSharpeQuality(metrics.sharpeRatio);
  const sortino = getSortinoQuality(metrics.sortinoRatio);

  return (
    <section className="bg-[#0a0a0a] p-6 relative overflow-hidden border border-white/10">
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-4 bg-white" />
          <div>
            <h2 className="text-[14px] font-bold tracking-[0.2em] text-white uppercase">Risk Analysis</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Reward-to-Volatility Analysis • Annualized 252-Day Matrix</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        
        {/* 1. SHARPE RATIO */}
        <div className="space-y-4 p-5 bg-[#111111] border border-white/10 transition-all">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <span>Sharpe Ratio</span>
            <span className={sharpe.color}>{sharpe.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">{metrics.sharpeRatio.toFixed(2)}</span>
            <span className="text-[12px] font-mono font-bold text-zinc-600">x</span>
          </div>
          <div className="space-y-2 pt-2 border-t border-white/5">
             <span className="text-[9px] text-zinc-500 leading-relaxed block">
               Measures return earned in excess of the risk-free rate per unit of volatility.
             </span>
             <div className="w-full h-1 bg-white/5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${sharpe.color.replace('text-', 'bg-')}`} 
                  style={{ width: `${Math.min(100, (metrics.sharpeRatio / 4) * 100)}%` }}
                />
             </div>
          </div>
        </div>

        {/* 2. SORTINO RATIO */}
        <div className="space-y-4 p-5 bg-[#111111] border border-white/10 transition-all">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <span>Sortino Ratio</span>
            <span className={sortino.color}>{sortino.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">{metrics.sortinoRatio.toFixed(2)}</span>
            <span className="text-[12px] font-mono font-bold text-zinc-600">x</span>
          </div>
          <div className="space-y-2 pt-2 border-t border-white/5">
             <span className="text-[9px] text-zinc-500 leading-relaxed block">
               Similar to Sharpe, but only penalizes downside volatility. Captures return per unit of 'bad' risk.
             </span>
             <div className="w-full h-1 bg-white/5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${sortino.color.replace('text-', 'bg-')}`} 
                  style={{ width: `${Math.min(100, (metrics.sortinoRatio / 4) * 100)}%` }}
                />
             </div>
          </div>
        </div>

        {/* 3. VOLATILITY MATRIX */}
        <div className="space-y-4 p-5 bg-[#111111] border border-white/10 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Variance Decomposition</span>
          <div className="space-y-4">
             <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Realized Vol</span>
                <span className="text-lg font-mono font-bold text-white">{fmtPct(metrics.realizedVolatility1Y)}</span>
             </div>
             <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Downside Dev</span>
                <span className="text-lg font-mono font-bold text-white">{fmtPct(metrics.downsideDeviation1Y)}</span>
             </div>
          </div>
        </div>

        {/* 4. TAIL RISK (MAX DD) */}
        <div className="space-y-4 p-5 bg-[#111111] border border-white/10 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Critical Tail Risk</span>
          <div className="flex flex-col gap-1">
             <span className="text-3xl font-mono font-bold text-bear tabular-nums">{fmtPct(metrics.maxDrawdown1Y)}</span>
             <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Maximum 1Y Drawdown</span>
          </div>
          <div className="pt-3">
             <div className="p-3 border border-bear/20 bg-bear/5">
                <span className="text-[9px] text-bear font-bold leading-tight block">
                  Asset experienced a {fmtPct(metrics.maxDrawdown1Y)} peak-to-trough decline within the last trailing year.
                </span>
             </div>
          </div>
        </div>

      </div>
    </section>
  );
});
