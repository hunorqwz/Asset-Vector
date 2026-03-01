"use client";
import { useState, useTransition } from "react";
import { PriceAlert, dismissAlert } from "@/app/actions/alerts";

interface AlertBellProps {
  alerts: PriceAlert[];
}

export function AlertBell({ alerts }: AlertBellProps) {
  const [open, setOpen] = useState(false);
  const [localAlerts, setLocalAlerts] = useState(alerts);
  const [isPending, startTransition] = useTransition();

  const triggered = localAlerts.filter(a => a.isTriggered);
  const active = localAlerts.filter(a => !a.isTriggered);
  const hasNew = triggered.length > 0;

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      await dismissAlert(id);
      setLocalAlerts(prev => prev.filter(a => a.id !== id));
    });
  };

  const handleDismissAll = () => {
    startTransition(async () => {
      await Promise.all(triggered.map(a => dismissAlert(a.id)));
      setLocalAlerts(prev => prev.filter(a => !a.isTriggered));
    });
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-8 h-8 text-zinc-500 hover:text-white transition-colors"
        title="Price Alerts"
        aria-label={`Price alerts${hasNew ? `, ${triggered.length} triggered` : ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasNew && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-bull rounded-full flex items-center justify-center border border-black">
            <span className="text-[8px] font-bold text-black leading-none">
              {triggered.length > 9 ? "9+" : triggered.length}
            </span>
          </span>
        )}
        {!hasNew && active.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white/30 rounded-full border border-black" />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 z-50 border border-white/10 bg-[#0a0a0a] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">Price Alerts</span>
              </div>
              <div className="flex items-center gap-3">
                {triggered.length > 1 && (
                  <button
                    onClick={handleDismissAll}
                    disabled={isPending}
                    className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    Dismiss All
                  </button>
                )}
                <span className="text-[9px] font-mono text-zinc-600">
                  {active.length} active
                </span>
              </div>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto">
              {localAlerts.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No alerts</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {/* Triggered first */}
                  {triggered.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3 bg-bull/5 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-bull mt-1.5 shrink-0 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold font-mono text-white">
                          {a.ticker} {a.direction === "above" ? "↑" : "↓"} ${a.targetPrice.toFixed(2)}
                        </p>
                        <p className="text-[9px] text-bull mt-0.5 font-bold uppercase tracking-widest">
                          Triggered at ${a.triggeredPrice?.toFixed(2)}
                        </p>
                        {a.note && <p className="text-[9px] text-zinc-500 mt-0.5 truncate italic">{a.note}</p>}
                      </div>
                      <button
                        onClick={() => handleDismiss(a.id)}
                        disabled={isPending}
                        className="text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {/* Active */}
                  {active.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        a.direction === "above" ? "bg-white/30" : "bg-white/30"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold font-mono text-zinc-300">
                          {a.ticker} {a.direction === "above" ? "↑" : "↓"} ${a.targetPrice.toFixed(2)}
                        </p>
                        <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-widest font-bold">
                          Watching · {a.direction === "above" ? "Breakout" : "Support"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-4 py-3">
              <a
                href="/portfolio"
                className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
                onClick={() => setOpen(false)}
              >
                Manage All Alerts →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
