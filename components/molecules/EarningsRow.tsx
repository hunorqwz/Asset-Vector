import React from 'react';

export function EarningsRow({ quarter }: { quarter: { date: string; actual: number | null; estimate: number | null; surprise: number | null; surprisePercent: number | null } }) {
  const beat = quarter.surprise !== null ? quarter.surprise > 0 : null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-[10px] text-zinc-500 w-24">{quarter.date}</span>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-zinc-600">Est.</span>
          <span className="text-[10px] font-mono text-zinc-400 tabular-nums">{quarter.estimate !== null ? `$${quarter.estimate.toFixed(2)}` : '—'}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-zinc-600">Actual</span>
          <span className="text-[10px] font-mono text-zinc-300 tabular-nums">{quarter.actual !== null ? `$${quarter.actual.toFixed(2)}` : '—'}</span>
        </div>
        {beat !== null && (
          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${beat ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'}`}>
            {beat ? 'BEAT' : 'MISS'} {quarter.surprisePercent !== null ? `${Math.abs(quarter.surprisePercent).toFixed(1)}%` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
