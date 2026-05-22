"use client";
import React, { useMemo } from "react";
import { PortfolioAnalytics as Analytics, PositionAnalytics } from "@/lib/portfolio-analytics";

interface PortfolioAnalyticsPanelProps {
  analytics: Analytics;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCurrency(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${fmt(n / 1_000_000)}M`;
  if (abs >= 1_000) return `$${fmt(n / 1_000)}K`;
  return "$" + fmt(n);
}

// ── Allocation Bar ─────────────────────────────────────────────────────────
function AllocationBar({ pos, isTop }: { pos: PositionAnalytics; isTop: boolean }) {
  const isPositive = pos.pnl >= 0;
  return (
    <div className="flex items-center gap-3 py-3 group">
      <div className="w-[52px] shrink-0">
        <span className="text-[11px] font-bold font-mono text-white uppercase tracking-tight">{pos.ticker}</span>
      </div>
      <div className="flex-1 relative h-5 bg-white/5 rounded-full overflow-hidden border border-white/[0.03]">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-700 rounded-full ${isPositive ? "bg-bull/40" : "bg-bear/30"} ${isTop ? "opacity-100" : "opacity-70"}`}
          style={{ width: `${pos.allocationPct}%` }}
        />
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-[10.5px] font-mono font-bold text-white/95 relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            {fmt(pos.allocationPct, 1)}%
          </span>
        </div>
      </div>
      <div className="w-[72px] shrink-0 text-right">
        <span className={`text-[11px] font-mono font-bold tabular-nums ${isPositive ? "text-bull" : "text-bear"}`}>
          {pos.pnl >= 0 ? "+" : ""}{fmt(pos.pnlPct, 1)}%
        </span>
      </div>
      <div className="w-[80px] shrink-0 text-right">
        <span className={`text-[11px] font-mono tabular-nums ${isPositive ? "text-bull/70" : "text-bear/70"}`}>
          {pos.pnl >= 0 ? "+" : ""}{fmtCurrency(pos.pnl)}
        </span>
      </div>
    </div>
  );
}

// ── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, color = "text-white", borderColor = "border-white/5"
}: {
  label: string; value: string; sub?: string; color?: string; borderColor?: string;
}) {
  return (
    <div className={`p-5 rounded-xl border ${borderColor} bg-black/40 backdrop-blur-md relative overflow-hidden shadow-lg transition-all duration-300 hover:bg-black/50 hover:border-white/20`}>
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">{label}</p>
      <p className={`text-xl font-bold font-mono tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-wider">{sub}</p>}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function PortfolioAnalyticsPanel({ analytics }: PortfolioAnalyticsPanelProps) {
  const {
    positions, totalValue, totalPnl, totalPnlPct,
    concentrationHHI, concentrationLabel, topPosition,
    bestPosition, worstPosition, winRate, winningPositions, losingPositions,
    weightedReturn,
  } = analytics;

  const concentrationColor = useMemo(() => {
    if (concentrationLabel === "High Risk") return { text: "text-bear", border: "border-bear/30" };
    if (concentrationLabel === "Concentrated") return { text: "text-amber-400", border: "border-amber-400/30" };
    if (concentrationLabel === "Moderate") return { text: "text-yellow-400", border: "border-yellow-400/30" };
    return { text: "text-bull", border: "border-bull/30" };
  }, [concentrationLabel]);

  // Top 5 by allocation weight for the bar chart
  const top5 = [...positions].sort((a, b) => b.allocationPct - a.allocationPct).slice(0, 8);

  if (positions.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <span className="w-1 h-4 bg-white" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white">Portfolio Analytics</h2>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">
          {positions.length} positions · ${fmt(totalValue / 1000, 1)}K AUM
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Weighted Return"
          value={`${weightedReturn >= 0 ? "+" : ""}${fmt(weightedReturn, 2)}%`}
          color={weightedReturn >= 0 ? "text-bull" : "text-bear"}
          sub="Across all positions"
        />
        <MetricCard
          label="Win Rate"
          value={`${fmt(winRate, 0)}%`}
          sub={`${winningPositions}W / ${losingPositions}L`}
          color={winRate >= 50 ? "text-bull" : "text-bear"}
        />
        <MetricCard
          label="Concentration (HHI)"
          value={concentrationHHI.toLocaleString()}
          sub={concentrationLabel}
          color={concentrationColor.text}
          borderColor={concentrationColor.border}
        />
        {topPosition && (
          <MetricCard
            label="Largest Position"
            value={topPosition.ticker}
            sub={`${fmt(topPosition.pct, 1)}% of portfolio`}
            color="text-white"
          />
        )}
        {bestPosition && (
          <MetricCard
            label="Best Performer"
            value={bestPosition.ticker}
            sub={`+${fmt(bestPosition.pnlPct, 1)}% · ${bestPosition.pnl >= 0 ? "+" : ""}${fmtCurrency(bestPosition.pnl)}`}
            color="text-bull"
            borderColor="border-bull/20"
          />
        )}
        {worstPosition && (
          <MetricCard
            label="Worst Performer"
            value={worstPosition.ticker}
            sub={`${fmt(worstPosition.pnlPct, 1)}% · ${fmtCurrency(worstPosition.pnl)}`}
            color="text-bear"
            borderColor="border-bear/20"
          />
        )}
      </div>

      {/* Allocation Breakdown */}
      <div className="glass-card overflow-hidden border border-white/5 rounded-xl bg-black/40 backdrop-blur-md">
        <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-white/[0.01]">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-matrix glow-matrix" />
            Allocation Breakdown
          </h3>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <span>Ticker</span>
            <span>Weight</span>
            <span>Return</span>
            <span>P&amp;L</span>
          </div>
        </div>
        <div className="px-6 py-4 space-y-1 divide-y divide-white/[0.03]">
          {top5.map((pos, i) => (
            <AllocationBar key={pos.ticker} pos={pos} isTop={i === 0} />
          ))}
        </div>
        {positions.length > 8 && (
          <div className="px-6 py-3 border-t border-white/5 bg-white/[0.005]">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              +{positions.length - 8} more positions not shown
            </span>
          </div>
        )}
      </div>

      {/* Risk Interpretation */}
      <div className={`glass-card rounded-xl border border-white/5 p-5 bg-black/40 backdrop-blur-md flex items-start gap-4 relative overflow-hidden`}>
        <div className={`w-1 self-stretch ${concentrationColor.text.replace('text-', 'bg-')} rounded-full shrink-0`} />
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-widest ${concentrationColor.text} mb-1.5`}>
            Concentration Risk: {concentrationLabel}
          </p>
          <p className="text-[11.5px] text-zinc-400 leading-relaxed">
            {concentrationLabel === "High Risk" && `HHI of ${concentrationHHI.toLocaleString()} indicates extreme single-asset concentration. A decline in your top position could severely impact total portfolio returns.`}
            {concentrationLabel === "Concentrated" && `HHI of ${concentrationHHI.toLocaleString()} indicates significant concentration. Consider rebalancing to reduce dependency on your top holdings.`}
            {concentrationLabel === "Moderate" && `HHI of ${concentrationHHI.toLocaleString()} indicates moderate diversification. Portfolio has meaningful exposure to leading positions but maintains reasonable spread.`}
            {concentrationLabel === "Diversified" && `HHI of ${concentrationHHI.toLocaleString()} indicates a well-diversified portfolio. Risk is spread across positions without excessive single-asset dependency.`}
          </p>
        </div>
      </div>
    </div>
  );
}
