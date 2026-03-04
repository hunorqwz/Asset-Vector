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
    <div className="flex justify-between items-center py-2 group/row relative border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-3 transition-all">
      {/* Precision Indicator Dot */}
      <div className="absolute left-0 w-[2px] h-3 bg-white/20 opacity-0 group-hover/row:opacity-100 transition-opacity" />
      
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500 group-hover/row:text-zinc-300 transition-colors uppercase tracking-[0.15em] font-bold">{label}</span>
        {insight && <InsightTooltip insight={insight} />}
      </div>
      <span className={`text-[12px] font-mono font-bold tabular-nums tracking-tight transition-all group-hover/row:translate-x-[-2px] ${valueColor}`}>{value}</span>
    </div>
  );
}
