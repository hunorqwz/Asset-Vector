import { Metadata } from "next";
import { WatchlistGrid } from "@/components/BentoGrid";
import { getMarketSignals, removeAsset } from "@/app/actions";
import { EmptyWatchlist } from "@/components/EmptyWatchlist";
import { AccuracyScorecard } from "@/components/organisms/AccuracyScorecard";
import { getAccuracyScorecard } from "@/app/actions/signals";
import { getMarketPulse } from "@/app/actions";
import { MarketPulse } from "@/components/molecules/MarketPulse";
import { detectSectorAlpha } from "@/lib/market-pulse";
import { PageHeader } from "@/components/organisms/PageHeader";

export const metadata: Metadata = {
  title: "Dashboard Overview | Asset Vector",
  description: "Real-time institutional asset tracking and AI-driven market intelligence.",
};

export const revalidate = 60;

export default async function Home() {
  const [signals, pulseData, accuracyData] = await Promise.all([
    getMarketSignals(),
    getMarketPulse(),
    getAccuracyScorecard(),
  ]);

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-8 bg-[#f8fafc]">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* TOP PAGE HEADER CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Watchlist</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                  Telemetry Active
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Overview Dashboard</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Real-time quantitative asset intelligence and market pulse metrics.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-right">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Assets Tracked</span>
                <span className="text-lg font-mono font-bold text-slate-800 tabular-nums">{signals.length} Active</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* LEFT COLUMN: SCORECARD & PULSE */}
            <div className="xl:col-span-3 flex flex-col gap-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <AccuracyScorecard data={accuracyData} />
              </div>
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <MarketPulse data={pulseData} />
              </div>
            </div>

            {/* CENTER COLUMN: HIGH DENSITY WATCHLIST */}
            <div className="xl:col-span-6">
              {signals.length > 0 ? (
                <WatchlistGrid 
                   items={signals.map(s => {
                     const change = s.changePercent ?? (s.history.length >= 2 ? ((s.price - s.history[s.history.length-2].close) / s.history[s.history.length-2].close) * 100 : 0);
                     return {
                       signal: s,
                       alpha: detectSectorAlpha(s.ticker, change, pulseData, s.sector)
                     };
                   })}
                   onRemoveAction={removeAsset} 
                />
              ) : (
                <EmptyWatchlist />
              )}
            </div>

            {/* RIGHT COLUMN: LATEST NEWS */}
            <div className="xl:col-span-3 flex flex-col gap-6">
              <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] h-full">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
                  Market Telemetry News Feed
                </h2>
                <div className="flex flex-col gap-5">
                  {signals.flatMap(s => s.news.map(n => ({ ...n, ticker: s.ticker }))).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6).map((news, i) => (
                     <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" className="group block focus:outline-none hover:bg-slate-50 p-2.5 rounded-xl transition-all border border-transparent hover:border-slate-200/60">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">{news.ticker}</span>
                            <span className="text-[10px] text-slate-400 font-mono tabular-nums">{new Date(news.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-snug group-hover:text-blue-600 transition-colors">{news.title}</p>
                     </a>
                  ))}
                  {signals.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-xs font-medium text-slate-400 leading-relaxed">
                          Add assets to your watchlist to generate real-time data feeds.
                        </p>
                      </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
