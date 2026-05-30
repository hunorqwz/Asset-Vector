"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AssetCommand } from "@/components/AssetCommand";
import { AlertBell } from "@/components/AlertBell";
import { useAlpacaContext } from "@/components/providers/AlpacaProvider";
import { RegimeBreakout } from "@/lib/regime-radar";

interface GlobalHeaderProps {
  alerts: any[];
  insights: any[];
  regimeBreakout?: RegimeBreakout | null;
}

export function GlobalHeader({ alerts, insights, regimeBreakout }: GlobalHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isConnected } = useAlpacaContext();

  const navLinks = [
    { name: "Portfolio", href: "/portfolio" },
    { name: "Compare", href: "/compare" },
    { name: "Discovery", href: "/discovery" },
  ];

  return (
    <header className="glass-panel z-[100] sticky top-0 border-b border-white/5 bg-black/40 backdrop-blur-md px-4 md:px-8 w-full max-w-[100vw] overflow-hidden">
      <div className="flex items-center justify-between py-3.5 relative">
        {/* LEFT: Logo & Nav Links */}
        <div className="flex items-center gap-6 xl:gap-10">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-matrix/10 border border-matrix/20 shadow-[0_0_12px_rgba(0,255,163,0.1)] transition-all group-hover:border-matrix/40">
              <svg className="w-4 h-4 text-matrix" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8L6 19" />
              </svg>
            </div>
            <span className="font-display font-bold tracking-tight text-[17px] text-white group-hover:text-zinc-300 transition-colors">Asset Vector</span>
          </Link>
 
          {/* Desktop Nav */}
          <div className="hidden xl:flex items-center gap-8 border-l border-white/10 pl-8">
            <nav className="flex items-center gap-1.5 p-1 bg-white/[0.01] border border-white/5 rounded-xl">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-4 py-2 text-xs font-bold tracking-wide transition-all rounded-lg border ${
                      isActive
                        ? "bg-matrix/10 border-matrix/30 text-matrix shadow-[0_0_12px_rgba(0,255,163,0.15)]"
                        : "bg-transparent border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:border-white/5"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
 
        {/* CENTER: Search Bar */}
        <div className="hidden lg:block flex-1 px-8 max-w-xl transition-all duration-300">
          <AssetCommand />
        </div>
 
        {/* RIGHT: Status & Alerts */}
        <div className="flex items-center gap-4 md:gap-5">
           {/* Alerts & Live Status */}
           <div className="flex items-center gap-4">
              <AlertBell alerts={alerts} insights={insights} regimeBreakout={regimeBreakout} />
           </div>
 
           {/* Mobile Menu Toggle */}
           <button 
             onClick={() => setIsMenuOpen(!isMenuOpen)}
             className="xl:hidden w-8 h-8 flex items-center justify-center border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white transition-all rounded-md"
             aria-label="Toggle Navigation Menu"
           >
             <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
        <div className="xl:hidden absolute top-[calc(100%+1px)] left-0 w-full bg-gradient-to-b from-[#090b10]/95 to-[#0b0e16]/95 backdrop-blur-xl border-b border-white/5 animate-in slide-in-from-top-4 duration-200 p-6 flex flex-col gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[90vh] z-50">
           <div className="lg:hidden">
              <AssetCommand />
           </div>
           
           <nav className="flex flex-col gap-4 py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-base font-bold tracking-wide transition-colors ${
                    pathname === link.href ? "text-matrix" : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
           </nav>
        </div>
      )}
    </header>
  );
}
