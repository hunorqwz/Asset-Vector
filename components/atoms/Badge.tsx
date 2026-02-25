import React from 'react';

export function Badge({ label }: { label: string }) {
  if (!label || label === 'Unknown') return null;
  return (
    <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.05em] uppercase bg-white/5 border border-white/10 text-zinc-400">
      {label}
    </span>
  );
}
