import React from 'react';

export function MetricCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="glass-card rounded-xl p-4 group">
      <span className="text-[10px] text-zinc-500 tracking-wide block mb-1.5">{label}</span>
      <span className="text-[13px] font-mono font-semibold text-white tabular-nums tracking-tight block">{value}</span>
      {subValue && <span className="text-[10px] text-zinc-600 mt-1 block">{subValue}</span>}
    </div>
  );
}
