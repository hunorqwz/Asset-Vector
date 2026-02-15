import { WatchlistGrid, WatchlistItem } from "@/components/BentoGrid";
import { getMarketSignals, removeAsset } from "@/app/actions";
import { AssetCommand } from "@/components/AssetCommand";
import { LiveTime } from "@/components/LiveTime";

export const revalidate = 60;

export default async function Home() {
  const signals = await getMarketSignals();

  return (
    <>
      {/* HEADER: COMMAND CENTER (High Density) */}
      <header className="glass-panel z-[100] flex items-center px-8 relative overflow-hidden">
          {/* MINI TICKER TAPE (Apple Style) */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-matrix/10">
              <div className="h-full bg-matrix w-1/4 animate-[shimmer-sweep_4s_linear_infinite]"></div>
          </div>

          <div className="w-full flex items-center justify-between">
              
              {/* BRAND: SURGICAL IDENTITY */}
              <div className="flex items-center gap-12">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 glass-card rounded flex items-center justify-center glow-matrix">
                          <div className="w-3 h-3 bg-matrix rounded-sm rotate-45"></div>
                      </div>
                      <div className="flex flex-col -space-y-1">
                          <span className="font-bold tracking-tighter text-sm uppercase">Vector</span>
                          <span className="text-[7px] text-terminal font-mono tracking-[0.4em] uppercase opacity-50">Surgical_OS</span>
                      </div>
                  </div>

                  {/* MARKET INDICES (Silent Telemetry) */}
                  <div className="hidden xl:flex items-center gap-6 border-l border-white/10 pl-12">
                      <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-terminal uppercase">SPY</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-500">+0.07%</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-terminal uppercase">QQQ</span>
                          <span className="text-[10px] font-mono font-bold text-rose-500">-0.12%</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-terminal uppercase">BTC</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-500">+1.42%</span>
                      </div>
                  </div>
              </div>

              {/* SEARCH: INTEGRATED COMMAND */}
              <div className="flex-1 max-w-sm px-12">
                  <AssetCommand />
              </div>

              {/* STATUS: SYSTEM METADATA */}
              <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                          <span className="text-telemetry text-emerald-500">Node_Stable</span>
                      </div>
                      <span className="text-[7px] font-mono text-terminal uppercase tracking-widest mt-0.5">Latency: 0.02ms</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                      <div className="w-1 h-3 bg-terminal rounded-full"></div>
                  </button>
              </div>
          </div>
      </header>

      {/* MAIN: TACTICAL MATRIX AREA */}
      <main className="overflow-y-auto scrollbar-hide px-8 py-8">
          <div className="max-w-[1400px] mx-auto">
              
              {/* HERO: MISSION BRIEFING (Compressed) */}
              <div className="mb-12 flex items-end justify-between border-b border-terminal/10 pb-8">
                  <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                          <div className="h-[1px] w-6 bg-matrix"></div>
                          <span className="text-telemetry text-matrix">Vector_Matrix_Status</span>
                      </div>
                      <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">
                        Tactical <br/> 
                        <span className="text-terminal">Intelligence.</span>
                      </h1>
                  </div>
                  <div className="flex flex-col items-end max-w-xs text-right opacity-60">
                      <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider text-zinc-400">
                        {signals.length} High-Velocity Vectors <br/>
                        Synchronized: <span className="text-white font-mono"><LiveTime /></span>
                      </p>
                  </div>
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

      {/* FOOTER: MINIMAL TELEMETRY */}
      <footer className="glass-panel z-[100] px-8 flex items-center">
           <div className="w-full flex items-center justify-between">
                
                {/* SYSTEM METRICS */}
                <div className="flex gap-10">
                    <div className="flex items-center gap-2">
                      <span className="text-telemetry">Kernel</span>
                      <span className="text-terminal font-mono text-[9px]">T_V1.0c</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-telemetry">Auth</span>
                      <span className="text-emerald-500 font-mono text-[9px]">Verified</span>
                    </div>
                </div>

                {/* CENTRAL SYNC (Minimalist) */}
                <div className="flex items-center gap-4">
                    <div className="h-[1px] w-12 bg-white/5"></div>
                    <div className="flex items-center gap-3 px-4 py-1.5 border border-white/5 bg-white/[0.01] rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse glow-matrix"></div>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.2em] font-bold">Neural_Link</span>
                    </div>
                    <div className="h-[1px] w-12 bg-white/5"></div>
                </div>

                {/* LEGEND / STATUS */}
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <span className="text-telemetry">Integrity</span>
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-1 h-3 bg-emerald-500/30 rounded-full">
                                    {i < 4 && <div className="w-full h-full bg-emerald-500 rounded-full"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <span className="text-telemetry opacity-40">Matrix_01</span>
                </div>
           </div>
     </footer>
    </>
  );
}
