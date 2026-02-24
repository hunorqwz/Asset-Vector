import React from 'react';

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[9px] text-zinc-500">{label}</span>
    </div>
  );
}
