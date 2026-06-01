import React from "react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
      {/* Skeleton PageHeader Area */}
      <div className="h-14 border-b border-border-light flex items-center justify-between px-8 bg-[#0f0f11] shrink-0 animate-pulse">
        <div className="w-80 h-7 bg-zinc-800/40 rounded" />
        <div className="w-24 h-4 bg-zinc-800/40 rounded" />
      </div>

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1600px] mx-auto animate-pulse">
          {/* Skeleton Title Area */}
          <div className="mb-10 flex items-end justify-between border-b border-white/10 pb-6">
            <div className="space-y-2">
              <div className="h-9 w-48 bg-zinc-800/40 rounded" />
              <div className="h-4 w-36 bg-zinc-800/40 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-24 bg-zinc-800/40 rounded" />
              <div className="h-4 w-px bg-white/10" />
              <div className="h-4 w-32 bg-zinc-800/40 rounded" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Scorecard / MarketPulse Skeleton */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <div className="h-40 bg-zinc-900/30 border border-white/5 rounded-xl" />
              <div className="h-64 bg-zinc-900/30 border border-white/5 rounded-xl" />
            </div>

            {/* Middle Watchlist Table Skeleton */}
            <div className="xl:col-span-8">
              <div className="h-[450px] bg-zinc-900/20 border border-white/5 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div className="h-6 w-32 bg-zinc-800/40 rounded" />
                  <div className="h-6 w-48 bg-zinc-800/40 rounded" />
                </div>
                <div className="space-y-3.5 mt-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-6 gap-4 py-2 border-b border-white/[0.03] last:border-0 items-center">
                      <div className="h-4 w-16 bg-zinc-850/40 rounded" />
                      <div className="h-4 w-24 bg-zinc-850/40 rounded" />
                      <div className="h-4 w-12 bg-zinc-850/40 rounded justify-self-end" />
                      <div className="h-4 w-16 bg-zinc-850/40 rounded justify-self-end" />
                      <div className="h-4 w-14 bg-zinc-850/40 rounded justify-self-end" />
                      <div className="h-4 w-10 bg-zinc-850/40 rounded justify-self-end" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right News Feed Skeleton */}
            <div className="xl:col-span-2">
              <div className="p-6 bg-zinc-900/30 rounded-xl border border-white/5 h-[450px] space-y-6">
                <div className="h-4 w-20 bg-zinc-800/40 rounded" />
                <div className="space-y-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex gap-2">
                        <div className="h-3 w-10 bg-zinc-850/40 rounded" />
                        <div className="h-3 w-14 bg-zinc-850/40 rounded" />
                      </div>
                      <div className="h-4 w-full bg-zinc-800/40 rounded" />
                      <div className="h-3.5 w-5/6 bg-zinc-800/40 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
