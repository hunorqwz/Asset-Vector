import { Metadata } from "next";
import { getInstitutionalAlphaPicks } from "@/app/actions/discovery";
import { evaluateAlphaPicks, getBacktestWinRate } from "@/app/actions/backtest";
import { BacktestScorecard } from "@/components/organisms/BacktestScorecard";
import { InfoTooltip } from "@/components/atoms/InfoTooltip";
import { PageHeader } from "@/components/organisms/PageHeader";
import { DiscoveryContainer } from "@/components/organisms/DiscoveryContainer";

export const metadata: Metadata = {
  title: "Market Discovery & Scanners | Asset Vector",
  description: "Institutional Market Scanners and High-Conviction Market Picks.",
};

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const [picks, backtestData] = await Promise.all([
    getInstitutionalAlphaPicks(),
    getBacktestWinRate(),
    evaluateAlphaPicks(), // runs eval analysis background/cache update
  ]);

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tightest leading-[1]">Discovery</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12 items-start">
            <div className="xl:col-span-8 2xl:col-span-9">
              <DiscoveryContainer initialPicks={picks} />
            </div>

            <div className="xl:col-span-4 2xl:col-span-3">
              <div className="sticky top-24 space-y-8">
                <BacktestScorecard data={backtestData} />
                
                {/* Screener Protocol Sidebar Tip */}
                <div className="bg-white/[0.02] rounded-xl p-6 border border-white/10 relative overflow-hidden">
                   <h3 className="text-xs font-bold text-zinc-400 tracking-wide mb-4 flex items-center">
                     Scanner Criteria
                     <InfoTooltip insightKey="PORTFOLIO_CORRELATION" category="QUANT" />
                   </h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">
                     The scanner prioritizes assets with <span className="text-white">Low Asset Covariance</span> to help you build a resilient, non-clustered alpha profile.
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
