"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { LogoutButton } from "@/components/LogoutButton";

interface GlobalFooterProps {
  source?: string;
  updatedAt?: string | Date | number;
}

export function GlobalFooter({ source, updatedAt }: GlobalFooterProps) {
  const { data: session } = useSession();

  const formattedTime = updatedAt
    ? typeof updatedAt === "string"
      ? updatedAt
      : new Date(updatedAt).toLocaleTimeString()
    : null;

  return (
    <footer className="glass-panel z-[100] h-12 flex items-center justify-between bg-black/40 backdrop-blur-md border-t border-white/5 px-8">
      {/* Left section: Copyright or Context metadata */}
      <div className="flex items-center gap-10">
        <div className="text-zinc-500 text-xs font-medium tracking-wide">
          Asset Vector © {new Date().getFullYear()}
        </div>
        
        {source && (
          <div className="flex items-center gap-2 border-l border-white/10 pl-10">
            <span className="text-xs font-medium text-zinc-500">Source</span>
            <span className="text-xs font-mono font-medium text-zinc-400">{source}</span>
          </div>
        )}

        {formattedTime && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Updated</span>
            <span className="text-xs font-mono font-medium text-zinc-300">{formattedTime}</span>
          </div>
        )}
      </div>

      {/* Right section: Auth & Logout */}
      <div className="flex items-center gap-6 h-full">
        <LogoutButton />
      </div>
    </footer>
  );
}
