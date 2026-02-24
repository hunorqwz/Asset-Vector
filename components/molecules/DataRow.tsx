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
    <div className="flex justify-between items-center py-0.5 group relative">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors uppercase tracking-tight">{label}</span>
        {insight && <InsightTooltip insight={insight} />}
      </div>
      <span className={`text-[11px] font-mono tabular-nums ${valueColor}`}>{value}</span>
    </div>
  );
}
