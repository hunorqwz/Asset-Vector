"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button 
      onClick={() => signOut()}
      className="group relative flex items-center gap-4 px-4 py-2 hover:bg-white/5 transition-colors cursor-crosshair border-l border-white/5"
    >
      <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-bear/40 transition-colors">
        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-bear">N</span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1 group-hover:text-zinc-300">Account</span>
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight group-hover:text-bear transition-colors">Sign Out</span>
      </div>
    </button>
  );
}
