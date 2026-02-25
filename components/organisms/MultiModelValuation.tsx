import React, { useMemo } from 'react';
import { StockDetails } from "@/lib/stock-details";
import { calculateGrahamNumber, calculatePeterLynchFairValue } from "@/lib/valuation";
import { fmt } from "@/lib/format";
import { AIIcon, ValuationIcon } from "@/components/Icons";

interface MultiModelValuationProps {
  details: StockDetails;
}

export const MultiModelValuation = React.memo(function MultiModelValuation({ details }: MultiModelValuationProps) {
  const currentPrice = details.price.current;
  const eps = details.keyStats.trailingEps;
  const bvps = details.valuation.bookValue;
  
  // Calculate Growth Rate safely. Ideally we want forward 5Y growth, 
  // but we can proxy it with current revenue/earnings growth or fall back to a conservative estimate.
  const growthRate = details.profitability?.revenueGrowth || details.profitability?.earningsGrowth || 0;

  const graham = useMemo(() => calculateGrahamNumber(eps, bvps), [eps, bvps]);
  const lynch = useMemo(() => calculatePeterLynchFairValue(eps, growthRate), [eps, growthRate]);

  if (!graham.isValid && !lynch.isValid) {
    return null; // Don't show if neither model applies
  }

  const renderModel = (
    name: string, 
    value: number, 
    isValid: boolean, 
    description: string, 
    formula: string,
    currentPrice: number
  ) => {
    if (!isValid) {
      return (
        <div className="flex flex-col p-6 bg-[#0a0a0a] border border-white/10 opacity-50 grayscale">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-zinc-500 tracking-[0.15em] uppercase">{name}</span>
            <span className="text-[11px] font-bold font-mono text-zinc-600 bg-transparent px-3 py-1 border border-white/20">INSUFFICIENT DATA</span>
          </div>
          <p className="text-[12px] text-zinc-600 leading-relaxed max-w-[90%] font-medium">
            Structural metrics are missing or negative. Dynamic validation suspended for this model.
          </p>
        </div>
      );
    }

    const marginOfSafety = ((value - currentPrice) / value) * 100;
    const isUndervalued = marginOfSafety > 0;

    return (
      <div className={`flex flex-col p-6 bg-[#0a0a0a] border transition-all relative overflow-hidden group hover:bg-[#111111] ${isUndervalued ? 'border-bull/30' : 'border-white/10'}`}>
        
        {/* Animated Gradient Background for Undervalued */}
        {isUndervalued && (
          <div className="absolute inset-0 bg-bull/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        )}

        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-white tracking-[0.2em] uppercase">{name}</span>
            <span className="text-[11px] font-bold font-mono text-zinc-500 tracking-widest">{formula}</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-2xl font-mono font-bold tracking-tight shadow-none ${isUndervalued ? 'text-bull' : 'text-zinc-200'}`}>
              {fmt(value)}
            </span>
            <div className={`text-[11px] font-bold font-mono px-2.5 py-1 border tracking-widest ${isUndervalued ? 'bg-bull/10 border-bull/30 text-bull' : 'bg-bear/10 border-bear/30 text-bear'}`}>
              {isUndervalued ? 'UNDER' : 'OVER'} · {Math.abs(marginOfSafety).toFixed(1)}%
            </div>
          </div>
        </div>

        <p className="text-[12px] text-zinc-400 leading-relaxed mt-4 font-medium border-l-2 border-white/10 pl-5 py-1">
          {description}
        </p>
      </div>
    );
  };

  return (
    <section className="bg-transparent p-6 relative overflow-hidden border border-white/10">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <ValuationIcon />
      </div>

      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-2 h-2 bg-white rounded-full shadow-none" />
        <h2 className="text-[15px] font-bold tracking-[0.2em] text-white uppercase">Quantitative Frameworks</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {renderModel(
          "Graham Number", 
          graham.value, 
          graham.isValid, 
          "Benjamin Graham's strict defensive valuation limit. Heavily penalizes companies with low physical assets or negative earnings.",
          "√(22.5 × EPS × BVPS)",
          currentPrice
        )}

        {renderModel(
          "Lynch Fair Value", 
          lynch.value, 
          lynch.isValid, 
          "Peter Lynch's tech-friendly PEG benchmark. Calculates fair value assuming P/E should equal the company's growth rate.",
          "(Growth% × EPS)",
          currentPrice
        )}
      </div>
    </section>
  );
});
