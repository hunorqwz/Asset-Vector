"use client";

import React, { useEffect } from "react";

export default function DiscoveryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Discovery Scanner Error Caught:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-transparent">
      <div className="max-w-md w-full border border-white/5 bg-[#0f0f11] p-8 rounded-xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-lg bg-bear/10 border border-bear/20 flex items-center justify-center mb-6">
          <svg className="w-5 h-5 text-bear" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-[14px] font-bold text-white uppercase tracking-wider mb-2">SCANNER RECONNAISSANCE DELAY</h2>
        <p className="text-[10px] text-zinc-500 font-mono mb-8 uppercase tracking-widest max-w-[280px]">
          Unable to pull active scan parameters from AI intelligence node.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 border border-white/10 hover:bg-white/5 text-[10.5px] font-bold uppercase tracking-widest rounded-lg text-zinc-300 hover:text-white transition-colors active:scale-95"
          aria-label="Restart institutional alpha pick scanner"
        >
          RELOAD SCANNER
        </button>
      </div>
    </div>
  );
}
