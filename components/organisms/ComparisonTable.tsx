"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ComparisonAsset } from "@/app/actions/compare";
import { calculateAlphaScore, calculateCatalystRisk } from "@/lib/alpha-engine";
import { useEducation } from "@/components/providers/EducationProvider";
import { InfoTooltip } from "@/components/atoms/InfoTooltip";

// ── Formatters ─────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${fmt(n * 100, 1)}%`;
}
function fmtPctDirect(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${fmt(n, 2)}%`;
}
function fmtBig(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `$${fmt(n / 1e12, 2)}T`;
  if (Math.abs(n) >= 1e9) return `$${fmt(n / 1e9, 2)}B`;
  if (Math.abs(n) >= 1e6) return `$${fmt(n / 1e6, 2)}M`;
  return `$${fmt(n, 0)}`;
}

type Direction = "higher" | "lower" | "neutral";

interface RowDef {
  label: string;
  category: string;
  getValue: (a: ComparisonAsset) => number | null;
  format: (n: number | null) => string;
  better: Direction;
  colorize?: boolean;
  tooltip?: string;
}

const ROWS: RowDef[] = [
  // ── Price & Market
  {
    label: "Current Price", category: "Price",
    getValue: a => a.details.price.current,
    format: n => n !== null ? `$${fmt(n)}` : "—",
    better: "neutral",
    tooltip: "Last traded price"
  },
  {
    label: "Market Cap", category: "Price",
    getValue: a => a.details.price.marketCap,
    format: fmtBig, better: "higher",
    tooltip: "Total market capitalisation"
  },
  {
    label: "Day Change", category: "Price",
    getValue: a => a.details.price.dayChangePercent,
    format: fmtPctDirect, better: "higher", colorize: true,
    tooltip: "Today's price change %"
  },
  {
    label: "52W Return", category: "Price",
    getValue: a => a.details.price.fiftyTwoWeekChangePercent,
    format: n => n !== null ? `${n >= 0 ? "+" : ""}${fmt(n * 100, 1)}%` : "—",
    better: "higher", colorize: true,
    tooltip: "12-month price return"
  },
  {
    label: "Distance 52W High", category: "Price",
    getValue: a => a.details.price.distanceFrom52wHigh,
    format: n => n !== null ? `-${fmt(n, 1)}%` : "—",
    better: "lower",
    tooltip: "How far below 52-week high (lower = closer to peak)"
  },

  // ── Synthesis Engine
  {
    label: "Synthesis Score", category: "Synthesis",
    getValue: a => a.signal.synthesis.score,
    format: n => n !== null ? `${fmt(n, 0)} / 100` : "—",
    better: "higher",
    tooltip: "Institutional Synthesis Engine score (0-100)"
  },
  {
    label: "Alpha Score", category: "Synthesis",
    getValue: a => calculateAlphaScore(a.signal, a.details).score,
    format: n => n !== null ? `${fmt(n, 0)} / 100` : "—",
    better: "higher",
    tooltip: "Discovery Engine score: high conviction based on Momentum, Value, and Correlation"
  },
  {
    label: "Signal", category: "Synthesis",
    getValue: a => {
      const map: Record<string, number> = {
        "STRONG BUY": 7, "BUY": 6, "ACCUMULATE": 5, "NEUTRAL": 4,
        "REDUCE": 3, "SELL": 2, "STRONG SELL": 1
      };
      return map[a.signal.synthesis.signal] ?? 4;
    },
    format: () => "—",
    better: "higher",
  },
  {
    label: "Confluence Score", category: "Synthesis",
    getValue: a => a.signal.tech.confluenceScore,
    format: n => n !== null ? `${fmt(n, 0)} / 100` : "—",
    better: "higher",
    tooltip: "Multi-indicator technical alignment score"
  },
  {
    label: "Predictability (Hurst)", category: "Synthesis",
    getValue: a => a.signal.predictability,
    format: n => n !== null ? fmt(n, 3) : "—",
    better: "higher",
    tooltip: "Hurst exponent: >0.5 = trending, <0.5 = mean reverting"
  },
  {
    label: "Signal to Noise", category: "Synthesis",
    getValue: a => a.signal.snr,
    format: n => n !== null ? `${fmt(n, 1)} dB` : "—",
    better: "higher",
    tooltip: "Kalman filter SNR: higher = cleaner price signal"
  },

  // ── Technical
  {
    label: "RSI (14)", category: "Technical",
    getValue: a => a.signal.tech.rsi14,
    format: n => n !== null ? fmt(n, 1) : "—",
    better: "neutral",
    tooltip: "Relative Strength Index: 30=oversold, 70=overbought"
  },
  {
    label: "MACD Histogram", category: "Technical",
    getValue: a => a.signal.tech.macd.histogram,
    format: n => n !== null ? `${n >= 0 ? "+" : ""}${fmt(n, 3)}` : "—",
    better: "higher", colorize: true,
    tooltip: "MACD histogram: positive = bullish momentum"
  },
  {
    label: "BB %B Position", category: "Technical",
    getValue: a => a.signal.tech.bollingerBands.percentB,
    format: n => n !== null ? `${fmt(n * 100, 1)}%` : "—",
    better: "neutral",
    tooltip: "Position within Bollinger Bands: >100% overbought, <0% oversold"
  },
  {
    label: "50D / 200D MA Spread", category: "Technical",
    getValue: a => {
      const p50 = a.details.price.fiftyDayAverage;
      const p200 = a.details.price.twoHundredDayAverage;
      if (!p50 || !p200 || p200 === 0) return null;
      return ((p50 - p200) / p200) * 100;
    },
    format: n => n !== null ? `${n >= 0 ? "+" : ""}${fmt(n, 2)}%` : "—",
    better: "higher", colorize: true,
    tooltip: "50D above 200D MA = bullish (golden cross region)"
  },

  // ── Sentiment
  {
    label: "Narrative Sentiment", category: "Sentiment",
    getValue: a => a.signal.sentiment.score,
    format: n => {
      if (n === null) return "—";
      if (n > 0.3) return `${fmt(n, 3)} [BULL]`;
      if (n < -0.3) return `${fmt(n, 3)} [BEAR]`;
      return `${fmt(n, 3)} [NEUT]`;
    },
    better: "higher", colorize: true,
    tooltip: "Narrative Momentum score (-1 to +1)"
  },

  // ── Valuation
  {
    label: "P/E (Forward)", category: "Valuation",
    getValue: a => a.details.valuation.forwardPE,
    format: n => n !== null ? `${fmt(n, 1)}x` : "—",
    better: "lower",
    tooltip: "Forward Price/Earnings — lower is cheaper"
  },
  {
    label: "P/E (Trailing)", category: "Valuation",
    getValue: a => a.details.valuation.trailingPE,
    format: n => n !== null ? `${fmt(n, 1)}x` : "—",
    better: "lower",
    tooltip: "Trailing 12-month P/E ratio"
  },
  {
    label: "PEG Ratio", category: "Valuation",
    getValue: a => a.details.valuation.pegRatio,
    format: n => n !== null ? fmt(n, 2) : "—",
    better: "lower",
    tooltip: "P/E relative to growth: <1 = potentially undervalued"
  },
  {
    label: "Price / Book", category: "Valuation",
    getValue: a => a.details.valuation.priceToBook,
    format: n => n !== null ? `${fmt(n, 2)}x` : "—",
    better: "lower",
    tooltip: "Price relative to book value"
  },
  {
    label: "Price / Sales", category: "Valuation",
    getValue: a => a.details.valuation.priceToSales,
    format: n => n !== null ? `${fmt(n, 2)}x` : "—",
    better: "lower",
    tooltip: "Price relative to revenue"
  },
  {
    label: "EV / EBITDA", category: "Valuation",
    getValue: a => a.details.valuation.enterpriseToEbitda,
    format: n => n !== null ? `${fmt(n, 1)}x` : "—",
    better: "lower",
    tooltip: "Enterprise Value / EBITDA: preferred for comparing capital structures"
  },

  // ── Profitability
  {
    label: "Revenue Growth (YoY)", category: "Profitability",
    getValue: a => a.details.profitability.revenueGrowth,
    format: fmtPct, better: "higher", colorize: true,
    tooltip: "Year-over-year revenue growth (from Yahoo financial data)"
  },
  {
    label: "Profit Margin", category: "Profitability",
    getValue: a => a.details.profitability.profitMargins,
    format: fmtPct, better: "higher", colorize: true,
    tooltip: "Net profit as a % of revenue"
  },
  {
    label: "Return on Equity", category: "Profitability",
    getValue: a => a.details.profitability.returnOnEquity,
    format: fmtPct, better: "higher", colorize: true,
    tooltip: "Net income as a % of shareholders' equity (ROE)"
  },
  {
    label: "Gross Margin", category: "Profitability",
    getValue: a => a.details.profitability.grossMargins,
    format: fmtPct, better: "higher", colorize: true,
    tooltip: "Gross profit as a % of revenue"
  },
  {
    label: "Operating Margin", category: "Profitability",
    getValue: a => a.details.profitability.operatingMargins,
    format: fmtPct, better: "higher", colorize: true,
    tooltip: "Operating income as a % of revenue"
  },

  // ── Risk
  {
    label: "Ex-Ante Beta", category: "Risk",
    getValue: a => a.details.keyStats.beta,
    format: n => n !== null ? fmt(n, 2) : "—",
    better: "lower",
    tooltip: "Systematic sensitivity to market moves (SPY): >1 = more volatile than market"
  },
  {
    label: "Catalyst Move (Est)", category: "Risk",
    getValue: a => calculateCatalystRisk(a.details).expectedMovePct,
    format: n => n !== null ? `±${fmt(n, 1)}%` : "—",
    better: "lower",
    tooltip: "Projected price swing on next earnings event based on IV/History"
  },
  {
    label: "Surprise Momentum", category: "Risk",
    getValue: a => {
      const { momentum } = calculateCatalystRisk(a.details);
      return momentum === 'BULLISH' ? 100 : momentum === 'BEARISH' ? 0 : 50;
    },
    format: n => {
      if (n === 100) return "BULLISH (BEATS)";
      if (n === 0) return "BEARISH (MISSES)";
      return "NEUTRAL";
    },
    better: "higher", colorize: true,
    tooltip: "Trend of earnings surprise history (Last 4 quarters)"
  },
  {
    label: "Max Drawdown (1Y)", category: "Risk",
    getValue: a => a.details.riskMetrics?.maxDrawdown1Y ?? null,
    format: n => n !== null ? `${fmt(n * 100, 1)}%` : "—",
    better: "higher",
    tooltip: "Largest peak-to-trough decline in past year (less negative = better)"
  },
  {
    label: "Sharpe Ratio (1Y)", category: "Risk",
    getValue: a => a.details.riskMetrics?.sharpeRatio ?? null,
    format: n => n !== null ? fmt(n, 2) : "—",
    better: "higher", colorize: true,
    tooltip: "Risk-adjusted return: higher = better return per unit of risk"
  },
  {
    label: "Realized Vol (1Y)", category: "Risk",
    getValue: a => a.details.riskMetrics?.realizedVolatility1Y ?? null,
    format: fmtPct, better: "lower",
    tooltip: "Annualized historical price volatility"
  },
  {
    label: "Short Interest", category: "Risk",
    getValue: a => a.details.keyStats.shortPercentOfFloat,
    format: fmtPct, better: "lower",
    tooltip: "Shares sold short as % of float: high = bearish sentiment from shorts"
  },

  // ── Analyst
  {
    label: "Upside to Target", category: "Analyst",
    getValue: a => {
      const t = a.details.analyst.targetMean;
      const c = a.details.price.current;
      if (!t || !c) return null;
      return ((t - c) / c) * 100;
    },
    format: n => n !== null ? `${n >= 0 ? "+" : ""}${fmt(n, 1)}%` : "—",
    better: "higher", colorize: true,
    tooltip: "Current price vs analyst consensus target"
  },
  {
    label: "Analyst Target (Mean)", category: "Analyst",
    getValue: a => a.details.analyst.targetMean,
    format: n => n !== null ? `$${fmt(n, 2)}` : "—",
    better: "neutral",
    tooltip: "Mean analyst 12-month price target"
  },
  {
    label: "# Analysts", category: "Analyst",
    getValue: a => a.details.analyst.numberOfAnalysts,
    format: n => n !== null ? String(Math.round(n)) : "—",
    better: "neutral",
    tooltip: "Number of sell-side analysts covering the stock"
  },

  // ── Dividends
  {
    label: "Dividend Yield", category: "Dividends",
    getValue: a => a.details.dividends.dividendYield,
    format: fmtPct, better: "higher",
    tooltip: "Annual dividend as % of price"
  },
  {
    label: "Payout Ratio", category: "Dividends",
    getValue: a => a.details.dividends.payoutRatio,
    format: fmtPct, better: "lower",
    tooltip: "Dividends paid as % of earnings — lower = more sustainable"
  },
];

// ── Determine winners per row ─────────────────────────────────────────────
function getWinner(values: (number | null)[], better: Direction): number | null {
  if (better === "neutral") return null;
  const valid = values.map((v, i) => ({ v, i })).filter(x => x.v !== null) as { v: number; i: number }[];
  if (valid.length < 2) return null;
  const sorted = [...valid].sort((a, b) => better === "higher" ? b.v - a.v : a.v - b.v);
  const best = sorted[0];
  const second = sorted[1];
  const range = Math.abs(best.v - second.v);
  const avg = (Math.abs(best.v) + Math.abs(second.v)) / 2;
  if (avg > 0 && range / avg < 0.005) return null;
  return better === "higher"
    ? valid.reduce((b, c) => c.v > b.v ? c : b).i
    : valid.reduce((b, c) => c.v < b.v ? c : b).i;
}

// ── Score Assets ─────────────────────────────────────────────────────────
function scoreAssets(assets: ComparisonAsset[]) {
  const wins = new Array(assets.length).fill(0);
  for (const row of ROWS) {
    if (row.better === "neutral") continue;
    const values = assets.map(a => row.getValue(a));
    const w = getWinner(values, row.better);
    if (w !== null) wins[w]++;
  }
  return wins;
}

// ── Signal Badge ───────────────────────────────────────────────────────────
function SignalBadge({ signal }: { signal: string }) {
  const isBull = signal.includes("BUY") || signal === "ACCUMULATE";
  const isBear = signal.includes("SELL") || signal === "REDUCE";
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-md ${
      isBull ? "border-bull/30 bg-bull/10 text-bull"
      : isBear ? "border-bear/30 bg-bear/10 text-bear"
      : "border-white/5 bg-white/5 text-zinc-400"
    }`}>
      {signal}
    </span>
  );
}

// ── Collapsible Category Header Row ─────────────────────────────────────────
function CategoryRow({ label, colCount, isCollapsed, onToggle }: { label: string; colCount: number; isCollapsed: boolean; onToggle: () => void }) {
  return (
    <tr 
      onClick={onToggle}
      className="border-t border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent cursor-pointer hover:bg-white/[0.04] transition-colors select-none"
    >
      <td className="px-6 py-3.5 sticky left-0 z-10 bg-[#070709] border-r border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.3)]">
        <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-zinc-400 drop-shadow-md flex items-center gap-2">
          <span className="text-[8px] text-zinc-500 font-mono transition-transform duration-200">
            {isCollapsed ? "▶" : "▼"}
          </span>
          {label}
        </span>
      </td>
      <td colSpan={colCount} className="py-3.5"></td>
    </tr>
  );
}

const METRIC_EDUCATION_MAP: Record<string, { key: string; cat: "QUANT" | "FUNDAMENTAL" }> = {
  "Current Price": { key: "VALUATION", cat: "FUNDAMENTAL" },
  "Market Cap": { key: "MARKET_CAP", cat: "FUNDAMENTAL" },
  "Day Change": { key: "VALUATION", cat: "FUNDAMENTAL" },
  "52W Return": { key: "VALUATION", cat: "FUNDAMENTAL" },
  "Distance 52W High": { key: "VALUATION", cat: "FUNDAMENTAL" },
  "Synthesis Score": { key: "CONFLUENCE_SCORE", cat: "QUANT" },
  "Alpha Score": { key: "JENSENS_ALPHA", cat: "QUANT" },
  "Confluence Score": { key: "CONFLUENCE_SCORE", cat: "QUANT" },
  "Predictability (Hurst)": { key: "HURST_EXPONENT", cat: "QUANT" },
  "Signal to Noise": { key: "KALMAN_EQUILIBRIUM", cat: "QUANT" },
  "RSI (14)": { key: "CONFLUENCE_SCORE", cat: "QUANT" },
  "MACD Histogram": { key: "CONFLUENCE_SCORE", cat: "QUANT" },
  "BB %B Position": { key: "CONFLUENCE_SCORE", cat: "QUANT" },
  "50D / 200D MA Spread": { key: "CONFLUENCE_SCORE", cat: "QUANT" },
  "P/E (Forward)": { key: "PE_RATIO", cat: "FUNDAMENTAL" },
  "P/E (Trailing)": { key: "PE_RATIO", cat: "FUNDAMENTAL" },
  "PEG Ratio": { key: "PE_RATIO", cat: "FUNDAMENTAL" },
  "Price / Book": { key: "PE_RATIO", cat: "FUNDAMENTAL" },
  "Price / Sales": { key: "PE_RATIO", cat: "FUNDAMENTAL" },
  "EV / EBITDA": { key: "PE_RATIO", cat: "FUNDAMENTAL" },
  "Revenue Growth (YoY)": { key: "PROFITABILITY", cat: "FUNDAMENTAL" },
  "Profit Margin": { key: "PROFITABILITY", cat: "FUNDAMENTAL" },
  "Return on Equity": { key: "PROFITABILITY", cat: "FUNDAMENTAL" },
  "Gross Margin": { key: "PROFITABILITY", cat: "FUNDAMENTAL" },
  "Operating Margin": { key: "PROFITABILITY", cat: "FUNDAMENTAL" },
  "Ex-Ante Beta": { key: "REGIME_BETA", cat: "QUANT" },
  "Catalyst Move (Est)": { key: "VALUE_AT_RISK", cat: "QUANT" },
  "Surprise Momentum": { key: "VALUE_AT_RISK", cat: "QUANT" },
  "Max Drawdown (1Y)": { key: "MAX_DRAWDOWN", cat: "QUANT" },
  "Sharpe Ratio (1Y)": { key: "SHARPE_RATIO", cat: "QUANT" },
  "Realized Vol (1Y)": { key: "ANNUALIZED_VOLATILITY", cat: "QUANT" },
  "Short Interest": { key: "VALUE_AT_RISK", cat: "QUANT" },
  "Dividend Yield": { key: "DIVIDEND_YIELD", cat: "FUNDAMENTAL" },
  "Payout Ratio": { key: "DIVIDEND_YIELD", cat: "FUNDAMENTAL" },
};

interface ComparisonTableProps {
  assets: ComparisonAsset[];
}

export function ComparisonTable({ assets }: ComparisonTableProps) {
  const { openEducation } = useEducation();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  if (assets.length === 0) return null;

  const wins = scoreAssets(assets);
  const maxWins = Math.max(...wins);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Group rows by category (preserves insertion order)
  const categories = useMemo(() => {
    const map = new Map<string, RowDef[]>();
    for (const row of ROWS) {
      if (row.label === "Signal") continue;
      if (!map.has(row.category)) map.set(row.category, []);
      map.get(row.category)!.push(row);
    }
    return map;
  }, []);

  const exportToCSV = () => {
    const headers = ["Metric", ...assets.map(a => a.ticker)];
    const csvRows = [];
    
    // Add signal row
    csvRows.push([
      "Signal",
      ...assets.map(a => a.signal.synthesis.signal)
    ]);
    
    // Add category rows
    for (const [cat, rows] of categories.entries()) {
      for (const row of rows) {
        csvRows.push([
          `"${cat} - ${row.label}"`,
          ...assets.map(a => {
            const rawVal = row.getValue(a);
            return rawVal !== null ? `"${row.format(rawVal).replace(/"/g, '""')}"` : "—";
          })
        ]);
      }
    }
    
    const csvContent = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `comparison_matrix_${assets.map(a => a.ticker).join("_")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const signalRow = ROWS.find(r => r.label === "Signal")!;
  const signalValues = assets.map(a => signalRow.getValue(a));
  const signalWinnerIdx = getWinner(signalValues, "higher");

  return (
    <div className="glass-card border border-white/5 bg-black/40 backdrop-blur-md overflow-hidden rounded-xl">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <table className="w-full border-collapse">
          {/* ── Sticky Header ─────────────────────────────────────────────── */}
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-white/5 bg-[#0a0a0c] backdrop-blur-md">
              <th className="text-left px-6 py-5 w-[220px] shrink-0 sticky left-0 z-30 bg-[#0a0a0c] border-r border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Metric</span>
                  <button
                    onClick={exportToCSV}
                    className="p-1.5 border border-white/10 hover:bg-white/5 text-zinc-500 hover:text-white transition-all rounded cursor-pointer"
                    title="Export Comparison to CSV"
                    aria-label="Export comparison data to CSV"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
              </th>
              {assets.map((a, ai) => {
                return (
                  <th key={a.ticker} className="px-6 py-5 text-left min-w-[200px] transition-colors relative group">
                    <div className="flex flex-col gap-2.5 relative z-10">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/asset/${a.ticker}`}
                          className="text-[16px] font-bold font-mono text-white uppercase tracking-tight hover:text-matrix transition-colors"
                        >
                          {a.ticker}
                        </Link>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-medium truncate max-w-[180px] group-hover:text-zinc-300 transition-colors">
                        {a.details.profile.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <SignalBadge signal={a.signal.synthesis.signal} />
                        {signalWinnerIdx === ai && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" title="Best signal" />
                        )}
                      </div>
                      <p className="text-[11px] font-mono font-bold text-zinc-500 mt-1">
                        ${fmt(a.details.price.current)} <span className="text-zinc-600 mx-1">/</span>{" "}
                        <span className={a.details.price.dayChangePercent >= 0 ? "text-bull drop-shadow-sm" : "text-bear"}>
                          {a.details.price.dayChangePercent >= 0 ? "+" : ""}{fmt(a.details.price.dayChangePercent, 2)}%
                        </span>
                      </p>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
 
          <tbody>
            {/* ── Collapsible Metric Rows by Category ────────────────────────── */}
            {Array.from(categories.entries()).map(([cat, rows]) => {
              const isCollapsed = collapsedCategories.has(cat);
              return (
                <React.Fragment key={cat}>
                  <CategoryRow 
                    label={cat} 
                    colCount={assets.length} 
                    isCollapsed={isCollapsed} 
                    onToggle={() => toggleCategory(cat)} 
                  />
                  {!isCollapsed && rows.map((row, ri) => {
                    const values = assets.map(a => row.getValue(a));
                    const winnerIdx = getWinner(values, row.better);

                    return (
                      <tr
                        key={row.label}
                        className={`border-b border-white/[0.04] transition-colors relative group/row ${
                          ri % 2 === 1 ? "bg-white/[0.005]" : ""
                        }`}
                        title={row.tooltip}
                      >
                        <td className={`px-6 py-3 text-[11px] font-medium whitespace-nowrap sticky left-0 z-10 border-r border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.25)] transition-colors group-hover/row:text-white ${ri % 2 === 1 ? 'bg-[#0b0c10]/95' : 'bg-[#08090d]/95'} text-zinc-400`}>
                          <div className="flex items-center">
                             {row.label}
                             {METRIC_EDUCATION_MAP[row.label] ? (
                               <InfoTooltip 
                                 insightKey={METRIC_EDUCATION_MAP[row.label].key} 
                                 category={METRIC_EDUCATION_MAP[row.label].cat} 
                               />
                             ) : row.tooltip ? (
                               <InfoTooltip fallbackText={row.tooltip} />
                             ) : null}
                          </div>
                        </td>
                        {assets.map((a, ai) => {
                          const raw = row.getValue(a);
                          const formatted = row.format(raw);
                          const isWinner = winnerIdx === ai;
                          const isNull = raw === null || formatted === "—";

                          // Color logic — winner gets clean background tint
                          let valueColor = "text-zinc-300";
                          let cellBg = isWinner ? "bg-green-500/[0.03]" : "";

                          if (isNull) {
                            valueColor = "text-zinc-700";
                          } else if (isWinner) {
                            valueColor = "text-white font-extrabold";
                          } else if (row.colorize && raw !== null) {
                            valueColor = raw > 0 ? "text-bull/80" : raw < 0 ? "text-bear/80" : "text-zinc-400";
                          }

                          return (
                            <td
                              key={a.ticker}
                              className={`px-5 py-3 text-[12px] font-mono font-bold tabular-nums transition-colors ${valueColor} ${cellBg}`}
                            >
                              <div className="flex items-center gap-1.5">
                                {isWinner && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-green-500/80 shrink-0"
                                    title="Best in class"
                                  />
                                )}
                                {formatted}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
