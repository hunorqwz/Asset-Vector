import { Metadata } from "next";
import Link from "next/link";
import { getInstitutionalAlphaPicks, AlphaPick } from "@/app/actions/discovery";
import { getAlerts, checkAndTriggerAlerts } from "@/app/actions/alerts";
import { GlobalHeader } from "@/components/organisms/GlobalHeader";
import { fmt, fmtPct } from "@/lib/format";
import { evaluateAlphaPicks, getBacktestWinRate } from "@/app/actions/backtest";
import { BacktestScorecard } from "@/components/organisms/BacktestScorecard";

export const metadata: Metadata = {
  title: "Discovery",
  description: "Institutional Alpha Scanners and High-Conviction Market Picks.",
};

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  // Parallelize all data fetching and background tasks
  const [picks, alerts, backtestData, _eval] = await Promise.all([
    getInstitutionalAlphaPicks(),
    getAlerts(),
    getBacktestWinRate(),
    evaluateAlphaPicks(), // Runs in parallel with others
  ]);

  // Insights check - Cap the priceMap to empty for discovery unless we want to audit picks
  const { insights } = await checkAndTriggerAlerts({}); 

  return (
    <>
      {/* Header */}
      <GlobalHeader alerts={alerts} insights={insights} />

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[2px] w-8 bg-matrix" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-matrix">Alpha Scanners</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tightest leading-[1]">Market Intelligence</h1>
            </div>
            <p className="text-[12px] font-bold text-zinc-500 text-right tracking-[0.15em] uppercase leading-relaxed">
              <span className="text-zinc-300">Curated Institutional Picks</span><br/>
              SCANNER ENGINE v1.2.2
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12 items-start">
            <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[stretch]">
                <ScannerInfoCard 
                  title="Momentum Tech" 
                  description="Assets breaking higher with RSI > 60 and positive MACD histograms."
                  color="bg-bull"
                />
                <ScannerInfoCard 
                  title="Value Springs" 
                  description="Assets with forward P/E < 18 and positive sentiment shifts."
                  color="bg-matrix"
                />
                <ScannerInfoCard 
                  title="Low Beta Alpha" 
                  description="Uncorrelated breakouts. Assets with Beta < 0.85 gaining momentum."
                  color="bg-orange-500"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {picks.map((pick, i) => (
                  <DiscoveryCard key={i} pick={pick} />
                ))}
                {picks.length === 0 && (
                  <div className="col-span-full border border-white/10 p-24 text-center">
                    <h2 className="text-[13px] font-bold text-zinc-500 uppercase tracking-widest">Scanning market for institutional alpha...</h2>
                    <p className="text-[11px] text-zinc-600 mt-2 font-medium">No assets matching current institutional scanner criteria found.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-4 2xl:col-span-3">
              <BacktestScorecard data={backtestData} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function ScannerInfoCard({ title, description, color }: { title: string, description: string, color: string }) {
  return (
    <div className="glass-card p-6 border border-white/10 bg-gradient-to-br from-zinc-900/50 to-zinc-950/80 backdrop-blur-md relative overflow-hidden transition-all duration-300 flex flex-col">
      <div className={`absolute -top-4 -right-4 w-24 h-24 ${color} opacity-[0.03] blur-2xl`} />
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <div className={`w-2 h-2 ${color} rounded-sm opacity-80`} />
        <h3 className="text-[12px] font-bold text-white uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium relative z-10 flex-1">{description}</p>
    </div>
  );
}

function DiscoveryCard({ pick }: { pick: AlphaPick }) {
  const scannerColors = {
    'MOMENTUM': 'text-bull border-bull/30 bg-bull/5',
    'VALUE': 'text-matrix border-matrix/30 bg-matrix/5',
    'UNCORRELATED': 'text-orange-500 border-orange-500/30 bg-orange-500/5'
  };

  return (
    <Link 
      href={`/asset/${pick.ticker}`} 
      className="glass-card flex flex-col h-full border border-white/10 bg-gradient-to-br from-zinc-900/40 to-black/60 backdrop-blur-sm transition-all duration-300 p-6 group"
    >
      <div className="flex justify-between items-start mb-6 gap-3">
        <div className="flex-1 min-w-0 pr-2 pb-1 border-b border-white/5 mb-1">
          <span className="text-sm font-bold font-mono text-white block mb-0.5 uppercase tracking-wider">{pick.ticker}</span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em] block w-full whitespace-nowrap overflow-hidden group-hover:text-zinc-400 transition-colors">{pick.name}</span>
        </div>
        <div className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 border rounded uppercase tracking-tighter shadow-sm ${scannerColors[pick.scanner as keyof typeof scannerColors]}`}>
          {pick.scanner}
        </div>
      </div>
      
      <div className="mb-6 flex-1">
         <p className="text-[11px] text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-300 transition-colors line-clamp-3">{pick.reason}</p>
      </div>

      <div className="flex items-end justify-between pt-5 border-t border-white/5 mt-auto">
        <div>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1.5">Alpha Score</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold font-mono tracking-tighter ${pick.score > 80 ? 'text-bull drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]' : pick.score > 70 ? 'text-matrix drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'text-white'}`}>{pick.score.toFixed(0)}</span>
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
