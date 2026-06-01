import React from "react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
      {/* PageHeader Skeleton */}
      <div className="h-14 border-b border-border-light flex items-center justify-between px-8 bg-[#0f0f11] shrink-0 animate-pulse">
        <div className="w-80 h-7 bg-zinc-800/40 rounded" />
        <div className="w-24 h-4 bg-zinc-800/40 rounded" />
      </div>

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1400px] mx-auto animate-pulse">
          {/* Title Area Skeleton */}
          <div className="mb-10 flex items-end justify-between border-b border-white/5 pb-8">
            <div className="h-12 w-64 bg-zinc-800/40 rounded" />
            <div className="h-6 w-32 bg-zinc-800/40 rounded" />
          </div>

          {/* Ticker Manager Bar Skeleton */}
          <div className="h-14 bg-zinc-900/30 border border-white/5 rounded-xl mb-8" />

          {/* Compare Table Matrix Skeleton */}
          <div className="h-[400px] bg-zinc-900/20 border border-white/5 rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-4 gap-6 border-b border-white/5 pb-6">
              <div className="h-6 w-24 bg-zinc-800/40 rounded" />
              <div className="h-6 w-28 bg-zinc-800/40 rounded" />
              <div className="h-6 w-28 bg-zinc-800/40 rounded" />
              <div className="h-6 w-28 bg-zinc-800/40 rounded" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-6 py-2 border-b border-white/[0.03] last:border-0">
                  <div className="h-4 w-32 bg-zinc-850/40 rounded" />
                  <div className="h-4 w-16 bg-zinc-850/40 rounded" />
                  <div className="h-4 w-16 bg-zinc-850/40 rounded" />
                  <div className="h-4 w-16 bg-zinc-850/40 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
