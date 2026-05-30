"use client";

import React, { useState } from "react";

interface PortfolioTabsProps {
  holdingsContent: React.ReactNode;
  riskContent: React.ReactNode;
  alertsContent: React.ReactNode;
}

const TABS = [
  { id: "HOLDINGS", label: "Holdings & Position Entry" },
  { id: "RISK", label: "Risk & Correlation Model" },
  { id: "ALERTS", label: "Price Alerts & Warnings" },
] as const;

type TabId = typeof TABS[number]["id"];

export function PortfolioTabs({ holdingsContent, riskContent, alertsContent }: PortfolioTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("HOLDINGS");

  return (
    <div className="space-y-8">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center border-b border-white/5 w-full mb-8 overflow-x-auto scrollbar-hide p-1 gap-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 text-[11px] font-bold tracking-wider transition-all uppercase whitespace-nowrap relative ${
              activeTab === tab.id
                ? "text-matrix font-extrabold"
                : "text-zinc-500 hover:text-zinc-300 font-medium"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-matrix rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "HOLDINGS" && holdingsContent}
        {activeTab === "RISK" && riskContent}
        {activeTab === "ALERTS" && alertsContent}
      </div>
    </div>
  );
}
