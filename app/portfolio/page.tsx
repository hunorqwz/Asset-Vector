import { Metadata } from "next";
import { getPositions, getPortfolioRiskIntelligence } from "@/app/actions/portfolio";
import { getPortfolioPrices, getWatchlistTickers } from "@/app/actions";
import { AddPositionForm } from "@/components/organisms/AddPositionForm";
import { PositionRow } from "@/components/organisms/PositionRow";
import { AddAllToWatchlist } from "@/components/organisms/AddAllToWatchlist";
import { PortfolioAnalyticsPanel } from "@/components/organisms/PortfolioAnalyticsPanel";
import { computePortfolioAnalytics } from "@/lib/portfolio-analytics";
import { StrategicStressTest } from "@/components/organisms/StrategicStressTest";
import { GlobalCorrelationLab } from "@/components/organisms/GlobalCorrelationLab";
import { RegimeRadar } from "@/components/organisms/RegimeRadar";
import { AlertManager } from "@/components/organisms/AlertManager";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { auth } from "@/auth";
import { GlobalHeader } from "@/components/organisms/GlobalHeader";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track your holdings and see your performance against AI price targets.",
};

export const dynamic = "force-dynamic";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return "$" + fmt(n);
}

export default async function PortfolioPage() {
  const [positions, watchlist, riskData, regimeData] = await Promise.all([
    getPositions(),
    getWatchlistTickers(),
    getPortfolioRiskIntelligence(),
    getRegimeBreakout(),
  ]);

  // Fetch live prices directly for all portfolio tickers — independent of watchlist
  const tickers = [...new Set(positions.map((p) => p.ticker))];
  const priceMap = await getPortfolioPrices(tickers);

  // Compute per-position stats
  const enriched = positions.map((pos) => {
    const currentPrice = priceMap[pos.ticker] ?? null;
    const invested = pos.shares * pos.avgCost;
    const currentValue = currentPrice !== null ? pos.shares * currentPrice : null;
    const pnl = currentValue !== null ? currentValue - invested : null;
    const pnlPct = pnl !== null ? (pnl / invested) * 100 : null;
    return { ...pos, currentPrice, invested, currentValue, pnl, pnlPct };
  });

  const totalInvested = enriched.reduce((s, p) => s + p.invested, 0);
  const totalValue = enriched.reduce((s, p) => s + (p.currentValue ?? p.invested), 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Portfolio analytics computation
  const analytics = computePortfolioAnalytics(enriched);

  // Check and perform institutional audit
  const { insights } = await checkAndTriggerAlerts(priceMap);
  const alerts = await getAlerts();
  // All portfolio tickers + watchlist tickers for the alert quick-select
  const alertTickers = [...new Set([...tickers, ...watchlist])];

  return (
    <>
      <GlobalHeader alerts={alerts} insights={insights} regimeBreakout={regimeData} />

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[2px] w-8 bg-matrix" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-matrix">Intelligence Hub</span>
              </div>
              <h1 className="text-5xl font-bold tracking-tightest leading-[1]">Portfolio Radar</h1>
            </div>
            <p className="text-[12px] font-bold text-zinc-500 text-right tracking-[0.15em] uppercase leading-relaxed">
              <span className="text-zinc-300">{positions.length} POSITIONS</span> ACTIVE
            </p>
          </div>
          {/* Strategic Risk Intelligence Section */}
          {riskData && (
            <div className="mb-12 space-y-12">
               <StrategicStressTest risk={riskData} />
               <GlobalCorrelationLab data={riskData.correlationMatrix} />
            </div>
          )}

          {/* Regime Breakout Radar */}
          {regimeData && (
            <div className="mb-12">
              <RegimeRadar data={regimeData} />
            </div>
          )}

          {/* Summary Stats */}
          {positions.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
              {[
                { label: "Total Invested", value: fmtCurrency(totalInvested), color: "text-white" },
                { label: "Current Value", value: fmtCurrency(totalValue), color: "text-white" },
                {
                  label: "Total P&L",
                  value: `${totalPnl >= 0 ? "+" : ""}${fmtCurrency(totalPnl)}`,
                  color: totalPnl >= 0 ? "text-bull" : "text-bear",
                },
                {
                  label: "Portfolio Return",
                  value: `${totalPnlPct >= 0 ? "+" : ""}${fmt(totalPnlPct)}%`,
                  color: totalPnlPct >= 0 ? "text-bull" : "text-bear",
                },
                {
                  label: "Jensen's Alpha",
                  value: riskData ? `${riskData.jensensAlpha > 0 ? "+" : ""}${riskData.jensensAlpha}%` : "---",
                  color: riskData ? (riskData.jensensAlpha >= 0 ? "text-matrix" : "text-bear") : "text-zinc-500",
                },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-6 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{stat.label}</p>
                  <p className={`text-2xl font-bold font-mono tabular-nums ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Portfolio Analytics */}
          {positions.length > 0 && (
            <div className="mb-12">
              <PortfolioAnalyticsPanel analytics={analytics} />
            </div>
          )}

          {/* Price Alerts */}
          <div className="mb-12">
            <AlertManager initialAlerts={alerts} watchlistTickers={alertTickers} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Positions Table */}
            <div className="xl:col-span-8">
              <div className="glass-card border border-white/10 overflow-hidden">
                <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
                    Holdings
                  </h2>
                  {positions.length > 0 && (
                    <AddAllToWatchlist />
                  )}
                </div>

                {enriched.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                    <div className="w-14 h-14 rounded-full border border-matrix/30 bg-matrix/5 flex items-center justify-center mb-6">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-matrix opacity-70">
                        <path d="M12 5v14m-7-7h14"/>
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white uppercase tracking-tightest mb-2">No positions yet</h3>
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Add your first holding using the form on the right.</p>
                  </div>
                ) : (
                  <div>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-white/5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                      <span className="col-span-3">Asset</span>
                      <span className="col-span-2 text-right">Shares</span>
                      <span className="col-span-2 text-right">Avg Cost</span>
                      <span className="col-span-2 text-right">Current</span>
                      <span className="col-span-2 text-right">P&amp;L</span>
                      <span className="col-span-1"></span>
                    </div>
                    {enriched.map((pos) => (
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

            {/* Add Position Panel */}
            <div className="xl:col-span-4">
              <div className="glass-card border border-white/10 overflow-hidden sticky top-24">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/30 to-transparent" />
                <div className="border-b border-white/10 px-6 py-4">
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
                    New Allocation
                  </h2>
                </div>
                <div className="p-6">
                  <AddPositionForm />
                </div>
                <div className="px-6 pb-6">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">
                    Beta analysis and stress simulations are calculated against SPY (S&P 500) historical variance.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
