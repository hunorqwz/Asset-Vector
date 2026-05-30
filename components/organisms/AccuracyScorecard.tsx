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
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] mb-6">
        <h3 className="text-[13px] font-semibold text-white mb-1">
          Signal Backtest Performance
        </h3>
        <p className="text-[13px] text-zinc-500 leading-relaxed">
          Not enough historical backtesting data to display prediction accuracy. Check back in 7 days.
        </p>
      </div>
    );
  }

  const { accuracy, correct, total, samples } = data;

  return (
    <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] mb-6 relative overflow-hidden group hover:bg-white/[0.02] transition-all duration-300">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-white leading-none mb-1">
                Signal Backtest Performance
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
                {ticker ? `${ticker} Signal Performance` : "Global Strategy Accuracy"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-zinc-500 block mb-1">
              Sample Size: {total}
            </span>
            <div className={`text-[15px] font-bold font-mono tracking-tighter ${accuracy >= 60 ? 'text-green-500' : 'text-zinc-300'}`}>
              {accuracy}% Success
            </div>
          </div>
        </div>

        {/* Accuracy Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-zinc-500">Confidence Interval</span>
            <span className="text-[11px] font-bold text-white font-mono tracking-tighter">{accuracy}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${accuracy >= 60 ? 'bg-green-500' : 'bg-zinc-500'}`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* Recent Track Record */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-zinc-500 block mb-3">
            Recent Track Record (7-Day Horizon)
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {samples.map((s, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-sm transition-all duration-300 hover:scale-y-150 transform ${
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

        <p className="mt-5 text-[11px] text-zinc-500 font-medium leading-relaxed border-t border-white/5 pt-3">
          Accuracy is measured by price movement relative to the signal direction over a fixed 7-day outcome window.
          Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
