import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <div className="max-w-md w-full border border-white/10 bg-zinc-950 p-8 rounded-lg shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center mb-6">
          <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-display font-black tracking-tightest leading-none mb-2 text-white">404</h1>
        <h2 className="text-[12px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-6">
          SECTOR OUT OF BOUNDS
        </h2>
        
        <p className="text-xs text-zinc-500 font-mono mb-8 uppercase tracking-widest max-w-[280px] leading-relaxed">
          The requested coordinate matrix does not exist in active telemetry database routing.
        </p>
        
        <Link
          href="/"
          className="px-6 py-2.5 bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors text-xs font-semibold uppercase tracking-wider rounded-lg text-zinc-300 hover:text-white"
          aria-label="Return to core market telemetry dashboard"
        >
          Return to Hub
        </Link>
      </div>
    </div>
  );
}
