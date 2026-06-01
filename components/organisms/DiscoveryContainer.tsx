"use client";

import React, { useState } from "react";
import Link from "next/link";
import { InfoTooltip } from "@/components/atoms/InfoTooltip";
import { EducationCategory } from "@/components/providers/EducationProvider";

export interface AlphaPick {
  ticker: string;
  name: string;
  price: number;
  change: number;
  score: number;
  scanner: "MOMENTUM" | "VALUE" | "UNCORRELATED" | "SURGICAL_ALPHA" | "REGIME_FIT" | "VOL_SQUEEZE";
  correlationToPortfolio?: number;
  beta?: number;
  reason?: string;
  sector?: string;
  forwardPE?: number | null;
  rsi?: number;
  volume?: number;
}

interface DiscoveryContainerProps {
  initialPicks: AlphaPick[];
}

export function DiscoveryContainer({ initialPicks }: DiscoveryContainerProps) {
  const [activeScanner, setActiveScanner] = useState<string | null>(null);
  const [highConvictionOnly, setHighConvictionOnly] = useState(false);
  const [hedgeOnly, setHedgeOnly] = useState(false);

  // Screener / Parameter Tuning States
  const [showTuningPanel, setShowTuningPanel] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [maxPE, setMaxPE] = useState<number>(100);
  const [includeNaPE, setIncludeNaPE] = useState<boolean>(true);
  const [rsiMode, setRsiMode] = useState<"ALL" | "OVERSOLD" | "NEUTRAL" | "OVERBOUGHT" | "CUSTOM">("ALL");
  const [minRsi, setMinRsi] = useState<number>(0);
  const [maxRsi, setMaxRsi] = useState<number>(100);
  const [minVolume, setMinVolume] = useState<number>(0);

  // Extract unique sectors
  const availableSectors = Array.from(
    new Set(initialPicks.map((p) => p.sector).filter((s): s is string => !!s))
  );
  availableSectors.sort();

  const hasActiveTuning =
    selectedSector !== "ALL" ||
    maxPE !== 100 ||
    !includeNaPE ||
    rsiMode !== "ALL" ||
    minVolume !== 0;

  // Filter logic
  const filteredPicks = initialPicks.filter((pick) => {
    // 1. Scanner type
    if (activeScanner) {
      if (activeScanner === "SURGICAL_ALPHA" && pick.scanner !== "SURGICAL_ALPHA") return false;
      if (activeScanner === "REGIME_FIT" && pick.scanner !== "REGIME_FIT" && pick.scanner !== "MOMENTUM") return false;
      if (activeScanner === "VOL_SQUEEZE" && pick.scanner !== "VOL_SQUEEZE" && pick.scanner !== "UNCORRELATED") return false;
    }
    // 2. High conviction score (> 85)
    if (highConvictionOnly && pick.score <= 85) return false;
    // 3. Hedge candidates (portfolio correlation < 0.2)
    if (hedgeOnly) {
      if (pick.correlationToPortfolio === undefined || pick.correlationToPortfolio >= 0.2) return false;
    }
    // 4. Sector
    if (selectedSector !== "ALL" && pick.sector !== selectedSector) return false;
    // 5. Forward P/E
    if (pick.forwardPE === undefined || pick.forwardPE === null) {
      if (!includeNaPE) return false;
    } else {
      if (pick.forwardPE > maxPE) return false;
    }
    // 6. RSI
    if (pick.rsi !== undefined) {
      if (rsiMode === "OVERSOLD" && pick.rsi >= 30) return false;
      if (rsiMode === "NEUTRAL" && (pick.rsi < 30 || pick.rsi > 70)) return false;
      if (rsiMode === "OVERBOUGHT" && pick.rsi <= 70) return false;
      if (rsiMode === "CUSTOM" && (pick.rsi < minRsi || pick.rsi > maxRsi)) return false;
    }
    // 7. Volume
    if (pick.volume !== undefined && pick.volume < minVolume) return false;

    return true;
  });

  const toggleScanner = (scanner: string) => {
    setActiveScanner((prev) => (prev === scanner ? null : scanner));
  };

  const isFilterActive = activeScanner !== null || highConvictionOnly || hedgeOnly || hasActiveTuning;

  const resetFilters = () => {
    setActiveScanner(null);
    setHighConvictionOnly(false);
    setHedgeOnly(false);
    setSelectedSector("ALL");
    setMaxPE(100);
    setIncludeNaPE(true);
    setRsiMode("ALL");
    setMinRsi(0);
    setMaxRsi(100);
    setMinVolume(0);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Scanner Categories Info (Interactive filter cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ScannerFilterCard
          title="Alpha Signals"
          description="Stocks with strong buy signals from multiple institutional sources."
          color="bg-bull"
          badge="TOP TIER"
          insightKey="JENSENS_ALPHA"
          category="QUANT"
          isActive={activeScanner === "SURGICAL_ALPHA"}
          onClick={() => toggleScanner("SURGICAL_ALPHA")}
        />
        <ScannerFilterCard
          title="Trend-Aligned"
          description="Stocks moving predictably with the overall market trend."
          color="bg-matrix"
          badge="STRUCTURAL"
          insightKey="HURST_EXPONENT"
          category="QUANT"
          isActive={activeScanner === "REGIME_FIT"}
          onClick={() => toggleScanner("REGIME_FIT")}
        />
        <ScannerFilterCard
          title="Breakout Scans"
          description="Stocks consolidating and preparing for a major directional move."
          color="bg-bear"
          badge="SQUEEZE"
          insightKey="TTM_SQUEEZE"
          category="QUANT"
          isActive={activeScanner === "VOL_SQUEEZE"}
          onClick={() => toggleScanner("VOL_SQUEEZE")}
        />
      </div>

      {/* Filter Toolbar & Parameter Screener */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setHighConvictionOnly((v) => !v)}
              className={`px-3 py-1.5 border text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                highConvictionOnly
                  ? "bg-matrix/10 border-matrix/40 text-matrix"
                  : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
              aria-label="Filter high conviction only"
            >
              Score &gt; 85 Only
            </button>
            
            <button
              onClick={() => setHedgeOnly((v) => !v)}
              className={`px-3 py-1.5 border text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                hedgeOnly
                  ? "bg-zinc-800/80 border-white/30 text-white"
                  : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
              aria-label="Filter low correlation hedge assets"
            >
              Defensive Hedge Candidates
            </button>

            <button
              onClick={() => setShowTuningPanel((v) => !v)}
              className={`px-3 py-1.5 border text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                showTuningPanel || hasActiveTuning
                  ? "bg-matrix/10 border-matrix/40 text-matrix"
                  : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
              aria-label="Toggle parameter tuning panel"
            >
              <span>Parameter Screener</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20v-8M12 8V4M5 20v-4M5 12V4M19 20v-12M19 4V4M2 16h6M9 8h6M16 12h6" />
              </svg>
            </button>
          </div>

          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
              aria-label="Reset all screener filters"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              Reset Filters ({filteredPicks.length} shown)
            </button>
          )}
        </div>

        {/* Collapsible Parameter Tuning Panel */}
        {showTuningPanel && (
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-200">
            {/* Sector Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Sector
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-matrix/50 cursor-pointer"
              >
                <option value="ALL">All Sectors</option>
                {availableSectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            {/* Forward P/E Limit */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Max Forward P/E
                </label>
                <span className="text-xs font-mono font-bold text-white">{maxPE}</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                value={maxPE}
                onChange={(e) => setMaxPE(Number(e.target.value))}
                className="w-full accent-matrix cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
              <label className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeNaPE}
                  onChange={(e) => setIncludeNaPE(e.target.checked)}
                  className="rounded border-white/10 text-matrix focus:ring-0 focus:ring-offset-0 accent-matrix bg-zinc-950"
                />
                Include N/A P/E
              </label>
            </div>

            {/* RSI Range */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                RSI Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["ALL", "OVERSOLD", "NEUTRAL", "OVERBOUGHT", "CUSTOM"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRsiMode(mode)}
                    className={`px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wider border transition-all cursor-pointer ${
                      rsiMode === mode
                        ? "bg-matrix/10 border-matrix/40 text-matrix"
                        : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:border-white/15"
                    } ${mode === "ALL" ? "col-span-2" : ""}`}
                  >
                    {mode === "ALL" ? "All RSI" : mode}
                  </button>
                ))}
              </div>

              {rsiMode === "CUSTOM" && (
                <div className="flex flex-col gap-2 mt-2 p-3 bg-white/[0.01] border border-white/5 rounded-lg">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Min RSI</span>
                    <span className="font-mono text-white">{minRsi}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minRsi}
                    onChange={(e) => setMinRsi(Math.min(Number(e.target.value), maxRsi))}
                    className="w-full accent-matrix cursor-pointer bg-zinc-800 h-1 rounded appearance-none"
                  />

                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Max RSI</span>
                    <span className="font-mono text-white">{maxRsi}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={maxRsi}
                    onChange={(e) => setMaxRsi(Math.max(Number(e.target.value), minRsi))}
                    className="w-full accent-matrix cursor-pointer bg-zinc-800 h-1 rounded appearance-none"
                  />
                </div>
              )}
            </div>

            {/* Volume Threshold */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Min Volume
              </label>
              <div className="flex gap-1.5 mb-1">
                {[
                  { label: "All", value: 0 },
                  { label: "500k", value: 500000 },
                  { label: "1M", value: 1000000 },
                  { label: "5M", value: 5000000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setMinVolume(preset.value)}
                    className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all cursor-pointer ${
                      minVolume === preset.value
                        ? "bg-matrix/10 border-matrix/40 text-matrix"
                        : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:border-white/15"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100000"
                  placeholder="Custom Min Volume"
                  value={minVolume === 0 ? "" : minVolume}
                  onChange={(e) => setMinVolume(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 pr-12 text-xs text-white font-mono focus:outline-none focus:border-matrix/50"
                />
                {minVolume > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-500 font-mono uppercase">
                    {minVolume >= 1e6 ? `${(minVolume / 1e6).toFixed(1)}M` : `${(minVolume / 1000).toFixed(0)}k`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Picks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredPicks.map((pick) => (
          <DiscoveryCard key={pick.ticker} pick={pick} />
        ))}
        {filteredPicks.length === 0 && (
          <div className="col-span-full border border-white/5 bg-zinc-950/30 p-24 text-center rounded-xl">
            <div className="w-16 h-16 rounded-full bg-matrix/5 border border-matrix/20 flex items-center justify-center mx-auto mb-6">
              <div className="w-4 h-4 bg-matrix rounded-full" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide mb-2">No results found</h2>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto">No assets match your current filters. Try adjusting your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScannerFilterCard({
  title,
  description,
  color,
  badge,
  insightKey,
  category = "QUANT",
  isActive,
  onClick,
}: {
  title: string;
  description: string;
  color: string;
  badge: string;
  insightKey?: string;
  category?: EducationCategory;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-6 border relative overflow-hidden transition-all duration-300 flex flex-col group rounded-xl cursor-pointer ${
        isActive
          ? "bg-white/[0.06] border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          : "bg-white/[0.02] border-white/5 hover:border-white/15"
      }`}
    >
      <div className={`absolute -top-4 -right-4 w-24 h-24 ${color} opacity-[0.03] blur-3xl group-hover:opacity-[0.08] transition-opacity`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-sans font-bold text-white tracking-tight uppercase leading-none">{title}</span>
          {insightKey && <InfoTooltip insightKey={insightKey} category={category} />}
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 border border-white/10 bg-white/5 rounded text-zinc-400 uppercase tracking-widest font-mono">
          {badge}
        </span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium mt-1">{description}</p>
      
      {/* Active Indicator bar */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40 animate-in fade-in" />
      )}
    </div>
  );
}

function DiscoveryCard({ pick }: { pick: AlphaPick }) {
  const scannerColors: Record<string, string> = {
    SURGICAL_ALPHA: "text-bull border-bull/30 bg-bull/5",
    REGIME_FIT: "text-matrix border-matrix/30 bg-matrix/5",
    VOL_SQUEEZE: "text-bear border-bear/30 bg-bear/5",
    MOMENTUM: "text-zinc-200 border-zinc-500/30 bg-zinc-500/5",
    VALUE: "text-zinc-200 border-zinc-500/30 bg-zinc-500/5",
    UNCORRELATED: "text-zinc-200 border-zinc-500/30 bg-zinc-500/5",
  };

  const scannerLabels: Record<string, string> = {
    SURGICAL_ALPHA: "Alpha Signal",
    REGIME_FIT: "Trend-Aligned",
    VOL_SQUEEZE: "Breakout",
    MOMENTUM: "Momentum",
    VALUE: "Value",
    UNCORRELATED: "Uncorrelated",
  };

  return (
    <Link
      href={`/asset/${pick.ticker}`}
      className="bg-white/[0.02] flex flex-col h-full border border-white/5 transition-all duration-300 p-6 group relative rounded-xl hover:bg-white/[0.04]"
    >
      <div className="flex justify-between items-start mb-6 gap-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold font-mono text-white uppercase tracking-wider">{pick.ticker}</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium block w-full whitespace-nowrap overflow-hidden transition-colors">{pick.name}</span>
        </div>
        <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider shadow-sm ${scannerColors[pick.scanner] || "text-zinc-400 border-white/5 bg-white/5"}`}>
          {scannerLabels[pick.scanner] || pick.scanner.replace("_", " ")}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {pick.sector && (
          <div className="flex items-center justify-between text-[10px] border-b border-white/[0.02] pb-1.5">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">Sector</span>
            <span className="font-medium text-zinc-300">{pick.sector}</span>
          </div>
        )}

        {pick.forwardPE !== undefined && (
          <div className="flex items-center justify-between text-[10px] border-b border-white/[0.02] pb-1.5">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">Forward P/E</span>
            <span className="font-mono font-bold text-zinc-300">
              {pick.forwardPE !== null ? pick.forwardPE.toFixed(1) : "N/A"}
            </span>
          </div>
        )}

        {pick.rsi !== undefined && (
          <div className="flex items-center justify-between text-[10px] border-b border-white/[0.02] pb-1.5">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">RSI (14d)</span>
            <span className={`font-mono font-bold ${
              pick.rsi < 30 ? "text-bull" : 
              pick.rsi > 70 ? "text-bear" : "text-zinc-300"
            }`}>
              {pick.rsi.toFixed(0)}
            </span>
          </div>
        )}

        {pick.volume !== undefined && (
          <div className="flex items-center justify-between text-[10px] border-b border-white/[0.02] pb-1.5">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">Volume</span>
            <span className="font-mono font-bold text-zinc-300">
              {pick.volume >= 1e6 
                ? `${(pick.volume / 1e6).toFixed(2)}M` 
                : pick.volume >= 1e3 
                  ? `${(pick.volume / 1e3).toFixed(1)}k` 
                  : pick.volume}
            </span>
          </div>
        )}

        {pick.correlationToPortfolio !== undefined && (
          <div className="flex items-center justify-between text-[10px] border-b border-white/[0.02] pb-1.5">
            <span className="text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              Portfolio Correlation
              <InfoTooltip insightKey="PORTFOLIO_CORRELATION" category="QUANT" />
            </span>
            <span className={`font-mono font-bold ${
              pick.correlationToPortfolio < 0 ? "text-bull" : 
              pick.correlationToPortfolio > 0.5 ? "text-bear" : "text-zinc-300"
            }`}>
              {pick.correlationToPortfolio > 0 ? "+" : ""}{pick.correlationToPortfolio}
            </span>
          </div>
        )}
        
        {pick.beta !== undefined && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              Systematic Beta
              <InfoTooltip insightKey="REGIME_BETA" category="QUANT" />
            </span>
            <span className="font-mono font-bold text-zinc-300">
              {pick.beta.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between pt-5 border-t border-white/5 mt-auto">
        <div>
          <p className="text-[11px] text-zinc-400 font-medium mb-1.5 flex items-center">
            Alpha Score
            <InfoTooltip insightKey="JENSENS_ALPHA" category="QUANT" />
          </p>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono tracking-tighter ${
              pick.score > 85 ? "text-bull" : 
              pick.score > 75 ? "text-matrix" : "text-white"
            }`}>{pick.score}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
        </div>
        <div className="text-right pb-0.5">
          <p className="text-[13px] font-mono font-bold text-white mb-0.5">${pick.price.toFixed(2)}</p>
          <p className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 ${pick.change >= 0 ? "text-bull" : "text-bear"}`}>
            <span>{pick.change >= 0 ? "+" : ""}{pick.change.toFixed(2)}%</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
