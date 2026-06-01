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
          {/* Summary Stats Cards Skeletons */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-zinc-900/30 border border-white/5 rounded-xl" />
            ))}
          </div>

          {/* Coach Box Skeleton */}
          <div className="h-20 bg-zinc-900/20 border border-white/5 rounded-xl mb-8" />

          {/* Portfolio Table Grid Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-4">
              <div className="h-[350px] bg-zinc-900/20 border border-white/5 rounded-xl p-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                  <div className="h-5 w-24 bg-zinc-800/40 rounded" />
                  <div className="h-5 w-32 bg-zinc-800/40 rounded" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-5 gap-4 py-2 border-b border-white/[0.03]">
                      <div className="h-4 w-14 bg-zinc-850/40 rounded" />
                      <div className="h-4 w-12 bg-zinc-850/40 rounded justify-self-end" />
                      <div className="h-4 w-16 bg-zinc-850/40 rounded justify-self-end" />
                      <div className="h-4 w-16 bg-zinc-850/40 rounded justify-self-end" />
                      <div className="h-4 w-10 bg-zinc-850/40 rounded justify-self-end" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="xl:col-span-4 space-y-8">
              <div className="h-[200px] bg-zinc-900/30 border border-white/5 rounded-xl" />
              <div className="h-[120px] bg-zinc-900/30 border border-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
