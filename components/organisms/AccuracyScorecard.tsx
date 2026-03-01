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
      <div className="glass-card mb-8 p-6 border border-white/10 relative overflow-hidden group">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
            <span className="text-zinc-500 text-sm font-bold">A</span>
          </div>
          <div>
             <h3 className="text-[12px] font-bold text-white uppercase tracking-widest leading-none mb-1">
               Accuracy Oracle
             </h3>
             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
               System Calibration
             </p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic">
          Oracle is currently gathering institutional-grade signals. Accuracy tracking will activate after first 7-day outcome window.
        </p>
      </div>
    );
  }

  const { accuracy, correct, total, samples } = data;

  return (
    <div className="glass-card mb-8 p-6 border border-white/10 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-matrix/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-matrix/10 border border-matrix/20 flex items-center justify-center">
              <span className="text-matrix text-sm font-bold">A</span>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-white uppercase tracking-widest leading-none mb-1">
                Accuracy Oracle
              </h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                {ticker ? `${ticker} Signal Performance` : "Global Strategy Accuracy"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">
              Sample Size: {total}
            </span>
            <div className={`text-[13px] font-bold font-mono ${accuracy >= 60 ? 'text-bull' : 'text-zinc-400'}`}>
              {accuracy}% Success
            </div>
          </div>
        </div>

        {/* Accuracy Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Confidence Interval</span>
            <span className="text-[10px] font-bold text-white font-mono">{accuracy}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-matrix to-bull transition-all duration-1000"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* Recent Track Record */}
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] block mb-3">
            Institutional Track Record (7-Day Horizon)
          </span>
          <div className="grid grid-cols-5 gap-1">
            {samples.map((s, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-sm transition-all duration-300 ${
                  s.correct ? 'bg-bull shadow-[0_0_8px_rgba(var(--bull-rgb),0.4)]' : 'bg-bear/40'
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

        <p className="mt-4 text-[9px] text-zinc-600 font-medium leading-relaxed italic">
          Accuracy is measured by price movement relative to the signal direction over a fixed 7-day outcome window.
          Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
