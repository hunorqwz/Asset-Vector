"use client";

import React, { useState, useMemo } from "react";
import { StockDetails } from "@/lib/stock-details";
import { calculateWacc, calculateGordonDDM } from "@/lib/corporate-quality";
import { fmt } from "@/lib/format";

interface WaccCalculatorProps {
  details: StockDetails;
}

export function WaccCalculator({ details }: WaccCalculatorProps) {
  // Setup state for inputs
  const [rf, setRf] = useState(4.2); // Percent
  const [erp, setErp] = useState(5.5); // Percent
  const [costOfDebt, setCostOfDebt] = useState(5.5); // Percent
  const [taxRate, setTaxRate] = useState(21); // Percent
  const [divGrowth, setDivGrowth] = useState(4.0); // Percent

  const beta = details.keyStats.beta !== null ? details.keyStats.beta : 1.0;

  // Recalculate WACC and DDM dynamically on inputs changes
  const { waccResult, ddmResult } = useMemo(() => {
    const w = calculateWacc(
      details,
      rf / 100,
      erp / 100,
      taxRate / 100,
      costOfDebt / 100
    );
    const d = calculateGordonDDM(details, w.wacc, divGrowth / 100);

    return { waccResult: w, ddmResult: d };
  }, [details, rf, erp, costOfDebt, taxRate, divGrowth]);

  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  return (
    <section className="bg-[#0a0a0a] p-6 border border-white/5 rounded-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-4 bg-white" />
          <div>
            <h2 className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">
              WACC &amp; Dividend Discount Model Calculator
            </h2>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Dynamic Cost of Capital &amp; Gordon Growth Valuation
            </p>
          </div>
        </div>
        <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
          Beta Ref: <span className="text-white">{beta.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Inputs Panel (Sliders) ── */}
        <div className="lg:col-span-6 space-y-5">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5 pb-2">
            Model Parameters
          </h3>

          {/* 1. Risk-free rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold">
              <span className="text-zinc-500 uppercase">Risk-Free Rate (Rf)</span>
              <span className="text-white">{rf.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={rf}
              onChange={(e) => setRf(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
            />
          </div>

          {/* 2. Equity Risk Premium */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold">
              <span className="text-zinc-500 uppercase">Equity Risk Premium (ERP)</span>
              <span className="text-white">{erp.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="0.1"
              value={erp}
              onChange={(e) => setErp(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
            />
          </div>

          {/* 3. Cost of Debt */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold">
              <span className="text-zinc-500 uppercase">Pre-tax Cost of Debt (Rd)</span>
              <span className="text-white">{costOfDebt.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.1"
              value={costOfDebt}
              onChange={(e) => setCostOfDebt(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
            />
          </div>

          {/* 4. Tax rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold">
              <span className="text-zinc-500 uppercase">Corporate Tax Rate (T)</span>
              <span className="text-white">{taxRate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="1"
              value={taxRate}
              onChange={(e) => setTaxRate(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
            />
          </div>

          {/* 5. Dividend growth rate */}
          {ddmResult.isApplicable && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                <span className="text-zinc-500 uppercase">Expected Div. Growth (g)</span>
                <span className="text-white">{divGrowth.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={divGrowth}
                onChange={(e) => setDivGrowth(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
              />
            </div>
          )}
        </div>

        {/* ── Outputs Panel ── */}
        <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5 pb-2">
              Cost of Capital Breakdown
            </h3>

            {/* Calculations metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0f0f11] border border-white/5 rounded p-3.5 space-y-1">
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                  Cost of Equity (Re)
                </div>
                <div className="text-[16px] font-mono font-bold text-white">
                  {pct(waccResult.costOfEquity)}
                </div>
              </div>

              <div className="bg-[#0f0f11] border border-white/5 rounded p-3.5 space-y-1">
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                  Cost of Debt (After-Tax)
                </div>
                <div className="text-[16px] font-mono font-bold text-white">
                  {pct(waccResult.costOfDebtAfterTax)}
                </div>
              </div>

              <div className="bg-[#0f0f11] border border-white/5 rounded p-3.5 space-y-1">
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                  Equity weight (E/V)
                </div>
                <div className="text-[16px] font-mono font-bold text-white">
                  {pct(waccResult.weightEquity)}
                </div>
              </div>

              <div className="bg-[#0f0f11] border border-white/5 rounded p-3.5 space-y-1">
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                  Debt weight (D/V)
                </div>
                <div className="text-[16px] font-mono font-bold text-white">
                  {pct(waccResult.weightDebt)}
                </div>
              </div>
            </div>
          </div>

          {/* WACC output banner */}
          <div className="bg-matrix/5 border border-matrix/20 rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="text-[9px] font-bold text-matrix uppercase tracking-widest">
                Weighted Avg Cost of Capital (WACC)
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                Estimated discount rate representing corporate hurdle rate.
              </div>
            </div>
            <div className="text-2xl font-mono font-black text-white pr-2">
              {pct(waccResult.wacc)}
            </div>
          </div>

          {/* Gordon DDM Valuation Result */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-3">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Gordon Growth Dividend Discount Model
            </div>
            {ddmResult.isApplicable && ddmResult.fairValue !== null ? (
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-xl font-mono font-bold text-bull">
                    ${ddmResult.fairValue.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                    DDM Fair Value (Current: ${details.price.current.toFixed(2)})
                  </div>
                </div>
                <div
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                    ddmResult.fairValue > details.price.current
                      ? "border-bull/20 bg-bull/5 text-bull"
                      : "border-bear/20 bg-bear/5 text-bear"
                  }`}
                >
                  {ddmResult.fairValue > details.price.current ? "Undervalued" : "Overvalued"}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500 italic">
                {ddmResult.message || "Dividend Discount Model is not applicable for this asset profile."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
