import React from 'react';
import { MonteCarloResult } from "@/lib/monte-carlo";
import { fmt, fmtPct } from "@/lib/format";

interface MonteCarloSimulationProps {
  simulation: MonteCarloResult;
}

export const MonteCarloSimulation = React.memo(function MonteCarloSimulation({ simulation }: MonteCarloSimulationProps) {
  const currentPrice = simulation.currentPrice;

  if (!simulation.isValid) return null;

  const expectedReturn = ((simulation.expectedPrice - currentPrice) / currentPrice) * 100;
  const isBullish = expectedReturn > 0;

  return (
    <section className="bg-transparent p-6 relative overflow-hidden border border-white/10">
      <div className="flex items-center gap-2 mb-6 relative z-10">
        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-none" />
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white uppercase">Stochastic Price Simulation</h2>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">5,000 Paths (90 Days) • Geometric Brownian Motion</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        {/* 1. Bear Case (5th Percentile) */}
        <div className="flex flex-col p-4 bg-[#0a0a0a] border border-bear/20 relative overflow-hidden group">
          <span className="text-[10px] font-bold text-bear uppercase tracking-wider mb-2 z-10">Worst Case (5%)</span>
          <span className="text-xl font-mono font-bold text-white z-10">{fmt(simulation.percentile5th)}</span>
          <span className="text-[10px] text-zinc-500 font-mono mt-1 z-10">
            {fmtPct((simulation.percentile5th - currentPrice) / currentPrice)}
          </span>
        </div>

        {/* 2. Expected (Mean) */}
        <div className={`flex flex-col p-5 bg-[#111111] border ${isBullish ? 'border-bull/30' : 'border-bear/30'} relative overflow-hidden shadow-none z-20`}>
          <div className="flex items-center justify-between mb-2 z-10">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Expected Value</span>
            <div className={`text-[9px] font-mono px-2 py-0.5 border ${isBullish ? 'bg-bull/10 border-bull/30 text-bull' : 'bg-bear/10 border-bear/30 text-bear'}`}>
              {isBullish ? '+' : ''}{expectedReturn.toFixed(1)}% Return
            </div>
          </div>
          <span className={`text-2xl font-mono font-bold tracking-tight mb-1 z-10 ${isBullish ? 'text-bull' : 'text-zinc-300'}`}>
            {fmt(simulation.expectedPrice)}
          </span>
          <span className="text-[10px] text-zinc-400 leading-relaxed z-10">
            Mean outcome of 5,000 algorithmic simulations based on historical volatility.
          </span>
        </div>

        {/* 3. Bull Case (95th Percentile) */}
        <div className="flex flex-col p-4 bg-[#0a0a0a] border border-bull/20 relative overflow-hidden group">
          <span className="text-[10px] font-bold text-bull uppercase tracking-wider mb-2 z-10">Best Case (95%)</span>
          <span className="text-xl font-mono font-bold text-white z-10">{fmt(simulation.percentile95th)}</span>
          <span className="text-[10px] text-zinc-500 font-mono mt-1 z-10">
            {fmtPct((simulation.percentile95th - currentPrice) / currentPrice)}
          </span>
        </div>

      </div>
    </section>
  );
});
