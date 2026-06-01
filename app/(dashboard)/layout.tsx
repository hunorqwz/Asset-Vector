import React from "react";
import { Sidebar } from "@/components/organisms/Sidebar";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { getMarketSignals } from "@/app/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch common layout data in parallel
  const [signals, alerts, regimeData] = await Promise.all([
    getMarketSignals().catch(() => []),
    getAlerts().catch(() => []),
    getRegimeBreakout().catch(() => null),
  ]);

  // Build price map for alerts check
  const priceMap: Record<string, number> = {};
  signals.forEach((s) => {
    if (s.price) priceMap[s.ticker] = s.price;
  });

  // Run alerts/insights check
  const { insights } = await checkAndTriggerAlerts(priceMap).catch(() => ({ insights: [] }));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar alerts={alerts} insights={insights} regimeBreakout={regimeData} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
