import { Metadata } from "next";
import { getPositions } from "@/app/actions/portfolio";
import { getPortfolioPrices } from "@/app/actions";
import { AddPositionForm } from "@/components/organisms/AddPositionForm";
import { PositionRow } from "@/components/organisms/PositionRow";
import Link from "next/link";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Portfolio | Asset Vector",
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
  const positions = await getPositions();

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

  return (
    <>
      <header className="glass-panel z-[100] flex items-center px-8 sticky top-0 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="w-full flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3.5 group">
              <div className="w-9 h-9 glass-card rounded-xl flex items-center justify-center glow-matrix bg-matrix/5 border-matrix/20">
                <div className="w-2.5 h-2.5 bg-matrix rounded-sm rotate-45 shadow-[0_0_12px_hsla(var(--matrix)/0.6)]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tightest text-[16px] text-white uppercase leading-none mb-1">Vector</span>
                <span className="text-[12px] font-bold text-zinc-500 tracking-[0.2em] uppercase leading-none">Intelligence</span>
              </div>
            </Link>
            <div className="border-l border-white/10 pl-6 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Portfolio</span>
            </div>
          </div>
          <Link href="/" className="text-[11px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[2px] w-8 bg-matrix" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-matrix">Portfolio</span>
              </div>
              <h1 className="text-5xl font-bold tracking-tightest leading-[1]">My Holdings</h1>
            </div>
            <p className="text-[12px] font-bold text-zinc-500 text-right tracking-[0.15em] uppercase leading-relaxed">
              <span className="text-zinc-300">{positions.length} POSITIONS</span> TRACKED
            </p>
          </div>

          {/* Summary Stats */}
          {positions.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {[
                { label: "Total Invested", value: fmtCurrency(totalInvested), color: "text-white" },
                { label: "Current Value", value: fmtCurrency(totalValue), color: "text-white" },
                {
                  label: "Total P&L",
                  value: `${totalPnl >= 0 ? "+" : ""}${fmtCurrency(totalPnl)}`,
                  color: totalPnl >= 0 ? "text-bull" : "text-bear",
                },
                {
                  label: "Return",
                  value: `${totalPnlPct >= 0 ? "+" : ""}${fmt(totalPnlPct)}%`,
                  color: totalPnlPct >= 0 ? "text-bull" : "text-bear",
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

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Positions Table */}
            <div className="xl:col-span-8">
              <div className="glass-card border border-white/10 overflow-hidden">
                <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
                    Positions
                  </h2>
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
                    Add Position
                  </h2>
                </div>
                <div className="p-6">
                  <AddPositionForm />
                </div>
                <div className="px-6 pb-6">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">
                    Live prices are fetched directly from Yahoo Finance when you load this page.
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
