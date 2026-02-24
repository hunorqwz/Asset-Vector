import React from 'react';

export function TargetUpside({ current, target }: { current: number; target: number }) {
  const pct = ((target - current) / current) * 100;
  return (
    <div className="flex justify-between items-center px-1">
      <span className="text-[10px] text-zinc-500 uppercase">Implied Upside</span>
      <span className={`text-[11px] font-mono font-bold ${pct >= 0 ? 'text-bull' : 'text-bear'}`}>
        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    </div>
  );
}
