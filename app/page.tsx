import { WatchlistGrid, WatchlistItem } from "@/components/BentoGrid";
import { getMarketSignals, removeAsset } from "@/app/actions";
import { AssetCommand } from "@/components/AssetCommand";
import { LiveTime } from "@/components/LiveTime";

export const revalidate = 60;

export default async function Home() {
  const signals = await getMarketSignals();

  return (
    <>
      {/* HEADER: ELITE NAVIGATION ARCHITECTURE */}
      <header className="glass-panel z-[100] flex items-center px-8">
          <div className="w-full flex items-center justify-between">
              
              {/* BRAND: SURGICAL IDENTITY */}
              <div className="flex items-center gap-4">
                  <div className="w-9 h-9 glass-card rounded-lg flex items-center justify-center glow-matrix">
                       <div className="w-3.5 h-3.5 bg-matrix rounded-sm rotate-45"></div>
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <span className="font-bold tracking-tighter text-base uppercase">Vector</span>
                    <span className="text-[8px] text-terminal font-mono tracking-[0.3em] uppercase">Intelligence Node</span>
                  </div>
              </div>

              {/* SEARCH: INTEGRATED COMMAND */}
              <div className="flex-1 max-w-md px-12">
                  <AssetCommand />
              </div>

              {/* STATUS: SYSTEM TELEMETRY */}
              <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                    <span className="text-telemetry text-emerald-500">Node_Active</span>
                  </div>
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-[8px] text-terminal font-bold uppercase tracking-widest">Mark_Status</span>
                    <span className="text-[10px] font-mono text-zinc-300">STB: NOMINAL</span>
                  </div>
              </div>
          </div>
      </header>

      {/* MAIN: TACTICAL CONTENT AREA */}
      <main className="overflow-y-auto scrollbar-hide px-8 pt-12 pb-24">
          <div className="max-w-[1400px] mx-auto">
              
              {/* HERO: MISSION BRIEFING */}
              <div className="mb-16 relative">
                  <div className="inline-flex items-center gap-3 mb-6">
                    <div className="h-px w-8 bg-matrix/40"></div>
                    <span className="text-telemetry text-matrix">Mission_Briefing</span>
                  </div>
                  <h1 className="text-6xl sm:text-8xl font-bold tracking-tighter mb-6 leading-[0.85]">
                    Tactical <br/> 
                    <span className="text-terminal">Overview.</span>
                  </h1>
                  <p className="max-w-xl text-zinc-500 text-sm font-medium leading-relaxed uppercase tracking-wide">
                    Real-time analysis of {signals.length} high-velocity market vectors. <br/>
                    <span className="text-terminal font-mono text-[10px]">Synchronized via Titan kernel v1.0.4</span>
                  </p>
              </div>

              {/* MATRIX: THE GRID */}
              <WatchlistGrid>
                  {signals.map((signal, i) => {
                      let change = 0;
                      if (signal.history.length >= 2) {
                          const prev = signal.history[signal.history.length - 2].close;
                          const curr = signal.price;
                          change = ((curr - prev) / prev) * 100;
                      }

                      return (
                      <WatchlistItem
                          key={i}
                          ticker={signal.ticker}
                          name={signal.ticker} 
                          price={signal.price}
                          change={change} 
                          history={signal.history.map(h => h.close)}
                          aiSignal={signal.aiPrediction}
                          onRemove={async () => {
                              "use server";
                              await removeAsset(signal.ticker);
                          }}
                      />
                      );
                  })}
              </WatchlistGrid>
          </div>
      </main>

      {/* FOOTER: TERMINAL TELEMETRY */}
      <footer className="glass-panel z-[100] px-8 flex items-center">
           <div className="w-full grid grid-cols-3 items-center">
                
                {/* SYSTEM METRICS */}
                <div className="flex gap-12">
                    <div className="flex flex-col gap-1">
                      <span className="text-telemetry">Kernel_Version</span>
                      <span className="text-[10px] font-mono text-zinc-400">TITAN_V1.0c</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-telemetry">Sync_Latency</span>
                      <span className="text-[10px] font-mono text-emerald-500">0.02ms</span>
                    </div>
                </div>

                {/* CENTRAL SYNC */}
                <div className="flex justify-center">
                   <div className="px-6 py-2.5 glass-card rounded-full flex items-center gap-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-matrix animate-pulse glow-matrix"></div>
                      <span className="text-telemetry text-zinc-300">Neural_Engine_Synchronized</span>
                   </div>
                </div>

                {/* CLOCK / STATUS */}
                <div className="flex justify-end items-center gap-6">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-telemetry text-emerald-500">Systems_Nominal</span>
                        <div className="w-1.5 h-4 bg-emerald-500/10 rounded-full flex items-end">
                           <div className="w-full h-full bg-emerald-500 animate-pulse rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-telemetry text-zinc-600 tracking-[0.4em]">
                        <LiveTime />
                      </span>
                    </div>
                </div>
           </div>
      </footer>
    </>

  );
}
