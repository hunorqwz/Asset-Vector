"use client";
import React, { useState } from 'react';

export function DataSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="relative group bg-[#0a0a0a] border border-white/10">
      <div 
        className="flex items-center justify-between p-4 border-b border-white/10 cursor-pointer hover:bg-[#111111] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-zinc-400">{icon}</span>}
          <h3 className="text-[12px] font-bold text-zinc-300 group-hover:text-white tracking-[0.15em] uppercase transition-colors">{title}</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${isOpen ? 'text-zinc-200' : 'text-zinc-500 opacity-0 group-hover:opacity-100'}`}>
            {isOpen ? 'COLLAPSE' : 'STRUCTURAL ANALYSIS'}
          </span>
          <div className={`w-4 h-4 border border-white/10 flex items-center justify-center transition-all ${isOpen ? 'rotate-180 bg-white/10 border-white/20' : ''}`}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div className="bg-[#111111] border-b border-white/10 p-5 animate-in slide-in-from-top-1 duration-300">
          <div className="flex items-start gap-4 border-l border-zinc-500 pl-4">
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-[0.2em]">Data: {title}</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xl font-medium">
                Our analytical engine applies multi-stage validation to {title.toLowerCase()}. 
                This framework utilizes comparative forensic indexing and volatility-weighted consensus 
                to derive structural insights.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2.5 relative z-10">
        {children}
      </div>
    </section>
  );
}
