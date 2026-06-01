"use client";

import React, { useState, useEffect } from "react";
import { AssetCommand } from "@/components/AssetCommand";
import { getMacroMarketData, MacroMarketIndex } from "@/app/actions";

export function PageHeader() {
  const [macroData, setMacroData] = useState<MacroMarketIndex[]>([]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const data = await getMacroMarketData();
        if (active) {
          setMacroData(data);
        }
      } catch (err) {
        console.error("Failed to load macro market summary:", err);
      }
    }

    loadData();
    const interval = setInterval(loadData, 30000); // refresh every 30 seconds

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-14 border-b border-border-light flex items-center justify-between px-8 bg-[#0f0f11] shrink-0 gap-6">
      <div className="w-80 shrink-0">
        <AssetCommand />
      </div>

      {/* Macro Market Summary Bar */}
      <div className="flex-1 overflow-x-auto no-scrollbar hidden xl:flex items-center gap-6 justify-center">
        {macroData.map((item) => {
          const isNegative = item.changePercent !== null && item.changePercent < 0;
          const isZero = item.changePercent === null || item.changePercent === 0;
          const isYield = item.symbol === "^TNX";

          return (
            <div key={item.symbol} className="flex items-baseline gap-2 shrink-0 select-none text-[11px] font-semibold">
              <span className="text-zinc-500 uppercase font-bold tracking-tight">{item.name}</span>
              <span className="font-mono text-white">
                {item.price !== null
                  ? isYield
                    ? `${item.price.toFixed(2)}%`
                    : item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "N/A"}
              </span>
              {item.changePercent !== null && (
                <span className={`font-mono font-bold text-[10px] ${isNegative ? "text-bear" : isZero ? "text-zinc-500" : "text-bull"}`}>
                  {item.changePercent > 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 shrink-0">
        <div className="flex items-center gap-1.5 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Telemetry Active</span>
        </div>
      </div>
    </header>
  );
}
