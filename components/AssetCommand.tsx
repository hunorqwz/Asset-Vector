"use client";

import React, { useState, useEffect } from "react";
import { Command } from "cmdk";
import { searchAssets, addAsset } from "@/app/actions";

export function AssetCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const fetchResults = async () => {
      setLoading(true);
      const data = await searchAssets(query);
      setResults(data);
      setLoading(false);
    };
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (ticker: string, name: string) => {
    await addAsset(ticker, name);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between h-9 px-4 glass-card rounded-xl hover:border-white/10 group active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-terminal">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <span className="text-[9px] font-bold text-terminal uppercase tracking-[0.2em] group-hover:text-zinc-400 transition-colors">Identify_Target...</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-80 transition-opacity">
            <span className="text-[9px] font-mono text-terminal tracking-tighter">CMD</span>
            <span className="text-[9px] font-mono text-terminal tracking-tighter">K</span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xl flex items-start justify-center pt-[15vh] p-4" onClick={() => setOpen(false)}>
           <div 
             className="w-full max-w-lg bg-zinc-950/90 border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden"
             onClick={(e) => e.stopPropagation()}
           >
             <Command className="w-full">
               <div className="flex items-center border-b border-white/5 px-4 h-12">
                  <Command.Input 
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search by ticker or company name..."
                    className="flex-1 bg-transparent text-[11px] text-white focus:outline-none font-medium uppercase tracking-[0.1em] h-full"
                  />
                  {loading && <div className="w-3 h-3 border-2 border-white/10 border-t-matrix rounded-full animate-spin"></div>}
               </div>
               
               <Command.List className="max-h-[350px] overflow-y-auto p-1.5 scrollbar-hide">
                 <Command.Empty className="py-10 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
                    No vectors identified
                 </Command.Empty>
                 
                 {results.map((item) => (
                   <Command.Item
                     key={item.ticker}
                     value={item.ticker}
                     onSelect={() => handleSelect(item.ticker, item.name)}
                     className="flex cursor-pointer select-none items-center rounded-xl px-4 py-2.5 outline-none data-[selected=true]:bg-white/5 data-[selected=true]:glow-matrix group transition-all"
                   >
                     <div className="flex flex-col flex-1">
                        <span className="font-bold text-xs tracking-tight text-zinc-200 group-data-[selected=true]:text-white transition-colors">{item.ticker}</span>
                        <span className="text-[9px] font-medium text-zinc-500 truncate uppercase tracking-widest">{item.name}</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-[8px] font-mono text-zinc-600 bg-white/5 px-2 py-0.5 rounded border border-white/5 group-data-[selected=true]:border-matrix/20 group-data-[selected=true]:text-zinc-400">{item.exch}</span>
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-transparent group-data-[selected=true]:bg-matrix/10 transition-colors">
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-transparent group-data-[selected=true]:text-matrix">
                               <path d="M5 12l5 5L20 7" />
                           </svg>
                        </div>
                     </div>
                   </Command.Item>
                 ))}
               </Command.List>
               
               <div className="flex items-center justify-between px-4 h-8 bg-white/5 border-t border-white/5 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                  <span>Surgical Wealth Intelligence Node</span>
                  <div className="flex gap-3">
                     <span>Enter to Select</span>
                     <span>Esc to Close</span>
                  </div>
               </div>
             </Command>
           </div>
        </div>
      )}

    </>
  );
}
