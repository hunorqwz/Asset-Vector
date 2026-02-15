"use client";

import { removeAsset } from "@/app/actions";
import { useState } from "react";

export function RemoveAssetButton({ ticker }: { ticker: string }) {
  const [loading, setLoading] = useState(false);

  // Prevent default assets from being deleted to avoid empty dashboard
  const isDefault = ["BTC-USD", "NVDA", "SPY", "VIX"].includes(ticker);
  
  // Actually, let's allow deleting defaults if user wants to, 
  // but maybe show a visual warning or just allow it. The system handles empty DB.
  
  const handleRemove = async () => {
     if (confirm(`Stop tracking ${ticker}?`)) {
        setLoading(true);
        await removeAsset(ticker);
        // Page will auto-refresh via server action
     }
  };

  return (
    <button 
      onClick={handleRemove}
      disabled={loading}
      className="text-[9px] text-neutral-600 hover:text-red-500 uppercase tracking-widest font-mono border-l border-neutral-800 pl-2 ml-2 disabled:opacity-50"
    >
      {loading ? "..." : "REMOVE"}
    </button>
  );
}
