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
      <header className="glass-panel z-[100] flex items-center px-8 sticky top-0 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="w-full flex items-center justify-between py-4">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3.5" aria-hidden="true">
              <div className="w-9 h-9 glass-card rounded-xl flex items-center justify-center glow-matrix bg-matrix/5 border-matrix/20">
                <div className="w-2.5 h-2.5 bg-matrix rounded-sm rotate-45 shadow-[0_0_12px_hsla(var(--matrix)/0.6)]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tightest text-[16px] text-white uppercase leading-none mb-1">Vector</span>
                <span className="text-[12px] font-bold text-zinc-500 tracking-[0.2em] uppercase leading-none">Intelligence</span>
              </div>
            </div>
            <div className="hidden xl:flex items-center gap-8 border-l border-white/10 pl-12">
              <IndexItem symb="SPY" val="+0.07%" up />
              <IndexItem symb="QQQ" val="-0.12%" />
              <IndexItem symb="BTC" val="+1.42%" up />
            </div>
          </div>
          <div className="flex-1 max-w-sm px-12">
            <AssetCommand />
          </div>
          <div className="flex items-center gap-8" aria-label="System status">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse shadow-bull" aria-hidden="true" />
                <span className="text-[12px] font-bold text-bull uppercase tracking-[0.15em]">Live Vector</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-zinc-500 mt-1 uppercase tracking-widest">Latency: 0.02ms</span>
            </div>
          </div>
        </div>
      </header>

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[2px] w-8 bg-matrix" />
                <span className="text-[11px] font-bold text-matrix tracking-[0.2em] uppercase">Market Overview</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tightest leading-[1]">
                Watchlist
              </h1>
            </div>
            <div className="flex flex-col items-end gap-3">
              <p className="text-[12px] font-bold text-zinc-500 text-right tracking-[0.15em] uppercase leading-relaxed">
                <span className="text-zinc-300">{signals.length} ACTIVE ASSETS</span> TRACKED<br/>
                SYNCED <span className="text-matrix font-mono font-bold tracking-normal"><LiveTime /></span>
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

      <footer className="glass-panel z-[100] px-8 py-4 border-t border-white/5 bg-black/60 backdrop-blur-md">
        <div className="w-full flex items-center justify-between">
          <div className="flex gap-12">
            <Stat label="Protocol" value="Vector 1.0" color="text-zinc-500" />
            <Stat label="Identity" value="Auth: Verified" color="text-bull" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-12 bg-white/5" />
            <div className="flex items-center gap-3 px-5 py-1.5 bg-matrix/5 border border-matrix/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse shadow-[0_0_8px_hsla(var(--matrix)/0.6)]" />
              <span className="text-[11px] text-matrix font-bold tracking-widest uppercase">Connected</span>
            </div>
            <div className="h-[1px] w-12 bg-white/5" />
          </div>
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Protocol Integrity</span>
              <div className="flex gap-2" aria-label="Integrity bars: 4 of 4">
                {[...Array(4)].map((_, i) => <div key={i} className="w-2 h-5 bg-bull/60 rounded-full shadow-[0_0_10px_hsla(var(--bull)/0.4)]" />)}
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
    <div className="flex items-center gap-4">
      <span className="text-[12px] font-bold text-zinc-500 tracking-widest uppercase">{symb}</span>
      <span className={`text-[13px] font-mono font-bold tabular-nums tracking-tighter ${up ? 'text-bull drop-shadow-[0_0_8px_hsla(var(--bull)/0.2)]' : 'text-bear drop-shadow-[0_0_8px_hsla(var(--bear)/0.2)]'}`}>{val}</span>
    </div>
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
