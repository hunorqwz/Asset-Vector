import React from 'react';
import { TechnicalIndicators } from "@/lib/technical-analysis";
import { fmt } from "@/lib/format";

interface AlgorithmicTargetsPanelProps {
  tech: TechnicalIndicators;
}

export const AlgorithmicTargetsPanel = React.memo(function AlgorithmicTargetsPanel({ tech }: AlgorithmicTargetsPanelProps) {
  if (!tech.isValid || !tech.predictivePivots || !tech.fibonacci) return null;

  const { p, r1, r2, r3, s1, s2, s3 } = { 
    p: tech.predictivePivots.pivot,
    r1: tech.predictivePivots.r1, 
    r2: tech.predictivePivots.r2, 
    r3: tech.predictivePivots.r3,
    s1: tech.predictivePivots.s1, 
    s2: tech.predictivePivots.s2, 
    s3: tech.predictivePivots.s3 
  };
  const fib = tech.fibonacci;

  return (
    <section className="bg-[#0a0a0a] p-6 relative overflow-hidden border border-white/10 mt-6 mt-10">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#d946ef] rounded-[1px] shadow-none" />
          <div>
            <h2 className="text-[15px] font-bold tracking-[0.15em] text-white uppercase">Algorithmic Vector Targets</h2>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Predictive Standard Pivots & Fibonacci Retracements</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        
        {/* PIVOT POINTS MATRIX */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-[#d946ef]">Next-Day Pivot Matrix</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[ 
              { label: 'R3 (Resistance)', val: r3, color: 'text-bear' },
              { label: 'R2', val: r2, color: 'text-bear/80' },
              { label: 'R1', val: r1, color: 'text-bear/60' },
              { label: 'Standard Pivot', val: p, color: 'text-white' },
              { label: 'S1 (Support)', val: s1, color: 'text-bull/60' },
              { label: 'S2', val: s2, color: 'text-bull/80' },
              { label: 'S3', val: s3, color: 'text-bull' },
            ].map((level, i) => (
              <div key={i} className={`flex justify-between items-center bg-black/40 border border-white/5 p-3 col-span-2 shadow-inner`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{level.label}</span>
                <span className={`text-[13px] font-bold tracking-widest ${level.color}`}>{fmt(level.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FIBONACCI EXTENSIONS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-[#38bdf8]">Fibonacci Retracement (52W)</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
             {[ 
              { label: '0.0% (Peak)', val: fib.level0, isGolden: false },
              { label: '23.6%', val: fib.level236, isGolden: false },
              { label: '38.2%', val: fib.level382, isGolden: false },
              { label: '50.0%', val: fib.level500, isGolden: false },
              { label: '61.8% (Golden Ratio)', val: fib.level618, isGolden: true },
              { label: '78.6%', val: fib.level786, isGolden: false },
              { label: '100.0% (Trough)', val: fib.level100, isGolden: false },
            ].map((fibL, i) => (
              <div key={i} className={`flex justify-between items-center bg-black/40 border ${fibL.isGolden ? 'border-[#eab308]/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-white/5'} p-3 col-span-2`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${fibL.isGolden ? 'text-[#eab308]' : 'text-zinc-400'}`}>
                  {fibL.label}
                </span>
                <span className={`text-[13px] font-bold tracking-widest ${fibL.isGolden ? 'text-[#eab308]' : 'text-white'}`}>
                  {fmt(fibL.val)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
});
