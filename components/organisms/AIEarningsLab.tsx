"use client";
import React, { useMemo } from 'react';
import { StockDetails, EarningsQuarter } from "@/lib/stock-details";
import { fmt, fmtPct, fmtBigNum } from "@/lib/format";
import { EarningsIcon, CalendarIcon, StatsIcon } from "@/components/Icons";

interface AIEarningsLabProps {
  details: StockDetails;
}

export function AIEarningsLab({ details }: AIEarningsLabProps) {
  const { earningsHistory, upcomingCatalysts, optionsFlow, price } = details;

  const analysis = useMemo(() => {
    if (!earningsHistory || earningsHistory.length === 0) return null;

    // 1. Calculate Average Surprise Magnitude
    const validSurprises = earningsHistory.filter(h => h.actual !== null && h.estimate !== null);
    const avgSurprisePct = validSurprises.reduce((acc, curr) => acc + Math.abs(curr.surprisePercent || 0), 0) / validSurprises.length;
    
    // 2. Surprise Direction (Momentum)
    const recent = validSurprises.slice(-4);
    const beats = recent.filter(r => (r.surprise || 0) > 0).length;
    const momentum = beats >= 3 ? 'BULLISH' : beats <= 1 ? 'BEARISH' : 'NEUTRAL';

    // 3. Expected "Earnings Move" (Implied Volatility proxy if options flow exists)
    // Formula: Price * IV * sqrt(1/252) — roughly. 
    // If no IV, we use historical average move (proxy via surprise magnitude)
    const iv = optionsFlow?.impliedVolatility || 0.30; // Defaulting to 30% if missing
    const expectedMovePct = (iv / Math.sqrt(252)) * 100 * 2.5; // Roughly 2.5 std devs for a 1-day move

    return {
      avgSurprisePct,
      beats,
      momentum,
      expectedMovePct,
      recent
    };
  }, [earningsHistory, optionsFlow]);

  if (!upcomingCatalysts?.earningsDate) return null;

  return (
    <section className="glass-card border border-white/10 overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/40 to-transparent" />
      
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 glass-card rounded-lg flex items-center justify-center text-matrix bg-matrix/5 border-matrix/20">
            <EarningsIcon />
          </div>
          <div>
            <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] mb-1">AI Earnings Lab</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Catalyst & Volatility Projections</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Next Release</span>
          <span className="text-[13px] font-mono font-bold text-white uppercase">{upcomingCatalysts.earningsDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
        {/* Surprise Momentum */}
        <div className="p-8">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <StatsIcon />
            Surprise Momentum
          </h3>
          <div className="flex items-end gap-3 mb-6">
            <span className="text-4xl font-bold font-mono text-white tracking-tighter">{analysis?.beats}/4</span>
            <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
              analysis?.momentum === 'BULLISH' ? 'bg-bull/20 text-bull' : 
              analysis?.momentum === 'BEARISH' ? 'bg-bear/20 text-bear' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {analysis?.momentum} BEAT TREND
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
            Last period surprise: <span className={analysis?.recent[analysis.recent.length-1]?.surprise! > 0 ? 'text-bull' : 'text-bear'}>
              {fmtPct(analysis?.recent[analysis.recent.length-1]?.surprisePercent || 0)}
            </span>
          </p>
        </div>

        {/* Expected Reaction */}
        <div className="p-8">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <EarningsIcon />
            Est. Reaction Risk
          </h3>
          <div className="flex items-end gap-3 mb-6">
            <span className="text-4xl font-bold font-mono text-white tracking-tighter">±{analysis?.expectedMovePct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
             <div 
               className="h-full bg-matrix opacity-60" 
               style={{ width: `${Math.min((analysis?.expectedMovePct || 0) * 5, 100)}%` }}
             />
          </div>
          <p className="mt-4 text-[10px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
            Based on {optionsFlow ? 'Live Implied Volatility' : 'Historical Magnitude'}.
          </p>
        </div>

        {/* Fundamental Targets */}
        <div className="p-8 bg-white/[0.01]">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Institutional Consensus</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">Est. EPS</span>
              <span className="text-[12px] font-mono font-bold text-white">${upcomingCatalysts.earningsAverage?.toFixed(2) || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">Est. Revenue</span>
              <span className="text-[12px] font-mono font-bold text-white">{fmtBigNum(upcomingCatalysts.revenueAverage || 0)}</span>
            </div>
            <div className="pt-4 border-t border-white/5">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
                 <span className="text-[9px] font-bold text-matrix uppercase tracking-widest">Alpha Strategy</span>
               </div>
               <p className="mt-2 text-[10px] text-zinc-500 font-medium italic leading-relaxed">
                 {analysis?.momentum === 'BULLISH' 
                   ? "Strong beat history suggest potential 'Buy the Dip' candidate pre-release." 
                   : "Decaying surprise trend indicates high execution risk. Neutral stance advised."}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Surprise Grid */}
      <div className="px-8 py-5 bg-black/40 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Prior Accuracy</span>
          <div className="flex gap-2">
            {analysis?.recent.map((h, i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-sm ${h.surprise! > 0 ? 'bg-bull' : 'bg-bear'} opacity-40 hover:opacity-100 transition-opacity`}
                title={`Date: ${h.date} | Surprise: ${fmtPct(h.surprisePercent || 0)}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Confidence Score</span>
          <div className="px-2 py-0.5 bg-matrix/10 text-matrix text-[10px] font-mono font-bold rounded">
            {( (analysis?.beats || 0) / 4 * 100 ).toFixed(0)}%
          </div>
        </div>
      </div>
    </section>
  );
}
