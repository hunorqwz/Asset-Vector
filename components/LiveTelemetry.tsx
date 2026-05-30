"use client";

import React from "react";

export function Tooltip({ 
  children, 
  content, 
  position = "top" 
}: { 
  children: React.ReactNode; 
  content: string;
  position?: "top" | "bottom";
}) {
  const posClass = position === "top" 
    ? "bottom-full mb-3 left-1/2 -translate-x-1/2" 
    : "top-full mt-3 right-0";

  return (
    <div className="relative group flex items-center">
      {children}
      <div className={`absolute ${posClass} px-3 py-1.5 bg-[#090d16] border border-white/10 rounded-lg text-[10px] font-mono text-zinc-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[150] shadow-2xl`}>
        {content}
      </div>
    </div>
  );
}
