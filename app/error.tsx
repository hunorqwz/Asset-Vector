"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Root Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <div className="max-w-md w-full border border-red-500/20 bg-zinc-950 p-8 rounded-lg shadow-[0_0_24px_rgba(239,68,68,0.05)] flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold font-sans tracking-tight mb-2">SYSTEM FAULT</h2>
        <p className="text-xs text-zinc-500 font-mono mb-8 uppercase tracking-wider leading-relaxed">
          Critical core connection interface failure.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-zinc-900 border border-white/10 hover:bg-zinc-800 active:scale-95 transition-all text-xs font-semibold uppercase tracking-wider rounded-lg text-zinc-300 hover:text-white"
          aria-label="Re-establish core telemetry connection"
        >
          Re-establish Telemetry
        </button>
      </div>
    </div>
  );
}
