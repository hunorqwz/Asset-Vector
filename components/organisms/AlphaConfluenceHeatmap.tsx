
"use client";
import React from 'react';
import { AlphaPick } from "@/app/actions/discovery";
import { fmtPct } from "@/lib/format";

interface AlphaConfluenceHeatmapProps {
  picks: AlphaPick[];
}

export function AlphaConfluenceHeatmap({ picks }: AlphaConfluenceHeatmapProps) {
  if (!picks.length) return null;

  return (
    <div className="glass-card border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden rounded-xl mb-12">
      <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 bg-matrix rounded-full animate-pulse" />
           <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Alpha Confluence Matrix v1.0</h3>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-bull rounded-full" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Structural Alignment</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-matrix rounded-full" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Narrative Verified</span>
           </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Asset</th>
              <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center">Narrative</th>
              <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center">Liquidity</th>
              <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center">Horizons</th>
              <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center">Alpha Gap</th>
              <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">Conviction</th>
            </tr>
          </thead>
          <tbody>
            {picks.slice(0, 5).map((pick, i) => {
              const multiDirs = pick.multiHorizonPrediction ? Object.values(pick.multiHorizonPrediction).map(p => Math.sign(p.p50 - pick.price)) : [];
              const horizonConfluence = multiDirs.filter(d => d === 1).length;
              
              return (
                <tr key={pick.ticker} className="group hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white font-mono">{pick.ticker}</span>
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter truncate max-w-[120px]">{pick.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className={`w-20 h-1.5 rounded-full relative overflow-hidden ${pick.isNarrativeConflicted ? 'bg-bear/20' : 'bg-matrix/30'}`}>
                        <div 
                          className={`absolute inset-0 ${pick.isNarrativeConflicted ? 'bg-bear' : 'bg-matrix shadow-[0_0_8px_hsla(var(--matrix)/0.5)]'}`} 
                          style={{ width: pick.isNarrativeConflicted ? '40%' : '100%' }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className={`h-6 w-6 rounded flex items-center justify-center border shadow-sm transition-all duration-300 ${pick.hasFreshOrderBlock ? 'bg-bull/10 border-bull/30 text-bull shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-zinc-900 border-white/5 text-zinc-800'}`}>
                         {pick.hasFreshOrderBlock ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-[0_0_3px_rgba(34,197,94,0.8)]">
                              <path d="M13 10V3L4 14H11V21L20 10H13Z" />
                            </svg>
                         ) : (
                            <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                         )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4].map(idx => (
                          <div 
                            key={idx} 
                            className={`w-3 h-3 rounded-sm border ${
                              idx <= horizonConfluence 
                                ? 'bg-bull/80 border-bull/40 shadow-[0_0_5px_rgba(34,197,94,0.3)]' 
                                : 'bg-zinc-800/50 border-white/5'
                            }`} 
                          />
                        ))}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[11px] font-mono font-bold ${pick.score > 80 ? 'text-bull' : 'text-zinc-400'}`}>
                      +{Math.round(pick.score / 10)}.2%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold font-mono ${pick.score > 85 ? 'text-bull' : 'text-white'}`}>{pick.score}%</span>
                      <div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-zinc-300" style={{ width: `${pick.score}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
