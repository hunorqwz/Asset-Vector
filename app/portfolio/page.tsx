import { Metadata } from "next";
import { getPositions } from "@/app/actions/portfolio";
import { getPortfolioPrices, getWatchlistTickers } from "@/app/actions";
import { computePortfolioAnalytics } from "@/lib/portfolio-analytics";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { GlobalHeader } from "@/components/organisms/GlobalHeader";
import { GlobalFooter } from "@/components/organisms/GlobalFooter";
import { PortfolioClientContainer } from "@/components/organisms/PortfolioClientContainer";

export const metadata: Metadata = {
  title: "Portfolio Analytics Dashboard | Asset Vector",
  description: "Track your holdings and see your performance against AI price targets.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [positions, watchlist, regimeData] = await Promise.all([
    getPositions(),
    getWatchlistTickers(),
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
              <h1 className="text-5xl font-bold tracking-tightest leading-[1]">Portfolio</h1>
            </div>
            <p className="text-sm text-zinc-400 text-right leading-relaxed">
              {positions.length} positions
            </p>
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
      <GlobalFooter />
    </>
  );
}
