"use client";

import { useState, useEffect } from "react";

export function LiveLatency() {
  const [latency, setLatency] = useState(0.02);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate between 0.01 and 0.04
      const next = 0.01 + Math.random() * 0.03;
      setLatency(next);
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);
  
  return <span>{latency.toFixed(2)}ms</span>;
}

export function IntegrityBars() {
  const [integrity, setIntegrity] = useState(4); // 4 bars

  useEffect(() => {
    const interval = setInterval(() => {
      // 90% chance to be 4, 10% chance to drop to 3 briefly
      if (Math.random() > 0.9) {
        setIntegrity(3);
        setTimeout(() => setIntegrity(4), 500);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-2" aria-label={`Integrity bars: ${integrity} of 4`}>
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className={`w-2 h-5 rounded-full transition-all duration-300 ${
            i < integrity 
              ? "bg-matrix/80 shadow-[0_0_10px_hsla(var(--matrix)/0.4)]" 
              : "bg-white/10"
          }`} 
        />
      ))}
    </div>
  );
}

export function StealthTooltip({ 
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
    <div className="relative group cursor-crosshair flex items-center">
      {children}
      <div className={`absolute ${posClass} px-3 py-1.5 bg-[#0a0a0a] border border-white/10 rounded-sm text-[10px] font-mono text-zinc-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[150] shadow-xl`}>
        {content}
      </div>
    </div>
  );
}
