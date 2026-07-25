"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAlpacaContext } from "@/components/providers/AlpacaProvider";
import { LogoutButton } from "@/components/LogoutButton";
import { AlertBell } from "@/components/AlertBell";
import { PriceAlert, Insight } from "@/app/actions/alerts";
import { RegimeBreakout } from "@/lib/regime-radar";

interface SidebarProps {
  alerts: PriceAlert[];
  insights: Insight[];
  regimeBreakout?: RegimeBreakout | null;
}

export function Sidebar({ alerts, insights, regimeBreakout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected } = useAlpacaContext();

  // Navigation hotkeys: Alt + 1/2/3/4/5/6/7
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.hasAttribute("contenteditable"))
      ) {
        return;
      }

      if (e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          router.push("/");
        } else if (e.key === "2") {
          e.preventDefault();
          router.push("/futures");
        } else if (e.key === "3") {
          e.preventDefault();
          router.push("/scanner");
        } else if (e.key === "4") {
          e.preventDefault();
          router.push("/portfolio");
        } else if (e.key === "5") {
          e.preventDefault();
          router.push("/compare");
        } else if (e.key === "6") {
          e.preventDefault();
          router.push("/discovery");
        } else if (e.key === "7") {
          e.preventDefault();
          router.push("/settings");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const menuItems = [
    {
      name: "Overview",
      href: "/",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      name: "Futures Terminal",
      href: "/futures",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      name: "High-Confluence Scanner",
      href: "/scanner",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
        </svg>
      ),
    },
    {
      name: "Portfolio Desk",
      href: "/portfolio",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
        </svg>
      ),
    },
    {
      name: "Compare Engine",
      href: "/compare",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ),
    },
    {
      name: "Discovery Lab",
      href: "/discovery",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    {
      name: "Education Hub",
      href: "/education",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.99l1.004.831a1.125 1.125 0 0 1 .26 1.43l-1.297 2.247a1.125 1.125 0 0 1-1.37.491l-1.216-.456c-.356-.133-.751-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.83.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.831a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128c.332-.183.582-.495.645-.869l.214-1.28z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-[240px] shrink-0 border-r border-slate-200/80 bg-[#f8fafc] flex flex-col h-full z-50">
      {/* Brand Header */}
      <div className="h-16 border-b border-slate-200/80 flex items-center px-6 bg-white">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-sm shadow-blue-500/20 transition-all group-hover:bg-blue-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8L6 19" />
            </svg>
          </div>
          <div>
            <span className="font-sans font-black tracking-tight text-sm text-slate-800 block leading-none">
              Asset Vector
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
              Institutional Terminal
            </span>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold tracking-wide rounded-xl transition-all ${
                isActive
                  ? "bg-white border border-slate-200/80 text-blue-600 shadow-sm shadow-slate-200/50 font-bold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-blue-600" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Telemetry Section */}
      <div className="border-t border-slate-200/80 p-4 bg-white space-y-4">
        {/* Indicators */}
        <div className="space-y-2.5 px-1">
          {/* Telemetry Status */}
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Order Flow Engine
            </span>
            <span className="text-[9px] font-mono tabular-nums font-bold text-emerald-600">Active</span>
          </div>

          {/* Alpaca API Status */}
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
              Broker Stream
            </span>
            <span className="text-[9px] font-mono tabular-nums font-bold text-slate-500">
              {isConnected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>

        {/* Account controls */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <LogoutButton />
          
          {/* Alerts mini button */}
          <div className="mr-1">
            <AlertBell alerts={alerts} insights={insights} regimeBreakout={regimeBreakout} />
          </div>
        </div>

        {/* Copyright */}
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
          Asset Vector © 2026
        </div>
      </div>
    </aside>
  );
}
