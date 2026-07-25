import React from "react";
import Link from "next/link";
import { getHighConfidenceScans } from "@/app/actions/scanner";
import { HighConfidenceSetup } from "@/lib/market-scanner";

export const metadata = {
  title: "High-Confidence Opportunity Scanner | Asset Vector",
  description: "Real-time market scanner filtering institutional setups with 80%+ Confluence Score and 1:2.5+ Risk-to-Reward Ratio.",
};

export default async function ScannerPage() {
  const scans: HighConfidenceSetup[] = await getHighConfidenceScans();

  return (
    <div className="flex-1 bg-[#f8fafc] text-slate-800 p-8 overflow-y-auto font-sans min-w-0">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* PAGE HEADER */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Flow Telemetry</span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                Live Scanner Active
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">High-Confidence Opportunity Scanner</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Filtering institutional setups requiring Confluence Score $\ge 80\%$ and Risk-to-Reward Ratio $\ge 1:2.5$.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-right">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Setups Detected</span>
              <span className="text-lg font-mono font-bold text-slate-800">{scans.length} Active</span>
            </div>
            <Link
              href="/futures"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm shadow-blue-500/20"
            >
              Open Futures Terminal →
            </Link>
          </div>
        </div>

        {/* SCANNER SETUPS TABLE CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtered Institutional Setups</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Scanned across CME Futures & Liquid Equities</p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Updated: <span className="font-bold text-slate-700">Just Now</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Ticker / Asset</th>
                  <th className="pb-3">Direction</th>
                  <th className="pb-3">Confluence Score</th>
                  <th className="pb-3">R:R Ratio</th>
                  <th className="pb-3">Entry Price</th>
                  <th className="pb-3">Stop Loss</th>
                  <th className="pb-3">Take Profit</th>
                  <th className="pb-3">Structure Rationale</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No setups currently meet the strict $80\%+$ Confluence and $1:2.5+$ R:R thresholds.
                    </td>
                  </tr>
                ) : (
                  scans.map((setup, idx) => {
                    const isBuy = setup.direction === "BUY";
                    const isGold = setup.symbol.includes("GC");
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-4 font-bold font-mono text-slate-800">{setup.symbol}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isBuy ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {setup.direction}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-blue-200">
                            {setup.confluence.totalConfluenceScore}%
                          </span>
                        </td>
                        <td className="py-4 font-mono font-bold text-slate-700">
                          1:{setup.riskRewardRatio.toFixed(2)}
                        </td>
                        <td className="py-4 font-mono tabular-nums text-slate-800">
                          {setup.entryPrice.toFixed(isGold ? 1 : 4)}
                        </td>
                        <td className="py-4 font-mono tabular-nums text-red-600">
                          {setup.stopLoss.toFixed(isGold ? 1 : 4)}
                        </td>
                        <td className="py-4 font-mono tabular-nums text-emerald-600">
                          {setup.takeProfit.toFixed(isGold ? 1 : 4)}
                        </td>
                        <td className="py-4 text-slate-600 max-w-[300px] truncate text-[11px]">
                          {Array.isArray(setup.rationale) ? setup.rationale.join(" | ") : setup.rationale}
                        </td>
                        <td className="py-4 text-right">
                          <Link
                            href={`/futures?ticker=${setup.symbol}`}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider shadow-sm"
                          >
                            Load Setup →
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
