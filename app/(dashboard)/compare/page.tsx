import { Metadata } from "next";
import Link from "next/link";
import { fetchComparisonData } from "@/app/actions/compare";
import { ComparisonTable } from "@/components/organisms/ComparisonTable";
import { CompareTickerManager } from "@/components/organisms/CompareTickerManager";
import { CompareChartOverlay } from "@/components/organisms/CompareChartOverlay";
import { checkAndTriggerAlerts } from "@/app/actions/alerts";
import { PageHeader } from "@/components/organisms/PageHeader";

export const metadata: Metadata = {
  title: "Compare | Asset Vector",
  description: "Side-by-side institutional comparison of up to 4 assets across 30+ metrics.",
};

export const dynamic = "force-dynamic";

interface ComparePageProps {
  searchParams: Promise<{ t?: string; tickers?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const rawTickers = params.t ?? params.tickers ?? "";
  const tickers = rawTickers
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0 && t.length <= 10)
    .slice(0, 4);

  const assets = tickers.length > 0 ? await fetchComparisonData(tickers) : [];

  // Audit these specific tickers for insights
  const priceMap: Record<string, number> = {};
  assets.forEach(a => { priceMap[a.ticker] = a.details.price.current; });
  await checkAndTriggerAlerts(priceMap);

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-10 flex items-end justify-between border-b border-white/5 pb-8">
            <div>
              <h1 className="text-5xl font-bold tracking-tightest leading-[1]">
                {tickers.length > 0 ? tickers.join(" vs ") : "Compare"}
              </h1>
            </div>
            {tickers.length > 0 && (
              <div className="flex items-center gap-2">
                {assets.map(a => (
                  <Link
                    key={a.ticker}
                    href={`/asset/${a.ticker}`}
                    className="px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-widest border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-all rounded-lg hover:bg-white/[0.02]"
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
            <div className="bg-white/[0.02] rounded-xl p-16 text-center max-w-2xl mx-auto my-8 border border-white/5">
              <div className="w-14 h-14 rounded-xl border border-white/5 bg-zinc-900/50 flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide mb-3">No Assets Selected</h2>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
                Add 2–4 tickers using the field above to begin comparison.
              </p>
            </div>
          )}

          {tickers.length === 1 && (
            <div className="bg-white/[0.02] rounded-xl p-12 text-center max-w-xl mx-auto my-6 border border-white/5">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Add at least one more ticker to initiate the comparison matrix.
              </p>
            </div>
          )}

          {/* Comparison Chart Overlay */}
          {assets.length >= 2 && (
            <div className="mb-10">
              <CompareChartOverlay assets={assets} />
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
              <p className="text-xs font-medium text-amber-400">
                {tickers.length - assets.length} ticker(s) could not be loaded — they may be invalid or unavailable.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
