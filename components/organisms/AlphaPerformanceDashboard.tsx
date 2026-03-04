"use client";
import React, { useState } from "react";
import { BacktestReport, PickRecord } from "@/app/actions/backtest";

interface Props {
  data: BacktestReport;
}

const STATUS_STYLES = {
  WIN:     "bg-bull/10 text-bull border border-bull/20",
  LOSS:    "bg-bear/10 text-bear border border-bear/20",
  PENDING: "bg-white/5 text-zinc-400 border border-white/10",
};

const SCANNER_COLORS: Record<string, string> = {
  SURGICAL: "text-bull",
  REGIME:   "text-matrix",
  VOL:      "text-bear",
  MOMENTUM: "text-zinc-300",
  VALUE:    "text-amber-400",
  UNCORREL: "text-cyan-400",
};

function getScannerColor(scanner: string): string {
  const key = Object.keys(SCANNER_COLORS).find(k => scanner.toUpperCase().startsWith(k));
  return key ? SCANNER_COLORS[key] : "text-zinc-400";
}

// Pure SVG equity curve — no external deps
function EquityCurve({ data }: { data: { index: number; cumAlpha: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
        Not enough evaluated picks yet
      </div>
    );
  }

  const W = 600;
  const H = 120;
  const PAD = 16;

  const values = data.map(d => d.cumAlpha);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 0);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => PAD + ((maxVal - v) / range) * (H - PAD * 2);

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.cumAlpha).toFixed(1)}`)
    .join(" ");

  // Filled area under curve
  const fillPath = `${linePath} L ${toX(data.length - 1).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`;

  // Zero line Y
  const zeroY = toY(0);
  const lastVal = values[values.length - 1];
  const isPositive = lastVal >= 0;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: "120px" }}>
        <defs>
          <linearGradient id="eq-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        {/* Zero baseline */}
        <line
          x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4"
        />
        {/* Fill area */}
        <path d={fillPath} fill="url(#eq-fill)" />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Last point dot */}
        <circle
          cx={toX(data.length - 1)}
          cy={toY(lastVal)}
          r="3"
          fill={isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"}
        />
      </svg>
    </div>
  );
}

export function AlphaPerformanceDashboard({ data }: Props) {
  const [tab, setTab] = useState<"overview" | "picks" | "scanners">("overview");
  const isPositiveAlpha = data.avgAlpha >= 0;
  const totalCumAlpha = data.equityCurve.length > 0
    ? data.equityCurve[data.equityCurve.length - 1].cumAlpha
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-[2px] w-8 bg-matrix" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-matrix">Audit Engine v2</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tightest leading-none">Alpha Performance</h1>
        </div>
        <div className="flex gap-2">
          {(["overview", "picks", "scanners"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 transition-all ${
                tab === t
                  ? "bg-white text-black"
                  : "bg-white/5 text-zinc-500 hover:text-white border border-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Win Rate", value: `${data.winRate}%`, color: data.winRate >= 50 ? "text-bull" : "text-bear" },
              { label: "Avg Alpha/Pick", value: `${data.avgAlpha > 0 ? "+" : ""}${data.avgAlpha.toFixed(2)}%`, color: isPositiveAlpha ? "text-matrix" : "text-bear" },
              { label: "Cumulative Alpha", value: `${totalCumAlpha > 0 ? "+" : ""}${totalCumAlpha.toFixed(2)}%`, color: totalCumAlpha >= 0 ? "text-bull" : "text-bear" },
              { label: "Total Signals", value: data.totalPicks.toString(), color: "text-white" },
              { label: "Pending", value: data.pendingCount.toString(), color: "text-zinc-400" },
            ].map(kpi => (
              <div key={kpi.label} className="glass-card border border-white/10 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-3">{kpi.label}</p>
                <p className={`text-2xl font-bold font-mono tabular-nums ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Equity Curve */}
          <div className="glass-card border border-white/10 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/40 to-transparent" />
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Cumulative Alpha Curve</p>
                <p className="text-xs text-zinc-600 font-medium">Beta-adjusted outperformance vs SPY, stacked per signal</p>
              </div>
              <span className={`font-bold font-mono text-xl ${totalCumAlpha >= 0 ? "text-bull" : "text-bear"}`}>
                {totalCumAlpha > 0 ? "+" : ""}{totalCumAlpha.toFixed(2)}%
              </span>
            </div>
            <EquityCurve data={data.equityCurve} />
            <div className="flex justify-between mt-3 text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
              <span>Oldest Signal</span>
              <span>Latest Evaluated</span>
            </div>
          </div>

          {/* Best / Worst */}
          {(data.bestPick || data.worstPick) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.bestPick && <PickHighlight pick={data.bestPick} label="Best Pick" accent="text-bull" border="border-bull/20" />}
              {data.worstPick && <PickHighlight pick={data.worstPick} label="Worst Pick" accent="text-bear" border="border-bear/20" />}
            </div>
          )}
        </>
      )}

      {tab === "picks" && (
        <div className="glass-card border border-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/30 to-transparent" />
          <div className="border-b border-white/5 px-6 py-4 grid grid-cols-12 text-[9px] font-bold text-zinc-600 uppercase tracking-widest gap-2">
            <span className="col-span-2">Ticker</span>
            <span className="col-span-2">Scanner</span>
            <span className="col-span-1 text-right">Entry</span>
            <span className="col-span-1 text-right">Exit</span>
            <span className="col-span-2 text-right">Alpha</span>
            <span className="col-span-2 text-right">Beta</span>
            <span className="col-span-2 text-right">Status</span>
          </div>
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto scrollbar-hide">
            {data.recentPicks.map((pick, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-6 py-3 hover:bg-white/[0.02] transition-colors text-[11px] font-mono items-center">
                <span className="col-span-2 font-bold text-white tracking-wider">{pick.ticker}</span>
                <span className={`col-span-2 text-[9px] font-bold uppercase tracking-widest ${getScannerColor(pick.scanner)}`}>{pick.scanner.slice(0, 10)}</span>
                <span className="col-span-1 text-right text-zinc-400">${pick.entry.toFixed(2)}</span>
                <span className="col-span-1 text-right text-zinc-500">{pick.exit ? `$${pick.exit.toFixed(2)}` : "—"}</span>
                <span className={`col-span-2 text-right font-bold ${pick.alpha !== null ? (pick.alpha >= 0 ? "text-bull" : "text-bear") : "text-zinc-600"}`}>
                  {pick.alpha !== null ? `${pick.alpha >= 0 ? "+" : ""}${(pick.alpha * 100).toFixed(2)}%` : "—"}
                </span>
                <span className="col-span-2 text-right text-zinc-500">{pick.betaAtGeneration.toFixed(2)}β</span>
                <span className="col-span-2 text-right">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${STATUS_STYLES[pick.status]}`}>
                    {pick.status}
                  </span>
                </span>
              </div>
            ))}
            {data.recentPicks.length === 0 && (
              <div className="py-16 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No picks archived yet</div>
            )}
          </div>
        </div>
      )}

      {tab === "scanners" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.entries(data.scannerBreakdown).map(([scanner, stats]) => {
            const total = stats.wins + stats.losses;
            const wr = total > 0 ? (stats.wins / total) * 100 : 0;
            return (
              <div key={scanner} className="glass-card border border-white/10 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${getScannerColor(scanner)}`}>{scanner}</span>
                  <span className={`text-[10px] font-bold font-mono ${stats.avgAlpha >= 0 ? "text-bull" : "text-bear"}`}>
                    Avg α: {stats.avgAlpha >= 0 ? "+" : ""}{stats.avgAlpha.toFixed(2)}%
                  </span>
                </div>
                <p className={`text-3xl font-bold font-mono mb-1 ${wr >= 50 ? "text-white" : "text-zinc-500"}`}>{wr.toFixed(0)}%</p>
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Win Rate</p>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div className={`h-full ${wr >= 50 ? "bg-bull" : "bg-bear"} transition-all duration-1000`} style={{ width: `${wr}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                  <span className="text-bull">{stats.wins}W</span>
                  <span>{total} total</span>
                  <span className="text-bear">{stats.losses}L</span>
                </div>
              </div>
            );
          })}
          {Object.keys(data.scannerBreakdown).length === 0 && (
            <div className="col-span-full py-16 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              No evaluated picks yet — run Discovery to start building the track record.
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
        <span>Last {data.totalPicks} signals · {data.evaluatedCount} evaluated · {data.pendingCount} pending</span>
        <span>Beta-Neutral Jensen Alpha Evaluation</span>
      </div>
    </div>
  );
}

function PickHighlight({ pick, label, accent, border }: { pick: PickRecord; label: string; accent: string; border: string }) {
  return (
    <div className={`glass-card border ${border} p-6 relative overflow-hidden`}>
      <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-4 ${accent}`}>{label}</p>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold font-mono text-white">{pick.ticker}</span>
        <span className={`text-xl font-bold font-mono ${accent}`}>
          {pick.alpha !== null ? `${pick.alpha >= 0 ? "+" : ""}${(pick.alpha * 100).toFixed(2)}%` : "—"} α
        </span>
      </div>
      <div className="mt-3 flex gap-4 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
        <span>Entry ${pick.entry.toFixed(2)}</span>
        {pick.exit && <span>Exit ${pick.exit.toFixed(2)}</span>}
        <span className={getScannerColor(pick.scanner)}>{pick.scanner.slice(0, 10)}</span>
      </div>
    </div>
  );
}
