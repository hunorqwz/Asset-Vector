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
  title: "Dashboard",
  description: "Real-time asset tracking and AI-driven market intelligence. Monitor your personal watchlist with precision.",
};

export const revalidate = 60;

export default async function Home() {
  // Use a parallel fetch for only the required dashboard data
  const [signals, pulseData, accuracyData] = await Promise.all([
    getMarketSignals(),
    getMarketPulse(),
    getAccuracyScorecard(),
  ]);

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-10 flex items-end justify-between border-b border-white/10 pb-6">
            <div>
              <h1 className="text-4xl font-display font-bold tracking-tight text-white leading-none">
                Overview
              </h1>
              <p className="text-[13px] text-zinc-500 font-medium mt-2">Watchlist & Market Summary</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[13px] font-medium text-zinc-400">
                {signals.length} Assets Tracked
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>Market Data Active</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-2 flex flex-col gap-6">
              <AccuracyScorecard data={accuracyData} />
              <MarketPulse data={pulseData} />
            </div>

            {/* CENTER COLUMN: HIGH DENSITY WATCHLIST */}
            <div className="xl:col-span-8">
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

            {/* RIGHT COLUMN: VELOCITY / NEWS */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <div className="p-6 bg-white/[0.01] rounded-xl border border-white/5 h-full">
                <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-6">
                  Latest News
                </h2>
                <div className="flex flex-col gap-5">
                  {signals.flatMap(s => s.news.map(n => ({ ...n, ticker: s.ticker }))).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((news, i) => (
                     <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" className="group block focus:outline-none">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded-sm bg-white/5 text-zinc-300 group-hover:bg-white/10 transition-colors uppercase">{news.ticker}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{new Date(news.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[13px] font-medium text-zinc-300 leading-snug group-hover:text-white transition-colors">{news.title}</p>
                     </a>
                  ))}
                  {signals.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-[13px] font-medium text-zinc-500 leading-relaxed">
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
