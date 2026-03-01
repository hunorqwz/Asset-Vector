import { Metadata } from "next";
import { WatchlistGrid, WatchlistItem } from "@/components/BentoGrid";
import { getMarketSignals, removeAsset } from "@/app/actions";
import { AssetCommand } from "@/components/AssetCommand";
import { LiveTime } from "@/components/LiveTime";
import { LiveLatency, IntegrityBars, StealthTooltip } from "@/components/LiveTelemetry";

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
              <StealthTooltip content="Data pipeline is streaming." position="bottom">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse shadow-[0_0_8px_hsla(var(--matrix)/0.6)]" aria-hidden="true" />
                  <span className="text-[12px] font-bold text-matrix uppercase tracking-[0.15em]">Live Vector</span>
                </div>
              </StealthTooltip>
              <StealthTooltip content="WebSocket market feed delay" position="bottom">
                <span className="text-[11px] font-mono font-bold text-zinc-500 mt-1 uppercase tracking-widest">Latency: <LiveLatency /></span>
              </StealthTooltip>
            </div>
          </div>
        </div>
      </header>

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
            {/* LEFT COLUMN: MACRO ENVIRONMENT */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <div className="glass-card p-6 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
                  Macro Environment
                </h2>
                <div className="flex flex-col gap-5">
                  <MacroItem name="VIX" desc="Volatility Index" value="14.20" change="-2.10%" up={false} />
                  <MacroItem name="DXY" desc="US Dollar Index" value="103.54" change="+0.42%" up={true} />
                  <MacroItem name="US10Y" desc="10-Year Treasury" value="4.25%" change="+0.02%" up={true} />
                  <MacroItem name="VVIX" desc="VIX Volatility" value="84.15" change="-1.20%" up={false} />
                </div>
              </div>
              
              <div className="glass-card p-6 border border-white/10 relative overflow-hidden">
                <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-bull" />
                  Breadth Engine
                </h2>
                <div className="flex items-end justify-between mb-2">
                   <span className="text-2xl font-bold font-mono text-white">68%</span>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Advancing</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                   <div className="h-full bg-bull" style={{width: '68%'}} />
                   <div className="h-full bg-bear" style={{width: '32%'}} />
                </div>
                <div className="flex justify-between mt-3 text-[10px] font-bold tracking-widest uppercase">
                    <span className="text-bull">2,410</span>
                    <span className="text-bear">1,105</span>
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: HIGH DENSITY WATCHLIST */}
            <div className="xl:col-span-8">
              <WatchlistGrid>
                {signals.map((s, i) => {
                  const change = s.history.length >= 2 ? ((s.price - s.history[s.history.length-2].close) / s.history[s.history.length-2].close) * 100 : 0;
                  return (
                    <WatchlistItem 
                      key={i} 
                      signal={s}
                      change={change} 
                      onRemove={async () => { "use server"; await removeAsset(s.ticker); }}
                    />
                  );
                })}
              </WatchlistGrid>
            </div>

            {/* RIGHT COLUMN: VELOCITY / NEWS */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <div className="glass-card p-6 border border-white/10 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Narrative Velocity
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
                <Stat label="Protocol" value="Vector 1.0" color="text-zinc-500" />
              </div>
            </StealthTooltip>
            <StealthTooltip content="Encrypted 256-bit session verified">
              <div className="flex items-center">
                <Stat label="Identity" value="Auth: Verified" color="text-matrix" />
              </div>
            </StealthTooltip>
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
            <div className="flex items-center gap-4">
              <StealthTooltip content="Live connection to Neural Prediction Engine">
                <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Protocol Integrity</span>
              </StealthTooltip>
              <IntegrityBars />
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

function MacroItem({ name, desc, value, change, up }: { name: string, desc: string, value: string, change: string, up: boolean }) {
  const color = up ? 'text-bull' : 'text-bear';
  return (
    <div className="flex items-center justify-between group">
       <div className="flex flex-col">
          <span className="text-[12px] font-bold text-white tracking-widest uppercase">{name}</span>
          <span className="text-[10px] text-zinc-500 font-medium tracking-wide">{desc}</span>
       </div>
       <div className="flex flex-col items-end">
          <span className="text-[13px] font-mono font-bold text-white tabular-nums">{value}</span>
          <span className={`text-[10px] font-mono font-bold tabular-nums ${color}`}>{change}</span>
       </div>
    </div>
  );
}
