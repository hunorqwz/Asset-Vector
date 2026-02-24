import React from 'react';
import { LegendDot } from "@/components/atoms/LegendDot";

export function OwnershipBar({ insiders, institutions }: { insiders: number; institutions: number }) {
  const retail = Math.max(0, 100 - insiders - institutions);
  return (
    <div className="space-y-2">
      <div className="w-full h-2 rounded-full overflow-hidden flex bg-white/5">
        <div className="h-full bg-indigo-500/60 transition-all" style={{ width: `${insiders}%` }} />
        <div className="h-full bg-emerald-500/40 transition-all" style={{ width: `${institutions}%` }} />
        <div className="h-full bg-zinc-700/40 transition-all" style={{ width: `${retail}%` }} />
      </div>
      <div className="flex items-center gap-4 justify-center">
        <LegendDot color="bg-indigo-500/60" label={`Insiders ${insiders.toFixed(1)}%`} />
        <LegendDot color="bg-emerald-500/40" label={`Institutions ${institutions.toFixed(1)}%`} />
        <LegendDot color="bg-zinc-700/40" label={`Retail ${retail.toFixed(1)}%`} />
      </div>
    </div>
  );
}
