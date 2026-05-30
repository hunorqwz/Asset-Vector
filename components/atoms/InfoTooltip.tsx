"use client";

import React, { useState } from "react";
import { QUANT_DEEP_DIVES, FUNDAMENTAL_DEEP_DIVES, DeepInsight } from "@/lib/education";
import { useEducation, EducationCategory } from "@/components/providers/EducationProvider";

interface InfoTooltipProps {
  insightKey?: string;
  category?: EducationCategory;
  fallbackText?: string;
}

export function InfoTooltip({ insightKey, category = "QUANT", fallbackText }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { openEducation } = useEducation();

  // Retrieve insight
  let insight: DeepInsight | undefined;
  if (insightKey) {
    insight = category === "QUANT" 
      ? QUANT_DEEP_DIVES[insightKey] 
      : FUNDAMENTAL_DEEP_DIVES[insightKey];
  }

  if (!insight && !fallbackText) return null;

  return (
    <div 
      className="relative inline-block ml-1.5 align-middle select-none z-30"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (insightKey) {
          openEducation(insightKey, category);
        }
      }}
    >
      {/* Tooltip trigger icon */}
      <span className="w-3.5 h-3.5 rounded-full border border-zinc-500 hover:border-matrix text-zinc-500 hover:text-matrix text-[9px] font-black font-mono flex items-center justify-center cursor-help transition-colors select-none hover:bg-matrix/10">
        ?
      </span>

      {/* Glassmorphic Popover */}
      {isOpen && (
        <div className="absolute left-6 bottom-2 w-72 p-4 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-left animate-in fade-in slide-in-from-left-2 duration-200 z-50 text-[11px] leading-relaxed pointer-events-none">
          {insight ? (
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-white text-[12px] flex items-center gap-1.5 uppercase tracking-wide">
                  {insight.title}
                </h4>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">{insight.subtitle}</p>
              </div>

              <p className="text-zinc-300 font-normal">{insight.definition}</p>

              {insight.formula && (
                <div className="p-2 bg-white/[0.02] border border-white/5 rounded font-mono text-[10px] text-matrix break-all leading-tight">
                  <span className="text-[8px] font-bold text-zinc-500 block mb-0.5 uppercase">Formula</span>
                  {insight.formula}
                </div>
              )}

              {insight.lookback && (
                <div className="text-zinc-400">
                  <span className="text-[8px] font-bold text-zinc-500 block uppercase">Lookback Window</span>
                  {insight.lookback}
                </div>
              )}

              <div>
                <span className="text-[8px] font-bold text-zinc-500 block uppercase">Key Takeaway</span>
                <p className="text-zinc-400 font-normal">{insight.keyTakeaway}</p>
              </div>

              {insight.pitfalls && insight.pitfalls.length > 0 && (
                <div>
                  <span className="text-[8px] font-bold text-bear block uppercase">Caution / Pitfalls</span>
                  <ul className="list-disc pl-3 text-zinc-400 space-y-0.5 mt-0.5">
                    {insight.pitfalls.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-300 font-normal">{fallbackText}</p>
          )}

          {/* Legal micro disclaimer */}
          <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
            Click to open interactive calculator
          </div>
        </div>
      )}
    </div>
  );
}
