import { Metadata } from "next";
import Link from "next/link";
import { fetchComparisonData } from "@/app/actions/compare";
import { ComparisonTable } from "@/components/organisms/ComparisonTable";
import { CompareTickerManager } from "@/components/organisms/CompareTickerManager";
import { AlertBell } from "@/components/AlertBell";
import { getAlerts, checkAndTriggerAlerts } from "@/app/actions/alerts";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Compare | Asset Vector",
  description: "Side-by-side institutional comparison of up to 4 assets across 30+ metrics.",
};

export const dynamic = "force-dynamic";

interface ComparePageProps {
  searchParams: Promise<{ t?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const rawTickers = params.t ?? "";
  const tickers = rawTickers
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0 && t.length <= 10)
    .slice(0, 4);
  const [assets, initialAlerts] = await Promise.all([
    tickers.length > 0 ? fetchComparisonData(tickers) : Promise.resolve([]),
    getAlerts(),
  ]);

  // Audit these specific tickers for insights
  const priceMap: Record<string, number> = {};
  assets.forEach(a => { priceMap[a.ticker] = a.details.price.current; });
  const { insights } = await checkAndTriggerAlerts(priceMap);
  const alerts = await getAlerts();

  return (
    <>
      {/* Header */}
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
            <div className="border-l border-white/10 pl-6 flex items-center gap-6">
              <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Compare</span>
              <Link href="/discovery" className="text-[11px] font-bold text-zinc-500 hover:text-matrix uppercase tracking-[0.2em] transition-colors border-l border-white/10 pl-6">
                Discovery
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AlertBell alerts={alerts} insights={insights} />
            <Link href="/" className="text-[11px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-10 flex items-end justify-between border-b border-white/5 pb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[2px] w-8 bg-white" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white">Comparison Engine</span>
              </div>
              <h1 className="text-5xl font-bold tracking-tightest leading-[1]">
                {tickers.length > 0 ? tickers.join(" vs ") : "Asset Compare"}
              </h1>
              {tickers.length > 0 && (
                <p className="text-[11px] text-zinc-500 mt-3 font-bold uppercase tracking-widest">
                  31 Metrics · 8 Categories · Best-in-class highlighted
                </p>
              )}
            </div>
            {tickers.length > 0 && (
              <div className="flex items-center gap-2">
                {assets.map(a => (
                  <Link
                    key={a.ticker}
                    href={`/asset/${a.ticker}`}
                    className="px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-widest border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                  >
                    {a.ticker} ↗
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Ticker Manager — always visible */}
          <div className="mb-8">
            <CompareTickerManager currentTickers={tickers} />
          </div>

          {/* Loading / Empty States */}
          {tickers.length === 0 && (
            <div className="border border-white/10 bg-[#0a0a0a] p-16 text-center">
              <div className="w-12 h-12 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
              </div>
              <h2 className="text-[13px] font-bold text-white uppercase tracking-widest mb-2">No Assets Selected</h2>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                Add 2–4 tickers using the field above to begin your institutional comparison.
              </p>
            </div>
          )}

          {tickers.length === 1 && (
            <div className="border border-white/10 bg-[#0a0a0a] p-12 text-center">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                Add at least one more ticker to compare.
              </p>
            </div>
          )}

          {/* Comparison Table */}
          {assets.length >= 2 && (
            <ComparisonTable assets={assets} />
          )}

          {/* Partial load warning */}
          {tickers.length >= 2 && assets.length < tickers.length && (
            <div className="mt-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                {tickers.length - assets.length} ticker(s) could not be loaded — they may be invalid or unavailable.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
