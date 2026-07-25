import { Metadata } from "next";
import { getInstitutionalAlphaPicks } from "@/app/actions/discovery";
import { evaluateAlphaPicks, getBacktestWinRate } from "@/app/actions/backtest";
import { BacktestScorecard } from "@/components/organisms/BacktestScorecard";
import { InfoTooltip } from "@/components/atoms/InfoTooltip";
import { PageHeader } from "@/components/organisms/PageHeader";
import { DiscoveryContainer } from "@/components/organisms/DiscoveryContainer";

export const metadata: Metadata = {
  title: "Discovery Lab & Alpha Scanners | Asset Vector",
  description: "Institutional Market Scanners and High-Conviction Alpha Signals.",
};

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const [picks, backtestData] = await Promise.all([
    getInstitutionalAlphaPicks(),
    getBacktestWinRate(),
    evaluateAlphaPicks(),
  ]);

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-8 bg-[#f8fafc]">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* TOP PAGE HEADER CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Discovery Lab</span>
                <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider border border-purple-200">
                  Alpha Engine Active
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Market Discovery & Alpha Screener</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Quantitative screening rules targeting low covariance and high risk-adjusted return setups.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-right">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Picks Analyzed</span>
                <span className="text-lg font-mono font-bold text-slate-800 tabular-nums">{picks.length} Candidates</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8 2xl:col-span-9 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <DiscoveryContainer initialPicks={picks} />
            </div>

            <div className="xl:col-span-4 2xl:col-span-3 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <BacktestScorecard data={backtestData} />
              </div>
              
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>Scanner Protocol Tip</span>
                  <InfoTooltip insightKey="PORTFOLIO_CORRELATION" category="QUANT" />
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  The scanner prioritizes assets with <strong className="text-slate-900">Low Asset Covariance</strong> to protect your portfolio against cluster risk.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
