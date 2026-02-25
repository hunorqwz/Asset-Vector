"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { searchAssets, addAsset, removeAsset } from "@/app/actions";

interface SearchResult { ticker: string; name: string; exch: string; type: string; }

export function AssetCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure portal only renders on client
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (query.length < 2 || query.startsWith("/")) {
      setResults([]);
      return;
    }
    const f = async () => {
      setLoading(true);
      setResults(await searchAssets(query));
      setLoading(false);
    };
    const t = setTimeout(f, 300);
    return () => clearTimeout(t);
  }, [query]);

  const onSelect = async (ticker: string, name: string) => {
    await addAsset(ticker, name);
    setOpen(false);
    setQuery("");
  };

  const onCommand = async (q: string) => {
    const [cmd, arg] = q.split(" ");
    if (cmd === "/remove" && arg) await removeAsset(arg.toUpperCase());
    setOpen(false);
    setQuery("");
  };

  // The modal overlay — rendered via portal to escape header's overflow:hidden
  const commandPalette = open ? (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 flex items-start justify-center pt-[15vh] p-4" 
      onClick={() => setOpen(false)}
    >
      <div 
        className="w-full max-w-lg bg-[#0a0a0a] border border-white/20 shadow-none overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Command className="w-full" label="Asset search command palette" shouldFilter={false}>
          <div className="flex items-center border-b border-white/5 px-4 h-12">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-500 mr-3 shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <Command.Input 
              value={query} 
              onValueChange={setQuery} 
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && query.startsWith("/") && onCommand(query)} 
              placeholder="Search tickers or type '/' for CLI..." 
              className="flex-1 bg-transparent text-sm text-white focus:outline-none font-medium h-full placeholder:text-zinc-600" 
              autoFocus
            />
            {loading && <div className="w-3 h-3 border-2 border-white/10 border-t-white rounded-full animate-spin ml-2" aria-label="Loading" />}
            <button 
              onClick={() => setOpen(false)}
              className="ml-4 px-2 py-1 text-[11px] font-bold font-mono text-zinc-500 bg-transparent border border-white/20 hover:text-white hover:bg-white/10 transition-all shadow-none"
            >
              ESC
            </button>
          </div>
          <Command.List className="max-h-[350px] overflow-y-auto p-1.5 scrollbar-hide">
            <Command.Empty className="py-20 text-center">
              <div className="text-[13px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                {query.startsWith('/') ? 'Protocol Command Unknown' : 'No Assets Found'}
              </div>
              <div className="text-[11px] text-zinc-600 font-medium max-w-[240px] mx-auto leading-relaxed">
                {query.startsWith('/') ? 'Use /remove [TICKER] to purge assets from secure watchlist.' : 'Input a valid ticker symbol (e.g. NVDA, BTC) to initialize tracking.'}
              </div>
            </Command.Empty>
            {query.startsWith("/") && (
              <div className="p-2">
                <span className="text-[11px] font-bold text-white px-4 py-2 mt-2 block tracking-[0.2em] uppercase">System Commands</span>
                <Command.Item onSelect={() => setQuery("/remove ")} className="flex cursor-pointer select-none items-center px-5 py-4 outline-none data-[selected=true]:bg-white/10 transition-all text-[12px] font-mono font-bold text-zinc-300 border border-transparent data-[selected=true]:border-white/20">
                  <span className="text-white mr-4 bg-white/10 px-2 py-0.5 border border-white/20">/remove</span> <span className="text-zinc-500">[TICKER]</span> <span className="ml-auto text-zinc-600 text-[10px] font-sans font-bold uppercase tracking-widest">Purge Protocol</span>
                </Command.Item>
              </div>
            )}
            {results.map(item => (
              <Command.Item key={item.ticker} value={item.ticker} onSelect={() => onSelect(item.ticker, item.name)} className="flex cursor-pointer select-none items-center px-5 py-4 outline-none data-[selected=true]:bg-white/10 group transition-all border border-transparent data-[selected=true]:border-white/20 mb-1">
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-[14px] tracking-tight text-zinc-100 group-data-[selected=true]:text-white transition-colors">{item.ticker}</span>
                  <span className="text-[11px] font-bold text-zinc-500 truncate tracking-wide uppercase mt-0.5">{item.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[11px] font-bold font-mono text-zinc-600 bg-transparent px-3 py-1 border border-white/20 group-data-[selected=true]:border-white/40 group-data-[selected=true]:text-white transition-all">{item.exch}</span>
                  <div className="w-8 h-8 flex items-center justify-center bg-transparent transition-all border border-transparent group-data-[selected=true]:border-white/20 group-data-[selected=true]:bg-white/10">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-transparent group-data-[selected=true]:text-white">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.List>
          <div className="flex items-center justify-between px-4 h-8 bg-white/3 border-t border-white/5 text-[9px] font-mono text-zinc-600">
            <span>Vector v1.0</span>
            <div className="flex gap-3"><span>↵ Select</span><span>ESC Close</span></div>
          </div>
        </Command>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        aria-label="Open command palette"
        className="w-full flex items-center justify-between h-10 px-5 glass-card hover:border-white/30 group active:scale-[0.98] transition-all bg-[#0a0a0a]"
      >
        <div className="flex items-center gap-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-500 group-hover:text-white transition-colors" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <span className="text-[12px] font-bold text-zinc-500 group-hover:text-white transition-colors uppercase tracking-[0.15em]">Surgical Search...</span>
        </div>
        <div className="flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-all font-bold" aria-hidden="true">
          <div className="px-2 py-0.5 border border-white/20 text-[11px] font-mono text-zinc-400 group-hover:text-white group-hover:border-white/40 transition-all">⌘</div>
          <div className="px-2 py-0.5 border border-white/20 text-[11px] font-mono text-zinc-400 group-hover:text-white group-hover:border-white/40 transition-all">K</div>
        </div>
      </button>

      {/* Render the command palette via Portal to escape header's overflow:hidden */}
      {mounted && commandPalette && createPortal(commandPalette, document.body)}
    </>
  );
}
