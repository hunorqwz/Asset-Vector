import { Metadata } from "next";
import { WatchlistGrid, WatchlistItem } from "@/components/BentoGrid";
import { getMarketSignals, removeAsset } from "@/app/actions";
import { AssetCommand } from "@/components/AssetCommand";
import { LiveTime } from "@/components/LiveTime";

export const metadata: Metadata = {
  title: "Surgical Market Intelligence | Dashboard",
  description: "Real-time vector tracking and AI-driven market intelligence dashboard. Monitor high-velocity assets with surgical precision.",
};

export const revalidate = 60;

export default async function Home() {
  const signals = await getMarketSignals();

  return (
    <>
      <header className="glass-panel z-[100] flex items-center px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-matrix/10 overflow-hidden">
          <div className="h-full bg-matrix w-1/3 animate-shimmer" />
        </div>
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center glow-matrix">
                <div className="w-3 h-3 bg-matrix rounded-sm rotate-45" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-sm">Vector</span>
                <span className="text-[10px] text-zinc-500 tracking-wide">Dashboard</span>
              </div>
            </div>
            <div className="hidden xl:flex items-center gap-5 border-l border-white/10 pl-10">
              <IndexItem symb="SPY" val="+0.07%" up />
              <IndexItem symb="QQQ" val="-0.12%" />
              <IndexItem symb="BTC" val="+1.42%" up />
            </div>
          </div>
          <div className="flex-1 max-w-sm px-12">
            <AssetCommand />
          </div>
          <div className="flex items-center gap-6" aria-label="System status">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-bull shadow-bull" aria-hidden="true" />
                <span className="text-[10px] font-medium text-emerald-500">Online</span>
              </div>
              <span className="text-[10px] text-zinc-600 mt-0.5">Latency 0.02ms</span>
            </div>
          </div>
        </div>
      </header>

      <main className="overflow-y-auto scrollbar-hide px-8 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-10 flex items-end justify-between border-b border-white/5 pb-8">
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-[1px] w-6 bg-matrix" />
                <span className="text-[10px] font-medium text-matrix tracking-wide">Market Overview</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
                Watchlist
              </h1>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-[11px] text-zinc-500 text-right leading-relaxed">
                {signals.length} assets tracked<br/>
                Updated <span className="text-zinc-300 font-mono text-[10px]"><LiveTime /></span>
              </p>
            </div>
          </div>

          <WatchlistGrid>
            {signals.map((s, i) => {
              const change = s.history.length >= 2 ? ((s.price - s.history[s.history.length-2].close) / s.history[s.history.length-2].close) * 100 : 0;
              return (
                <WatchlistItem 
                  key={i} ticker={s.ticker} name={s.ticker} price={s.price} change={change} 
                  history={s.history.map(h => h.close)} aiSignal={s.aiPrediction}
                  onRemove={async () => { "use server"; await removeAsset(s.ticker); }}
                />
              );
            })}
          </WatchlistGrid>
        </div>
      </main>

      <footer className="glass-panel z-[100] px-8 flex items-center">
        <div className="w-full flex items-center justify-between">
          <div className="flex gap-8">
            <Stat label="Version" value="1.0" color="text-zinc-500" />
            <Stat label="Auth" value="Verified" color="text-emerald-500" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-8 bg-white/5" />
            <div className="flex items-center gap-2.5 px-3.5 py-1 border border-white/5 bg-white/[0.01] rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse glow-matrix" />
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Connected</span>
            </div>
            <div className="h-[1px] w-8 bg-white/5" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Integrity</span>
              <div className="flex gap-0.5" aria-label="Integrity bars: 4 of 4">
                {[...Array(4)].map((_, i) => <div key={i} className="w-1 h-3 bg-bull rounded-full" />)}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function IndexItem({ symb, val, up }: { symb: string, val: string, up?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-zinc-500">{symb}</span>
      <span className={`text-[11px] font-mono font-semibold tabular-nums ${up ? 'text-bull' : 'text-bear'}`}>{val}</span>
    </div>
  );
}

function Stat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-zinc-600">{label}</span>
      <span className={`${color} font-mono text-[10px]`}>{value}</span>
    </div>
  );
}
