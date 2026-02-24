import React from 'react';

export function Badge({ label }: { label: string }) {
  if (!label || label === 'Unknown') return null;
  return (
    <span className="px-2.5 py-1 rounded-full text-[9px] font-medium tracking-wide bg-white/5 border border-white/8 text-zinc-400">
      {label}
    </span>
  );
}
