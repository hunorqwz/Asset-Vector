"use client";

import React, { useState, useEffect } from "react";
import { PortfolioTabs } from "@/components/organisms/PortfolioTabs";
import { AddPositionForm } from "@/components/organisms/AddPositionForm";
import { PositionRow } from "@/components/organisms/PositionRow";
import { AddAllToWatchlist } from "@/components/organisms/AddAllToWatchlist";
import { PortfolioAnalyticsPanel } from "@/components/organisms/PortfolioAnalyticsPanel";
import { StrategicStressTest } from "@/components/organisms/StrategicStressTest";
import { GlobalCorrelationLab } from "@/components/organisms/GlobalCorrelationLab";
import { RegimeRadar } from "@/components/organisms/RegimeRadar";
import { AlertManager } from "@/components/organisms/AlertManager";
import { getPortfolioRiskInputPayload } from "@/app/actions/portfolio";
import { RiskIntelligence } from "@/lib/portfolio-risk";
import { useEducation } from "@/components/providers/EducationProvider";
import { ContextualCoach } from "@/components/organisms/ContextualCoach";

interface EnrichedPosition {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  invested: number;
  currentValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
}

interface PortfolioClientContainerProps {
  enrichedPositions: EnrichedPosition[];
  watchlist: string[];
  regimeData: any;
  analytics: any;
  alertTickers: string[];
  initialAlerts: any[];
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return "$" + fmt(n);
}

export function PortfolioClientContainer({
  enrichedPositions,
  watchlist,
  regimeData,
  analytics,
  alertTickers,
  initialAlerts,
}: PortfolioClientContainerProps) {
  const [riskData, setRiskData] = useState<RiskIntelligence | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const { openEducation } = useEducation();

  const totalInvested = enrichedPositions.reduce((s, p) => s + p.invested, 0);
  const totalValue = enrichedPositions.reduce((s, p) => s + (p.currentValue ?? p.invested), 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Calculate weights for risk computation
  const positionsForRisk = React.useMemo(() => {
    if (totalValue === 0) return [];
    
    // Group values by ticker
    const tickerValuesMap: Record<string, number> = {};
    enrichedPositions.forEach((p) => {
      const val = p.currentValue ?? p.invested;
      tickerValuesMap[p.ticker] = (tickerValuesMap[p.ticker] || 0) + val;
    });

    return Object.entries(tickerValuesMap).map(([ticker, val]) => ({
      ticker,
      weight: val / totalValue,
      currentPrice: enrichedPositions.find(p => p.ticker === ticker)?.currentPrice ?? undefined
    }));
  }, [enrichedPositions, totalValue]);

  useEffect(() => {
    if (positionsForRisk.length === 0) {
      setRiskData(null);
      setIsLoadingRisk(false);
      return;
    }

    // Initialize Next.js bundled Web Worker
    const worker = new Worker(new URL("./risk.worker.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.success) {
        setRiskData(e.data.result);
      } else {
        console.error("[Risk Worker Error]:", e.data.error);
      }
      setIsLoadingRisk(false);
    };

    setIsLoadingRisk(true);

    // Fetch daily price history & macro elements (fast cached reads)
    getPortfolioRiskInputPayload(positionsForRisk)
      .then((payload) => {
        worker.postMessage({
          positions: positionsForRisk,
          historyData: payload.historyData,
          pulse: payload.pulse,
        });
      })
      .catch((err) => {
        console.error("[Risk Payload Fetch Error]:", err);
        setIsLoadingRisk(false);
      });

    return () => {
      worker.terminate();
    };
  }, [positionsForRisk]);

  return (
    <div>
      {/* Summary Stats Cards */}
      {enrichedPositions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {[
            { label: "Total Invested", value: fmtCurrency(totalInvested), color: "text-white", key: "VALUATION", cat: "FUNDAMENTAL" as const },
            { label: "Current Value", value: fmtCurrency(totalValue), color: "text-white", key: "VALUATION", cat: "FUNDAMENTAL" as const },
            {
              label: "Total P&L",
              value: `${totalPnl >= 0 ? "+" : ""}${fmtCurrency(totalPnl)}`,
              color: totalPnl >= 0 ? "text-bull" : "text-bear",
              key: "PROFITABILITY",
              cat: "FUNDAMENTAL" as const
            },
            {
              label: "Portfolio Return",
              value: `${totalPnlPct >= 0 ? "+" : ""}${fmt(totalPnlPct)}%`,
              color: totalPnlPct >= 0 ? "text-bull" : "text-bear",
              key: "PROFITABILITY",
              cat: "FUNDAMENTAL" as const
            },
            {
              label: "Jensen's Alpha",
              value: isLoadingRisk 
                ? "Calculating..." 
                : riskData 
                  ? `${riskData.jensensAlpha > 0 ? "+" : ""}${riskData.jensensAlpha}%` 
                  : "---",
              color: isLoadingRisk 
                ? "text-matrix animate-pulse" 
                : riskData 
                  ? (riskData.jensensAlpha >= 0 ? "text-matrix" : "text-bear") 
                  : "text-zinc-500",
              key: "JENSENS_ALPHA",
              cat: "QUANT" as const
            },
          ].map((stat) => (
            <div 
              key={stat.label} 
              onClick={() => {
                if (stat.key) {
                  openEducation(stat.key, stat.cat);
                }
              }}
              className="bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all rounded-xl p-6 relative overflow-hidden cursor-help group"
            >
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-zinc-400 font-medium tracking-wide group-hover:text-white transition-colors">{stat.label}</p>
                <span className="text-[9px] text-zinc-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Explain ↗</span>
              </div>
              <p className={`text-2xl font-bold font-mono tabular-nums ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {riskData && <ContextualCoach risk={riskData} />}

      {/* Tabs */}
      <PortfolioTabs
        holdingsContent={
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-400 tracking-wide flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
                    Holdings
                  </h2>
                  {enrichedPositions.length > 0 && <AddAllToWatchlist />}
                </div>

                {enrichedPositions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                    <div className="w-14 h-14 rounded-full border border-matrix/30 bg-matrix/5 flex items-center justify-center mb-6">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-matrix opacity-70">
                        <path d="M12 5v14m-7-7h14" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tightest mb-2">No positions yet</h3>
                    <p className="text-sm text-zinc-400">Add your first holding using the form on the right.</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-white/5 text-xs font-medium text-zinc-400 tracking-wide uppercase">
                      <span className="col-span-3">Asset</span>
                      <span className="col-span-2 text-right">Shares</span>
                      <span className="col-span-2 text-right">Avg Cost</span>
                      <span className="col-span-2 text-right">Current</span>
                      <span className="col-span-2 text-right">P&amp;L</span>
                      <span className="col-span-1"></span>
                    </div>
                    {enrichedPositions.map((pos) => (
                      <PositionRow
                        key={pos.id}
                        id={pos.id}
                        ticker={pos.ticker}
                        name={pos.name}
                        shares={pos.shares}
                        avgCost={pos.avgCost}
                        currentPrice={pos.currentPrice}
                        pnl={pos.pnl}
                        pnlPct={pos.pnlPct}
                        isWatchlisted={watchlist.includes(pos.ticker)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden sticky top-24">
                <div className="border-b border-white/5 px-6 py-4">
                  <h2 className="text-xs font-bold text-zinc-400 tracking-wide flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
                    Add Position
                  </h2>
                </div>
                <div className="p-6">
                  <AddPositionForm />
                </div>
                <div className="px-6 pb-6">
                  <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                    Beta analysis and stress simulations are calculated against SPY (S&P 500) historical variance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
        riskContent={
          <div className="space-y-12 animate-in fade-in duration-500">
            {isLoadingRisk ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-8 h-8 rounded-full border-2 border-matrix/20 border-t-matrix animate-spin" />
                <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Analyzing Systematic Portfolio Risk...</p>
              </div>
            ) : riskData ? (
              <>
                <StrategicStressTest risk={riskData} />
                <GlobalCorrelationLab data={riskData.correlationMatrix} />
              </>
            ) : (
              enrichedPositions.length > 0 && (
                <div className="text-center py-20 border border-white/5 rounded-xl">
                  <p className="text-sm text-zinc-500">Add assets to compute the portfolio risk models.</p>
                </div>
              )
            )}
            {regimeData && <RegimeRadar data={regimeData} />}
            {enrichedPositions.length > 0 && <PortfolioAnalyticsPanel analytics={analytics} />}
          </div>
        }
        alertsContent={
          <div>
            <AlertManager initialAlerts={initialAlerts} watchlistTickers={alertTickers} />
          </div>
        }
      />
    </div>
  );
}
