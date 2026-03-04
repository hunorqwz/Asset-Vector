"use client";
import React, { useState } from "react";
import { RegimeBreakout } from "@/lib/regime-radar";

interface RegimeRadarProps {
  data: RegimeBreakout;
}

const REGIME_LABELS: Record<string, { label: string; color: string; bg: string; description: string }> = {
  MOMENTUM:       { label: "MOMENTUM",        color: "text-bull",    bg: "bg-bull/10 border-bull/20",   description: "Persistent trends. The market has memory." },
  MEAN_REVERSION: { label: "MEAN REVERSION",  color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", description: "Oscillating range. Extremes are faded." },
  RANDOM_WALK:    { label: "NOISE / RANDOM",  color: "text-zinc-400", bg: "bg-white/5 border-white/10",   description: "No structural edge. Brownian motion." },
};

const URGENCY_COLORS: Record<string, string> = {
  HIGH:   "bg-bear text-white",
  MEDIUM: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  LOW:    "bg-matrix/20 text-matrix border border-matrix/30",
};

export function RegimeRadar({ data }: RegimeRadarProps) {
  const [expanded, setExpanded] = useState(false);
  const regime = REGIME_LABELS[data.currentRegime];
  const prevRegime = data.previousRegime ? REGIME_LABELS[data.previousRegime] : null;
  const hurstPct = Math.round(data.hurstScore * 100);
  const predictPct = Math.round(data.predictability * 100);

  return (
    <div className={`glass-card border overflow-hidden relative transition-all duration-500 ${
      data.isBreakout && data.urgency === "HIGH" 
        ? "border-bear/40 shadow-[0_0_40px_rgba(239,68,68,0.08)]" 
        : data.isBreakout 
        ? "border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.05)]"
        : "border-white/10"
    }`}>
      {/* Top accent gradient */}
      <div className={`absolute top-0 left-0 w-full h-[1px] ${
        data.urgency === "HIGH" ? "bg-gradient-to-r from-transparent via-bear/60 to-transparent"
        : data.urgency === "MEDIUM" ? "bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"
        : "bg-gradient-to-r from-transparent via-matrix/40 to-transparent"
      }`} />

      {/* Breakout pulse overlay */}
      {data.isBreakout && (
        <div className={`absolute top-0 right-0 px-3 py-1.5 ${URGENCY_COLORS[data.urgency]} text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5`}>
          {data.urgency === "HIGH" && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          )}
          REGIME SHIFT DETECTED
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* LEFT: Current Regime / Hurst Gauge */}
        <div className="xl:col-span-4 p-8 border-r border-white/5">
          <p className="text-[10px] font-bold text-matrix tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
            Regime Breakout Radar
          </p>

          {/* Primary Regime Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border text-[11px] font-bold uppercase tracking-widest mb-6 ${regime.bg} ${regime.color}`}>
            {data.currentRegime === "MOMENTUM" ? "⟶" : data.currentRegime === "MEAN_REVERSION" ? "⟺" : "~"} {regime.label}
          </div>
          <p className="text-[11px] text-zinc-500 font-medium mb-8 leading-relaxed">{regime.description}</p>

          {/* Hurst Exponent Gauge */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hurst Exponent (H)</span>
              <span className={`text-[14px] font-bold font-mono ${regime.color}`}>{data.hurstScore.toFixed(3)}</span>
            </div>
            <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-white/5">
              {/* Mean reversion zone (0 - 0.45) */}
              <div className="absolute left-0 top-0 h-full bg-amber-500/20" style={{ width: "45%" }} />
              {/* Random walk zone (0.45 - 0.55) */}
              <div className="absolute top-0 h-full bg-white/10" style={{ left: "45%", width: "10%" }} />
              {/* Momentum zone (0.55 - 1.0) */}
              <div className="absolute right-0 top-0 h-full bg-bull/20" style={{ width: "45%" }} />
              {/* Needle */}
              <div
                className={`absolute top-0 h-full w-[3px] rounded-full ${regime.color.replace("text-", "bg-")} shadow-[0_0_8px_currentColor] transition-all duration-1000`}
                style={{ left: `calc(${hurstPct}% - 1.5px)` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
              <span>Mean Rev. ← 0.45</span>
              <span>Random</span>
              <span>0.55 → Trend</span>
            </div>
          </div>

          {/* Predictability Score */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Structural Predictability</span>
              <span className="text-[13px] font-bold font-mono text-white">{predictPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${predictPct > 50 ? regime.color.replace("text-", "bg-") : "bg-white/30"}`}
                style={{ width: `${predictPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Analysis Panel */}
        <div className="xl:col-span-8 p-8">
          {/* Regime Transition */}
          {data.isBreakout && prevRegime && (
            <div className={`mb-8 p-4 border rounded flex items-center gap-4 ${
              data.urgency === "HIGH" ? "border-bear/20 bg-bear/5" : "border-amber-500/20 bg-amber-500/5"
            }`}>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-[0.25em] mb-2 ${data.urgency === "HIGH" ? "text-bear" : "text-amber-400"}`}>
                  Structural Transition Event
                </p>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${prevRegime.bg} ${prevRegime.color}`}>
                    {prevRegime.label}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={data.urgency === "HIGH" ? "text-bear" : "text-amber-400"}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${regime.bg} ${regime.color}`}>
                    {regime.label}
                  </span>
                  {data.breakoutDirection && (
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                      ({data.breakoutDirection})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Trend + Strategy */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-2xl font-bold tracking-tightest leading-none">Strategic Posture</h3>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                data.trend === "BULLISH" ? "bg-bull/20 text-bull" :
                data.trend === "BEARISH" ? "bg-bear/20 text-bear" :
                "bg-white/10 text-zinc-400"
              }`}>{data.trend} DRIFT</span>
            </div>
            <p className="text-[13px] text-zinc-300 leading-relaxed font-medium border-l-2 border-white/10 pl-4">
              {data.strategySuggestion}
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Regime", value: data.currentRegime.replace(/_/g, " "), color: regime.color },
              { label: "Drift Bias", value: data.trend, color: data.trend === "BULLISH" ? "text-bull" : data.trend === "BEARISH" ? "text-bear" : "text-zinc-400" },
              { label: "Urgency", value: data.urgency, color: data.urgency === "HIGH" ? "text-bear" : data.urgency === "MEDIUM" ? "text-amber-400" : "text-matrix" },
            ].map(m => (
              <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded p-4">
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{m.label}</p>
                <p className={`text-[13px] font-bold font-mono uppercase tracking-tight ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Collapsible: Theory Explanation */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 hover:text-zinc-300 uppercase tracking-widest transition-colors mb-4"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
              className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}>
              <path d="M9 18l6-6-6-6" />
            </svg>
            {expanded ? "Hide" : "Show"} Methodology
          </button>

          {expanded && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {[
                { label: "Hurst Exponent (H)", desc: "Measured via Rescaled Range (R/S) analysis across 5 log-spaced lag windows (8→128). H is the OLS slope of log(lag) vs log(R/S)." },
                { label: "Window Regime Delta", desc: "Two sequential 60-day windows are compared. A regime mismatch between them is classified as a Structural Transition Event." },
                { label: "Predictability Score", desc: "|H − 0.5| × 2. Zero means pure random walk. One means a perfectly defined structural behavior (trend or reversion)." },
              ].map(t => (
                <div key={t.label} className="bg-white/[0.02] border border-white/5 rounded p-3">
                  <p className="text-[10px] font-bold text-matrix uppercase tracking-widest mb-1">{t.label}</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
            <div className="text-[9px] bg-matrix/20 text-matrix px-1.5 py-0.5 rounded font-black tracking-widest uppercase shrink-0">R/S ANALYSIS</div>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              Benchmark: SPY (S&P 500) · Hurst Detected at {new Date(data.detectedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
