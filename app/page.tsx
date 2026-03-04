import { Metadata } from "next";
import { WatchlistGrid, WatchlistItem } from "@/components/BentoGrid";
import { getMarketSignals, removeAsset } from "@/app/actions";
import { EmptyWatchlist } from "@/components/EmptyWatchlist";
import { LiveTime } from "@/components/LiveTime";
import { IntegrityBars, StealthTooltip } from "@/components/LiveTelemetry";
import { auth } from "@/auth";
import { AlertBell } from "@/components/AlertBell";
import { getAlerts, checkAndTriggerAlerts } from "@/app/actions/alerts";
import { AccuracyScorecard } from "@/components/organisms/AccuracyScorecard";
import { getAccuracyScorecard } from "@/app/actions/signals";
import { getMarketPulse } from "@/app/actions";
import { MarketPulse } from "@/components/molecules/MarketPulse";
import { detectSectorAlpha } from "@/lib/market-pulse";
import { GlobalHeader } from "@/components/organisms/GlobalHeader";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Real-time asset tracking and AI-driven market intelligence. Monitor your personal watchlist with precision.",
};

export const revalidate = 60;

export default async function Home() {
  const session = await auth();
  
  // Use a single parallel fetch for all initial page data
  const [signals, pulseData, alerts, accuracyData] = await Promise.all([
    getMarketSignals(),
    getMarketPulse(),
    getAlerts(),
    getAccuracyScorecard(),
  ]);

  // Build price map efficiently
  const priceMap: Record<string, number> = {};
  signals.forEach(s => { if (s.price) priceMap[s.ticker] = s.price; });
  
  // Run alerts/insights check. 
  // NOTE: getInstitutionalInsights (called inside) is the main performance bottleneck.
  // It has been optimized with internal caching.
  const { insights } = await checkAndTriggerAlerts(priceMap);

  return (
    <>
      <GlobalHeader alerts={alerts} insights={insights} />

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div className="relative">
              <div className="flex items-center gap-3 mb-4 group cursor-crosshair">
                <div className="h-[2px] w-8 bg-matrix" />
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">
                  <span className="text-matrix">Command Center</span>
                  <span>/</span>
                  <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">Overview</span>
                </div>
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tightest leading-[1]">
                System Overview
              </h1>
            </div>
            <div className="flex flex-col items-end gap-3">
              <p className="text-[12px] font-bold text-zinc-500 text-right tracking-[0.15em] uppercase leading-relaxed">
                <span className="text-zinc-300">{signals.length} ACTIVE ASSETS</span> TRACKED<br/>
                SYNCED <span className="text-matrix font-mono font-bold tracking-normal"><LiveTime /></span>
              </p>
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
                <WatchlistGrid>
                  {signals.map((s, i) => {
                    const isAlpha = detectSectorAlpha(s.ticker, ((s.price - s.history[s.history.length-2].close) / s.history[s.history.length-2].close) * 100, pulseData, s.sector);
                    return (
                      <WatchlistItem 
                        key={i} 
                        signal={s}
                        alpha={isAlpha}
                        onRemove={removeAsset.bind(null, s.ticker)}
                      />
                    );
                  })}
                </WatchlistGrid>
              ) : (
                <EmptyWatchlist />
              )}
            </div>

            {/* RIGHT COLUMN: VELOCITY / NEWS */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <div className="glass-card p-6 border border-white/10 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Latest News
                </h2>
                <div className="flex flex-col gap-5">
                  {signals.flatMap(s => s.news.map(n => ({ ...n, ticker: s.ticker }))).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((news, i) => (
                     <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" className="group block focus:outline-none">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-bold font-mono px-1.5 border border-white/20 text-zinc-400 group-hover:border-matrix group-hover:text-matrix transition-colors uppercase tracking-widest">{news.ticker}</span>
                            <span className="text-[9px] text-zinc-600 font-mono">{new Date(news.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[12px] font-medium text-white/80 leading-tight group-hover:text-white transition-colors">{news.title}</p>
                     </a>
                  ))}
                  {signals.length === 0 && (
                      <p className="text-[11px] text-zinc-500 leading-relaxed">No active signals routing to the narrative engine.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="glass-panel z-[100] px-8 py-4 border-t border-white/5 bg-black/60 backdrop-blur-md">
        <div className="w-full flex items-center justify-between">
          <div className="flex gap-12">
            <StealthTooltip content="Platform version 1.0">
              <div className="flex items-center">
                <Stat label="Version" value="v1.0" color="text-zinc-500" />
              </div>
            </StealthTooltip>
            {session?.user && (
              <StealthTooltip content={`Verified for ${session.user.email}`}>
                <div className="flex items-center">
                  <Stat label="Identity" value={session.user.name || session.user.email || "Verified"} color="text-matrix" />
                </div>
              </StealthTooltip>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-12 bg-white/5" />
            <StealthTooltip content="Exchange WebSockets secure & streaming">
              <div className="flex items-center gap-3 px-5 py-1.5 bg-matrix/5 border border-matrix/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse shadow-[0_0_8px_hsla(var(--matrix)/0.6)]" />
                <span className="text-[11px] text-matrix font-bold tracking-widest uppercase">Connected</span>
              </div>
            </StealthTooltip>
            <div className="h-[1px] w-12 bg-white/5" />
          </div>
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4 border-r border-white/5 pr-10 h-10">
              <StealthTooltip content="AI model connection status">
                <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">System Status</span>
              </StealthTooltip>
              <IntegrityBars />
            </div>
            <LogoutButton />
          </div>
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`${color} font-mono font-bold text-[12px]`}>{value}</span>
    </div>
  );
}

