import { Metadata } from "next";
import Link from "next/link";
import { getInstitutionalAlphaPicks, AlphaPick } from "@/app/actions/discovery";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { GlobalHeader } from "@/components/organisms/GlobalHeader";
import { fmt, fmtPct } from "@/lib/format";
import { evaluateAlphaPicks, getBacktestWinRate } from "@/app/actions/backtest";
import { BacktestScorecard } from "@/components/organisms/BacktestScorecard";

export const metadata: Metadata = {
  title: "Discovery Radar",
  description: "Institutional Alpha Scanners and High-Conviction Market Picks.",
};

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const [picks, alerts, backtestData, _eval, regimeData] = await Promise.all([
    getInstitutionalAlphaPicks(),
    getAlerts(),
    getBacktestWinRate(),
    evaluateAlphaPicks(),
    getRegimeBreakout(),
  ]);

  const { insights } = await checkAndTriggerAlerts({}); 

  return (
    <>
      <GlobalHeader alerts={alerts} insights={insights} regimeBreakout={regimeData} />

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[2px] w-8 bg-matrix" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-matrix">Alpha Scanners v2.0</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tightest leading-[1]">Tactical Scout</h1>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-bold text-zinc-300 tracking-[0.15em] uppercase leading-relaxed">
                SURGICAL INTELLIGENCE
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                Regime: <span className="text-matrix">Active Distribution</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12 items-start">
            <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-8">
              
              {/* Scanner Categories Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ScannerInfoCard 
                  title="Surgical Alpha" 
                  description="Convergence of Institutional Confidence (>0.6) and high alpha generation."
                  color="bg-bull"
                  badge="TOP TIER"
                />
                <ScannerInfoCard 
                  title="Regime Fit" 
                  description="Assets whose volatility structure perfectly matches current market regime."
                  color="bg-matrix"
                  badge="STRUCTURAL"
                />
                <ScannerInfoCard 
                  title="Vol Squeeze" 
                  description="Low SNR noise with high predictability. Calm before a violent breakout."
                  color="bg-bear"
                  badge="SQUEEZE"
                />
              </div>

              {/* Picks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {picks.map((pick, i) => (
                  <DiscoveryCard key={pick.ticker} pick={pick} />
                ))}
                {picks.length === 0 && (
                  <div className="col-span-full border border-white/5 bg-zinc-950/30 p-24 text-center rounded-xl">
                    <div className="w-16 h-16 rounded-full bg-matrix/5 border border-matrix/20 flex items-center justify-center mx-auto mb-6">
                       <div className="w-4 h-4 bg-matrix rounded-full animate-pulse shadow-[0_0_15px_hsla(var(--matrix)/0.5)]" />
                    </div>
                    <h2 className="text-[13px] font-bold text-white uppercase tracking-widest mb-2">Scanning market architecture...</h2>
                    <p className="text-[11px] text-zinc-600 font-medium max-w-xs mx-auto">No assets currently matching the Alpha-Vector surgical criteria. High noise environment detected.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-4 2xl:col-span-3">
              <div className="sticky top-24 space-y-8">
                <BacktestScorecard data={backtestData} />
                
                {/* Tactical Scout Sidebar Tip */}
                <div className="glass-card p-6 border border-white/10 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/30 to-transparent" />
                   <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Scout Protocol</h3>
                   <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                     The scanner prioritizes assets with <span className="text-white">Low Portfolio Correlation</span> to help you build a resilient, non-clustered alpha profile.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function ScannerInfoCard({ title, description, color, badge }: { title: string, description: string, color: string, badge: string }) {
  return (
    <div className="glass-card p-6 border border-white/10 bg-gradient-to-br from-zinc-900/50 to-zinc-950/80 backdrop-blur-md relative overflow-hidden transition-all duration-300 flex flex-col group">
      <div className={`absolute -top-4 -right-4 w-24 h-24 ${color} opacity-[0.03] blur-3xl group-hover:opacity-[0.08] transition-opacity`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 ${color} rounded-sm opacity-80`} />
          <h3 className="text-[12px] font-bold text-white uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <span className="text-[8px] font-black text-zinc-500 border border-white/10 px-1.5 py-0.5 rounded-full">{badge}</span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium relative z-10 flex-1">{description}</p>
    </div>
  );
}

function DiscoveryCard({ pick }: { pick: AlphaPick }) {
  const scannerColors: Record<string, string> = {
    'SURGICAL_ALPHA': 'text-bull border-bull/30 bg-bull/5',
    'REGIME_FIT': 'text-matrix border-matrix/30 bg-matrix/5',
    'VOL_SQUEEZE': 'text-bear border-bear/30 bg-bear/5',
    'MOMENTUM': 'text-zinc-200 border-zinc-500/30 bg-zinc-500/5',
    'VALUE': 'text-zinc-200 border-zinc-500/30 bg-zinc-500/5',
    'UNCORRELATED': 'text-zinc-200 border-zinc-500/30 bg-zinc-500/5'
  };

  const corrLabel = pick.correlationToPortfolio !== undefined 
    ? (pick.correlationToPortfolio < 0.2 ? 'Alpha Hedge' : pick.correlationToPortfolio > 0.8 ? 'Clustered' : 'Moderate') 
    : null;

  return (
    <Link 
      href={`/asset/${pick.ticker}`} 
      className="glass-card flex flex-col h-full border border-white/10 bg-gradient-to-br from-zinc-900/40 to-black/60 backdrop-blur-sm transition-all duration-300 p-6 group relative"
    >
      <div className="flex justify-between items-start mb-6 gap-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold font-mono text-white uppercase tracking-wider">{pick.ticker}</span>
            {corrLabel && (
              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${
                corrLabel === 'Alpha Hedge' ? 'bg-bull/10 text-bull border border-bull/20' : 
                corrLabel === 'Clustered' ? 'bg-bear/10 text-bear border border-bear/20' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {corrLabel}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em] block w-full whitespace-nowrap overflow-hidden group-hover:text-zinc-400 transition-colors">{pick.name}</span>
        </div>
        <div className={`shrink-0 text-[8px] font-black px-1.5 py-0.5 border rounded uppercase tracking-tighter shadow-sm ${scannerColors[pick.scanner] || 'text-zinc-400 border-white/10 bg-white/5'}`}>
          {pick.scanner.replace('_', ' ')}
        </div>
      </div>
      
      <div className="mb-6 flex-1">
         <p className="text-[11px] text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-300 transition-colors line-clamp-3">{pick.reason}</p>
      </div>

      <div className="flex items-end justify-between pt-5 border-t border-white/5 mt-auto">
        <div>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1.5">Alpha Score</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold font-mono tracking-tighter ${
              pick.score > 85 ? 'text-bull drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 
              pick.score > 75 ? 'text-matrix drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'text-white'
            }`}>{pick.score}</span>
          </div>
        </div>
        <div className="text-right pb-0.5">
          <p className="text-[13px] font-mono font-bold text-white mb-0.5">${pick.price.toFixed(2)}</p>
          <p className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 ${pick.change >= 0 ? 'text-bull' : 'text-bear'}`}>
            <span>{pick.change >= 0 ? '+' : ''}{pick.change.toFixed(2)}%</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
