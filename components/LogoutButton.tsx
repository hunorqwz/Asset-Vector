"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

export function LogoutButton() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setConfirmStep(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const userEmail = session?.user?.email ?? "—";
  const userInitial = userEmail !== "—" ? userEmail[0].toUpperCase() : "?";

  return (
    <div className="relative" ref={popoverRef}>
      {/* Popover Panel — opens upward */}
      {isOpen && (
        <div className="absolute bottom-[calc(100%+8px)] right-0 w-72 bg-[#07090e]/95 backdrop-blur-md border border-white/10 p-5 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* User Info */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-9 h-9 rounded-lg bg-matrix/10 border border-matrix/20 flex items-center justify-center">
              <span className="text-[12px] font-bold text-matrix">{userInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{userEmail}</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Institutional Member</p>
            </div>
          </div>

          {/* Session Details */}
          <div className="py-4 space-y-3 border-b border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Data Stream</span>
              <span className="text-[9px] font-mono font-bold text-bull uppercase tracking-wider">Alpaca Real-time</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Session</span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-bull"></span>
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Active</span>
              </div>
            </div>
          </div>

          {/* Sign Out Button — two-step */}
          <div className="pt-4">
            <button
              onClick={() => {
                if (confirmStep) {
                  signOut();
                } else {
                  setConfirmStep(true);
                }
              }}
              className={`w-full py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 ${
                confirmStep
                  ? "bg-bear/20 text-bear border border-bear/30 hover:bg-bear/30"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-zinc-300"
              }`}
            >
              {confirmStep ? "Confirm Sign Out" : "Sign Out"}
            </button>
            {confirmStep && (
              <button
                onClick={() => setConfirmStep(false)}
                className="w-full mt-2 py-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setConfirmStep(false);
        }}
        className="group relative flex items-center gap-4 px-4 py-2 hover:bg-white/5 transition-colors border-l border-white/5"
      >
        <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-matrix/40 transition-colors">
          <span className="text-[10px] font-bold text-zinc-500 group-hover:text-matrix">{userInitial}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1 group-hover:text-zinc-300">Account</span>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight group-hover:text-zinc-300 transition-colors">
            {session?.user?.email ? session.user.email.split("@")[0] : "Menu"}
          </span>
        </div>
      </button>
    </div>
  );
}
