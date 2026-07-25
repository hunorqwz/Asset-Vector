import { Metadata } from "next";
import Link from "next/link";
import { fetchComparisonData } from "@/app/actions/compare";
import { ComparisonTable } from "@/components/organisms/ComparisonTable";
import { CompareTickerManager } from "@/components/organisms/CompareTickerManager";
import { CompareChartOverlay } from "@/components/organisms/CompareChartOverlay";
import { checkAndTriggerAlerts } from "@/app/actions/alerts";
import { PageHeader } from "@/components/organisms/PageHeader";

export const metadata: Metadata = {
  title: "Compare Engine | Asset Vector",
  description: "Side-by-side institutional comparison of up to 4 assets across 30+ quantitative metrics.",
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

  const priceMap: Record<string, number> = {};
  assets.forEach(a => { priceMap[a.ticker] = a.details.price.current; });
  await checkAndTriggerAlerts(priceMap);

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-8 bg-[#f8fafc]">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* TOP PAGE HEADER CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Compare Engine</span>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                  Matrix Active
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
                {tickers.length > 0 ? tickers.join(" vs ") : "Multi-Asset Matrix Compare"}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Side-by-side quantitative benchmarking across valuation, quality, and risk factors.
              </p>
            </div>

            {tickers.length > 0 && (
              <div className="flex items-center gap-2">
                {assets.map(a => (
                  <Link
                    key={a.ticker}
                    href={`/asset/${a.ticker}`}
                    className="px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-widest border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all rounded-lg bg-slate-50 hover:bg-blue-50"
                  >
                    {a.ticker} ↗
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Ticker Manager */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <CompareTickerManager currentTickers={tickers} />
          </div>

          {/* Empty States */}
          {tickers.length === 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <h2 className="text-sm font-bold text-slate-800 tracking-wide mb-2">No Assets Selected for Comparison</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                Add 2–4 tickers using the field above to initialize the quantitative comparison matrix.
              </p>
            </div>
          )}

          {/* Comparison Overlay & Table */}
          {assets.length >= 2 && (
            <div className="space-y-8">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <CompareChartOverlay assets={assets} />
              </div>
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <ComparisonTable assets={assets} />
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
