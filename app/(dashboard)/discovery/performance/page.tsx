import { Metadata } from "next";
import { getBacktestWinRate } from "@/app/actions/backtest";
import { AlphaPerformanceDashboard } from "@/components/organisms/AlphaPerformanceDashboard";
import { PageHeader } from "@/components/organisms/PageHeader";

export const metadata: Metadata = {
  title: "Alpha Performance Audit",
  description: "Comprehensive audit of AI-generated alpha signals and system track record.",
};

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const backtestData = await getBacktestWinRate();

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1400px] mx-auto">
          {!backtestData ? (
             <div className="flex flex-col items-center justify-center py-32 border border-white/5 bg-zinc-950/30 rounded-xl">
                <div className="w-12 h-12 rounded-full border border-matrix/20 bg-matrix/5 flex items-center justify-center mb-6">
                   <div className="w-2 h-2 bg-matrix rounded-full" />
                </div>
                <h2 className="text-[13px] font-bold text-white uppercase tracking-widest mb-1">Audit Log Empty</h2>
                <p className="text-[11px] text-zinc-600 font-medium">No institutional picks have been archived for backtesting yet.</p>
             </div>
          ) : (
            <AlphaPerformanceDashboard data={backtestData} />
          )}
        </div>
      </main>
    </>
  );
}
