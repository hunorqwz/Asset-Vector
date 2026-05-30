"use client";

import React, { useState, useEffect } from "react";
import { RiskIntelligence } from "@/lib/portfolio-risk";
import { useEducation } from "@/components/providers/EducationProvider";

interface ContextualCoachProps {
  risk: RiskIntelligence;
}

export function ContextualCoach({ risk }: ContextualCoachProps) {
  const { openEducation } = useEducation();
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load dismissed alerts from local storage
    const loaded: Record<string, boolean> = {};
    ["beta", "correlation", "var"].forEach((key) => {
      const isDismissed = localStorage.getItem(`coach-dismissed-${key}`) === "true";
      if (isDismissed) {
        loaded[key] = true;
      }
    });
    setDismissedAlerts(loaded);
  }, []);

  if (!mounted) return null;

  const dismiss = (key: string) => {
    localStorage.setItem(`coach-dismissed-${key}`, "true");
    setDismissedAlerts((prev) => ({ ...prev, [key]: true }));
  };

  const resetDismissals = () => {
    ["beta", "correlation", "var"].forEach((key) => {
      localStorage.removeItem(`coach-dismissed-${key}`);
    });
    setDismissedAlerts({});
  };

  // 1. Beta Warning (Threshold: > 1.3)
  const showBetaWarning = risk.portfolioBeta > 1.3 && !dismissedAlerts["beta"];

  // 2. Correlation Warning (Threshold: any high correlation alert from risk engine)
  const showCorrWarning = risk.correlationAlerts.length > 0 && !dismissedAlerts["correlation"];

  // 3. Value-at-Risk Warning (Threshold: > 2.0% daily VaR)
  const showVarWarning = risk.var95 > 2.0 && !dismissedAlerts["var"];

  const hasVisibleAlerts = showBetaWarning || showCorrWarning || showVarWarning;

  if (!hasVisibleAlerts) {
    // If all alerts are dismissed but they were applicable, show a subtle reset button
    const anyDismissedApplicable = 
      (risk.portfolioBeta > 1.3 && dismissedAlerts["beta"]) ||
      (risk.correlationAlerts.length > 0 && dismissedAlerts["correlation"]) ||
      (risk.var95 > 2.0 && dismissedAlerts["var"]);

    if (anyDismissedApplicable) {
      return (
        <div className="flex justify-end mb-6">
          <button 
            onClick={resetDismissals}
            className="text-[9px] font-bold text-zinc-500 hover:text-matrix uppercase tracking-widest transition-colors flex items-center gap-1.5"
          >
            <span>Reset Coach Insights ↺</span>
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4 mb-10 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 px-1">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
          Active Quantitative Coach Insights
        </h3>
        <button 
          onClick={resetDismissals}
          className="text-[9px] font-bold text-zinc-500 hover:text-matrix uppercase tracking-widest transition-colors"
          title="Reset dismissed insights"
        >
          Reset ↺
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* BETA WARNING */}
        {showBetaWarning && (
          <div className="bg-black/40 backdrop-blur-md border border-matrix/20 border-l-[3px] border-l-matrix p-5 rounded-xl flex flex-col justify-between group relative overflow-hidden transition-all hover:border-matrix/40">
            <button 
              onClick={() => dismiss("beta")}
              className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors text-xs font-bold"
              aria-label="Dismiss Alert"
            >
              ✕
            </button>
            <div className="space-y-3">
              <span className="text-[9px] font-bold bg-matrix/10 text-matrix border border-matrix/20 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                Systematic Risk Exposure
              </span>
              <h4 className="text-[12px] font-bold text-white uppercase tracking-wider mt-1">High Systematic Risk (Beta: {risk.portfolioBeta.toFixed(2)})</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                Your portfolio systematic sensitivity is {risk.portfolioBeta.toFixed(2)}x the market. A 10% S&P 500 correction projects to a {Math.round(risk.portfolioBeta * 10)}% drawdown for your holdings.
              </p>
            </div>
            <button
              onClick={() => openEducation("REGIME_BETA", "QUANT")}
              className="mt-5 text-[10px] font-black text-matrix hover:text-purple-300 uppercase tracking-widest transition-colors text-left flex items-center gap-1"
            >
              <span>Learn Systematic Risk Exposure ↗</span>
            </button>
          </div>
        )}

        {/* CORRELATION WARNING */}
        {showCorrWarning && (
          <div className="bg-black/40 backdrop-blur-md border border-bear/20 border-l-[3px] border-l-bear p-5 rounded-xl flex flex-col justify-between group relative overflow-hidden transition-all hover:border-bear/40">
            <button 
              onClick={() => dismiss("correlation")}
              className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors text-xs font-bold"
              aria-label="Dismiss Alert"
            >
              ✕
            </button>
            <div className="space-y-3">
              <span className="text-[9px] font-bold bg-bear/10 text-bear border border-bear/20 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                Systemic Covariance Cluster
              </span>
              <h4 className="text-[12px] font-bold text-white uppercase tracking-wider mt-1">High Asset Covariance</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                {risk.correlationAlerts[0]} High correlation means these assets move in lockstep, eliminating diversification benefits.
              </p>
            </div>
            <button
              onClick={() => openEducation("PORTFOLIO_CORRELATION", "QUANT")}
              className="mt-5 text-[10px] font-black text-bear hover:text-red-300 uppercase tracking-widest transition-colors text-left flex items-center gap-1"
            >
              <span>Study Asset Covariance Matrix ↗</span>
            </button>
          </div>
        )}

        {/* VALUE AT RISK WARNING */}
        {showVarWarning && (
          <div className="bg-black/40 backdrop-blur-md border border-bull/20 border-l-[3px] border-l-bull p-5 rounded-xl flex flex-col justify-between group relative overflow-hidden transition-all hover:border-bull/40">
            <button 
              onClick={() => dismiss("var")}
              className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors text-xs font-bold"
              aria-label="Dismiss Alert"
            >
              ✕
            </button>
            <div className="space-y-3">
              <span className="text-[9px] font-bold bg-bull/10 text-bull border border-bull/20 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                Downside Risk Threshold
              </span>
              <h4 className="text-[12px] font-bold text-white uppercase tracking-wider mt-1">High Parametric VaR ({risk.var95.toFixed(2)}%)</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                Your 1-day 95% Parametric VaR indicates a 5% probability of experiencing a portfolio loss greater than {risk.var95.toFixed(2)}% in a single day.
              </p>
            </div>
            <button
              onClick={() => openEducation("VALUE_AT_RISK", "QUANT")}
              className="mt-5 text-[10px] font-black text-bull hover:text-green-300 uppercase tracking-widest transition-colors text-left flex items-center gap-1"
            >
              <span>Audit Parametric VaR Calculations ↗</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
