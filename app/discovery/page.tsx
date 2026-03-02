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
  // Sync the audit records before loading the UI
  await evaluateAlphaPicks();
  
  const [picks, alerts, backtestData] = await Promise.all([
    getInstitutionalAlphaPicks(),
    getAlerts(),
    getBacktestWinRate(),
  ]);

  // Optionally trigger alerts/insights for the Discovery context if needed, 
  // but for the header, we just need the persistent state.
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

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12">
            <div className="xl:col-span-8 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-fit">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            <div className="xl:col-span-4">
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
    <div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-12 h-12 ${color} opacity-5 blur-3xl`} />
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 ${color} rounded-sm`} />
        <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">{title}</h3>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">{description}</p>
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
    <Link href={`/asset/${pick.ticker}`} className="glass-card border border-white/10 hover:border-white/20 transition-all p-6 group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-sm font-bold font-mono text-white block mb-1 uppercase">{pick.ticker}</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate max-w-[150px]">{pick.name}</span>
        </div>
        <div className={`text-[9px] font-black px-1.5 py-0.5 border rounded uppercase tracking-tighter ${scannerColors[pick.scanner]}`}>
          {pick.scanner}
        </div>
      </div>
      
      <div className="mb-6">
         <p className="text-[11px] text-zinc-400 font-bold leading-snug group-hover:text-white transition-colors">{pick.reason}</p>
      </div>

      <div className="flex items-end justify-between pt-6 border-t border-white/5">
        <div>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Alpha Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{pick.score.toFixed(0)}</span>
            <span className="text-[9px] font-bold text-zinc-500">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold text-white mb-0.5">${pick.price.toFixed(2)}</p>
          <p className={`text-[11px] font-bold ${pick.change >= 0 ? 'text-bull' : 'text-bear'}`}>
            {pick.change >= 0 ? '+' : ''}{pick.change.toFixed(2)}%
          </p>
        </div>
      </div>
    </Link>
  );
}
