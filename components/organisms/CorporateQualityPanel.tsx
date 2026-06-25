"use client";

import React, { useState } from "react";
import { StockDetails } from "@/lib/stock-details";
import {
  calculateAltmanZScore,
  calculatePiotroskiFScore,
  calculateBeneishMScore,
} from "@/lib/corporate-quality";

interface CorporateQualityPanelProps {
  details: StockDetails;
}

export function CorporateQualityPanel({ details }: CorporateQualityPanelProps) {
  const altman = calculateAltmanZScore(details);
  const piotroski = calculatePiotroskiFScore(details);
  const beneish = calculateBeneishMScore(details);

  const [showFScoreDetails, setShowFScoreDetails] = useState(false);

  if (!altman.isApplicable && !piotroski.isApplicable && !beneish.isApplicable) {
    return null;
  }

  return (
    <section className="bg-[#0a0a0a] p-6 border border-white/5 rounded-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-4 bg-white" />
        <div>
          <h2 className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">
            Corporate Quality &amp; Solvency Diagnostics
          </h2>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Insolvency Risk • Financial Strength • Earnings Integrity
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── 1. Altman Z-Score ── */}
        <div className="bg-[#0f0f11] border border-white/5 rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <span>Altman Z-Score</span>
              <span className={altman.color}>{altman.classification}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold text-white tracking-tight">{altman.score}</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Calculates bankruptcy probability. Scores &gt; 2.99 are in the safe zone; &lt; 1.81 indicate financial distress.
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-white/5">
            {/* Custom slider gauge */}
            <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
              <div className="w-[45%] h-full bg-bear" />
              <div className="w-[30%] h-full bg-amber-500" />
              <div className="w-[25%] h-full bg-bull" />
              {/* Marker pin */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_4px_white]"
                style={{
                  left: `${Math.min(100, Math.max(0, (altman.score / 5) * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-zinc-600 font-bold uppercase">
              <span>Distress (&lt;1.8)</span>
              <span>Grey (1.8-3.0)</span>
              <span>Safe (&gt;3.0)</span>
            </div>
          </div>
        </div>

        {/* ── 2. Piotroski F-Score ── */}
        <div className="bg-[#0f0f11] border border-white/5 rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <span>Piotroski F-Score</span>
              <span className={piotroski.color}>{piotroski.classification}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold text-white tracking-tight">{piotroski.score}</span>
              <span className="text-xs font-mono font-bold text-zinc-600">/9</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Evaluates overall financial strength based on 9 core metrics. Ranks from 0 (weakest) to 9 (strongest).
            </p>
          </div>

          <div className="pt-3 border-t border-white/5">
            <button
              onClick={() => setShowFScoreDetails(!showFScoreDetails)}
              className="text-[9px] font-bold uppercase tracking-wider text-matrix hover:text-white transition-colors"
            >
              {showFScoreDetails ? "Hide Score Breakdown ▲" : "View Score Breakdown ▼"}
            </button>
          </div>
        </div>

        {/* ── 3. Beneish M-Score ── */}
        <div className="bg-[#0f0f11] border border-white/5 rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <span>Beneish M-Score</span>
              <span className={beneish.color}>{beneish.classification}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold text-white tracking-tight">{beneish.score}</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Detects likelihood of earnings manipulation. Scores above -1.78 indicate high risk of accounting irregularities.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/5">
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-zinc-500 uppercase font-bold">Risk Threshold</span>
              <span className="text-white font-bold">-1.78</span>
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-zinc-500 uppercase font-bold">Status</span>
              <span className={beneish.classification === "High Risk" ? "text-bear font-bold" : "text-bull font-bold"}>
                {beneish.classification === "High Risk" ? "Alert (Manipulator)" : "Clear (Non-Manipulator)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── F-Score Checklist Drawer ── */}
      {showFScoreDetails && (
        <div className="bg-[#0c0c0e] border border-white/5 rounded-lg p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5 pb-2">
            9-Point Financial Strength Checklist
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {piotroski.checks.map((c) => (
              <div
                key={c.id}
                className={`p-3 border rounded-lg flex items-start gap-3 transition-colors ${
                  c.passed
                    ? "border-bull/10 bg-bull/[0.01]"
                    : "border-white/5 bg-transparent"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {c.passed ? (
                    <span className="w-4 h-4 rounded-full bg-bull/10 border border-bull/30 flex items-center justify-center text-[8px] font-black text-bull">
                      ✓
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-[8px] font-black text-zinc-600">
                      —
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className={`text-[10px] font-bold ${c.passed ? "text-white" : "text-zinc-500"}`}>
                    {c.label}
                  </div>
                  <div className="text-[9px] text-zinc-600 leading-normal font-medium">{c.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
