"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AssetCommand } from "@/components/AssetCommand";
import { AlertBell } from "@/components/AlertBell";
import { StealthTooltip, LiveLatency } from "@/components/LiveTelemetry";



import { RegimeBreakout } from "@/lib/regime-radar";

interface GlobalHeaderProps {
  alerts: any[];
  insights: any[];
  regimeBreakout?: RegimeBreakout | null;
}

export function GlobalHeader({ alerts, insights, regimeBreakout }: GlobalHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Portfolio", href: "/portfolio" },
    { name: "Compare", href: "/compare" },
    { name: "Discovery", href: "/discovery" },
  ];

  return (
    <header className="glass-panel z-[100] sticky top-0 border-b border-white/5 bg-black/80 backdrop-blur-xl px-4 md:px-8 w-full max-w-[100vw] overflow-hidden">
      <div className="flex items-center justify-between py-4 relative">
        {/* LEFT: Logo & Tickers */}
        <div className="flex items-center gap-6 xl:gap-12">
          <Link href="/" className="flex items-center gap-3.5 group shrink-0">
            <div className="w-9 h-9 glass-card rounded-xl flex items-center justify-center glow-matrix bg-matrix/5 border-matrix/20">
              <div className="w-2.5 h-2.5 bg-matrix rounded-sm rotate-45 shadow-[0_0_12px_hsla(var(--matrix)/0.6)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tightest text-[16px] text-white uppercase leading-none mb-1">Vector</span>
              <span className="text-[12px] font-bold text-zinc-500 tracking-[0.2em] uppercase leading-none">Intelligence</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden xl:flex items-center gap-8 border-l border-white/10 pl-12">
            <nav className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                    pathname === link.href ? "text-matrix" : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* CENTER: Search Bar - Persistent but collapses on mobile */}
        <div className="hidden lg:block flex-1 px-8 max-w-2xl transition-all duration-300">
          <AssetCommand />
        </div>

        {/* RIGHT: Status & Mobile Menu Trigger */}
        <div className="flex items-center gap-4 md:gap-6">
           {/* Alerts & Live Status */}
           <div className="flex items-center gap-4">
              <AlertBell alerts={alerts} insights={insights} regimeBreakout={regimeBreakout} />
              <div className="hidden sm:flex flex-col items-end">
                <StealthTooltip content="Data pipeline is streaming." position="bottom">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse shadow-[0_0_8px_hsla(var(--matrix)/0.6)]" aria-hidden="true" />
                    <span className="text-[12px] font-bold text-matrix uppercase tracking-[0.15em]">Live</span>
                  </div>
                </StealthTooltip>
                <StealthTooltip content="WebSocket market feed delay" position="bottom">
                  <span className="text-[11px] font-mono font-bold text-zinc-500 mt-1 uppercase tracking-widest whitespace-nowrap">
                    LATENCY: <LiveLatency />
                  </span>
                </StealthTooltip>
              </div>
           </div>

           {/* Mobile Menu Toggle */}
           <button 
             onClick={() => setIsMenuOpen(!isMenuOpen)}
             className="xl:hidden w-9 h-9 flex items-center justify-center border border-white/10 text-zinc-400 hover:text-white transition-opacity"
             aria-label="Toggle Navigation Menu"
           >
             <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
               {isMenuOpen ? (
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
               )}
             </svg>
           </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="xl:hidden absolute top-[calc(100%+1px)] left-0 w-full bg-gradient-to-b from-black/95 to-zinc-950/95 backdrop-blur-2xl border-b border-white/10 animate-in slide-in-from-top-4 duration-300 p-8 flex flex-col gap-10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[90vh] z-50">
           <div className="lg:hidden">
              <AssetCommand />
           </div>
           
           <nav className="flex flex-col gap-6">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-white/5 pb-4">Terminal Navigation</p>
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-lg font-bold uppercase tracking-[0.25em] transition-colors ${
                    pathname === link.href ? "text-matrix" : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
           </nav>



           <div className="mt-4 p-4 bg-white/[0.03] border border-white/5 rounded-sm">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                Surgical Intelligence Platform <br/> Locked & Streaming.
              </p>
           </div>
        </div>
      )}
    </header>
  );
}
