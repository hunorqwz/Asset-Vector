import { Metadata } from "next";
import { getPositions } from "@/app/actions/portfolio";
import { getPortfolioPrices, getWatchlistTickers } from "@/app/actions";
import { computePortfolioAnalytics } from "@/lib/portfolio-analytics";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { PortfolioClientContainer } from "@/components/organisms/PortfolioClientContainer";
import { PageHeader } from "@/components/organisms/PageHeader";

export const metadata: Metadata = {
  title: "Portfolio Desk | Asset Vector",
  description: "Track positions, equity curves, and performance against AI price targets.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [positions, watchlist, regimeData] = await Promise.all([
    getPositions(),
    getWatchlistTickers(),
    getRegimeBreakout(),
  ]);

  const tickers = [...new Set(positions.map((p) => p.ticker))];
  const priceMap = await getPortfolioPrices(tickers);

  const enriched = positions.map((pos) => {
    const currentPrice = priceMap[pos.ticker] ?? null;
    const invested = pos.shares * pos.avgCost;
    const currentValue = currentPrice !== null ? pos.shares * currentPrice : null;
    const pnl = currentValue !== null ? currentValue - invested : null;
    const pnlPct = pnl !== null ? (pnl / invested) * 100 : null;
    return { ...pos, currentPrice, invested, currentValue, pnl, pnlPct };
  });

  const analytics = computePortfolioAnalytics(enriched);

  await checkAndTriggerAlerts(priceMap);
  const alerts = await getAlerts();
  const alertTickers = [...new Set([...tickers, ...watchlist])];

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-8 bg-[#f8fafc]">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* TOP PAGE HEADER CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Portfolio Desk</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                  Analytics Active
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Portfolio & Equity Analytics</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Real-time position tracking, PnL metrics, and multi-asset exposure analytics.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-right">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Active Positions</span>
                <span className="text-lg font-mono font-bold text-slate-800 tabular-nums">{positions.length} Open</span>
              </div>
            </div>
          </div>

          <PortfolioClientContainer
            enrichedPositions={enriched}
            watchlist={watchlist}
            regimeData={regimeData}
            analytics={analytics}
            alertTickers={alertTickers}
            initialAlerts={alerts}
          />
        </div>
      </main>
    </>
  );
}
