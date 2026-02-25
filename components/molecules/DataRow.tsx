import React from 'react';
import { METRIC_INSIGHTS } from "@/lib/insights";
import { InsightTooltip } from "@/components/organisms/InsightTooltip";

export function DataRow({ label, value, highlight, colored, insightId }: { label: string; value: string; highlight?: boolean; colored?: boolean; insightId?: string }) {
  let valueColor = highlight ? 'text-white font-semibold' : 'text-zinc-300';
  const insight = insightId ? METRIC_INSIGHTS[insightId] : null;

  if (colored && value !== '—') {
    const numVal = parseFloat(value);
    if (!isNaN(numVal)) {
      valueColor = numVal > 0 ? 'text-bull' : numVal < 0 ? 'text-bear' : 'text-zinc-300';
    }
  }

  return (
    <div className="flex justify-between items-center py-1.5 group/row relative border-b border-white/10 last:border-0 hover:bg-[#111111] px-2 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-zinc-500 group-hover/row:text-zinc-300 transition-colors uppercase tracking-[0.1em] font-bold">{label}</span>
        {insight && <InsightTooltip insight={insight} />}
      </div>
      <span className={`text-[12px] font-mono font-bold tabular-nums tracking-tight ${valueColor}`}>{value}</span>
    </div>
  );
}
