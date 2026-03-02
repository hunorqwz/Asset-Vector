"use client";
import React from 'react';
import { CorrelationMatrix } from "@/lib/portfolio-risk";
import { StealthTooltip } from "@/components/LiveTelemetry";

interface GlobalCorrelationLabProps {
  data: CorrelationMatrix;
}

export function GlobalCorrelationLab({ data }: GlobalCorrelationLabProps) {
  const { tickers, matrix } = data;

  if (tickers.length < 2) return null;

  // Calculate redundancy score
  const highCorrCount = matrix.flat().filter((c, i) => {
    const row = Math.floor(i / tickers.length);
    const col = i % tickers.length;
    return row < col && c > 0.85;
  }).length;

  const getCellColor = (val: number) => {
    if (val > 0.85) return 'bg-bear text-white'; // High redundancy
    if (val > 0.5) return 'bg-bear/40 text-bear-light';
    if (val > 0.2) return 'bg-zinc-800 text-zinc-400';
    if (val > -0.2) return 'bg-zinc-900 text-zinc-500';
    if (val > -0.5) return 'bg-bull/20 text-bull-light';
    return 'bg-bull text-white'; // High diversification
  };

  return (
    <div className="glass-card border border-white/10 overflow-hidden group">
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div>
          <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] mb-1">Global Correlation Lab</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">Systemic Redundancy & Diversification Matrix</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right">
             <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Redundancy Risk</span>
             <span className={`text-[13px] font-mono font-bold ${highCorrCount > 0 ? 'text-bear animate-pulse' : 'text-matrix'}`}>
               {highCorrCount > 0 ? `CRITICAL (${highCorrCount} PAIRS)` : 'LOW / OPTIMIZED'}
             </span>
           </div>
        </div>
      </div>

      <div className="p-8">
        <div className="overflow-x-auto scrollbar-hide">
          <div 
            className="grid gap-1 mb-2" 
            style={{ 
              gridTemplateColumns: `repeat(${tickers.length + 1}, minmax(40px, 1fr))`,
              width: 'max-content',
              minWidth: '100%'
            }}
          >
            {/* Header X-Axis */}
            <div className="h-10" />
            {tickers.map(t => (
              <div key={t} className="h-10 flex items-center justify-center">
                <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase rotate-45 origin-center">{t}</span>
              </div>
            ))}

            {/* Matrix Rows */}
            {tickers.map((tRow, i) => (
              <React.Fragment key={tRow}>
                <div className="h-10 flex items-center pr-4">
                  <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase">{tRow}</span>
                </div>
                {tickers.map((tCol, j) => {
                  const val = matrix[i][j];
                  return (
                    <StealthTooltip key={`${i}-${j}`} content={`${tRow} vs ${tCol}: ${val.toFixed(2)}`}>
                      <div 
                        className={`h-10 w-full rounded-[2px] flex items-center justify-center transition-all cursor-crosshair hover:scale-110 hover:z-10 shadow-sm ${getCellColor(val)}`}
                      >
                        <span className="text-[8px] font-bold font-mono opacity-0 group-hover:opacity-40">{val.toFixed(1)}</span>
                      </div>
                    </StealthTooltip>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex items-center gap-8">
             <LegendItem color="bg-bear" label="Redundancy (>0.85)" />
             <LegendItem color="bg-zinc-800" label="Neutral" />
             <LegendItem color="bg-bull" label="Alpha (<0.0)" />
          </div>
          <p className="max-w-xs text-[10px] text-zinc-500 font-medium leading-relaxed italic text-right">
             High correlation increases systemic risk. Seek "Alpha" cells (blue) to maximize portfolio resilience.
          </p>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
    </div>
  );
}
