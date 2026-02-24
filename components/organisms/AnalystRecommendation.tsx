import React from 'react';

export function AnalystRecommendation({ rec, mean, count }: { rec: string | null; mean: number | null; count: number }) {
  const label = rec ? rec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
  
  let badgeColor = 'bg-white/5 border-white/10 text-zinc-400';
  if (rec === 'buy' || rec === 'strong_buy') badgeColor = 'bg-bull/10 border-bull/20 text-bull';
  else if (rec === 'sell' || rec === 'strong_sell') badgeColor = 'bg-bear/10 border-bear/20 text-bear';
  else if (rec === 'hold') badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';

  return (
    <div className="flex items-center justify-between">
      <div className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wide border ${badgeColor}`}>
        {label}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] text-zinc-500">{count} analyst{count !== 1 ? 's' : ''}</span>
        {mean !== null && <span className="text-[10px] font-mono text-zinc-600">{mean.toFixed(1)} / 5.0</span>}
      </div>
    </div>
  );
}
