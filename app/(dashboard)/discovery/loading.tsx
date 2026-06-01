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
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div className="h-12 w-48 bg-zinc-800/40 rounded" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12">
            <div className="xl:col-span-8 2xl:col-span-9 space-y-8">
              {/* Category Info Cards Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 bg-zinc-900/30 border border-white/5 rounded-xl" />
                ))}
              </div>

              {/* Discovery Grid Skeletons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-44 bg-zinc-900/20 border border-white/5 rounded-xl" />
                ))}
              </div>
            </div>

            <div className="xl:col-span-4 2xl:col-span-3 space-y-8">
              <div className="h-44 bg-zinc-900/30 border border-white/5 rounded-xl" />
              <div className="h-28 bg-zinc-900/30 border border-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
