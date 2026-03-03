"use client";
import { useMemo } from "react";
import { fmt } from "@/lib/format";

interface AccuracyScorecardProps {
  data: {
    total: number;
    correct: number;
    accuracy: number;
    samples: {
      ticker: string;
      at: Date | null;
      label: string | null;
      correct: boolean;
      entry: number;
      outcome: number;
    }[];
  } | null;
  ticker?: string;
}

export function AccuracyScorecard({ data, ticker }: AccuracyScorecardProps) {
  if (!data) {
    return (
      <div className="glass-card mb-8 p-6 border border-white/10 bg-gradient-to-br from-zinc-900/40 to-black/60 backdrop-blur-sm relative overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center animate-pulse shadow-sm">
            <span className="text-zinc-500 text-sm font-bold">A</span>
          </div>
          <div>
             <h3 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] leading-none mb-1">
               Accuracy Oracle
             </h3>
             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
               System Calibration
             </p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic relative z-10">
          Oracle is currently gathering institutional-grade signals. Accuracy tracking will activate after first 7-day outcome window.
        </p>
      </div>
    );
  }

  const { accuracy, correct, total, samples } = data;

  return (
    <div className="glass-card mb-8 p-6 border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/80 backdrop-blur-md relative overflow-hidden group hover:border-white/20 transition-all duration-300">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-matrix/5 blur-3xl rounded-full translate-x-12 -translate-y-12 group-hover:bg-matrix/10 transition-colors duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-matrix/10 border border-matrix/20 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.1)]">
              <span className="text-matrix text-sm font-bold">A</span>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] leading-none mb-1">
                Accuracy Oracle
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                {ticker ? `${ticker} Signal Performance` : "Global Strategy Accuracy"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
              Sample Size: {total}
            </span>
            <div className={`text-[15px] font-bold font-mono tracking-tighter ${accuracy >= 60 ? 'text-bull drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'text-zinc-300'}`}>
              {accuracy}% Success
            </div>
          </div>
        </div>

        {/* Accuracy Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Confidence Interval</span>
            <span className="text-[10px] font-bold text-white font-mono tracking-tighter">{accuracy}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-matrix to-bull transition-all duration-1000 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* Recent Track Record */}
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-3">
            Institutional Track Record (7-Day Horizon)
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {samples.map((s, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-sm transition-all duration-300 hover:scale-y-150 transform cursor-crosshair ${
                  s.correct ? 'bg-bull drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]' : 'bg-bear/50 hover:bg-bear'
                }`}
                title={`${s.ticker}: ${s.label} at $${fmt(s.entry)} -> Final $${fmt(s.outcome)} (${s.correct ? 'VALIDATED' : 'FAILED'})`}
              />
            ))}
            {/* Fill remaining slots to maintain grid shape if < 10 samples */}
            {[...Array(Math.max(0, 10 - samples.length))].map((_, i) => (
              <div key={`empty-${i}`} className="h-1.5 rounded-sm bg-white/5" />
            ))}
          </div>
        </div>

        <p className="mt-5 text-[9.5px] text-zinc-500 font-medium leading-relaxed italic border-t border-white/5 pt-3">
          Accuracy is measured by price movement relative to the signal direction over a fixed 7-day outcome window.
          Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
