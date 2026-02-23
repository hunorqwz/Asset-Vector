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
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xl flex items-start justify-center pt-[15vh] p-4" 
      onClick={() => setOpen(false)}
    >
      <div 
        className="w-full max-w-lg bg-zinc-950/95 border border-white/10 shadow-[0_0_80px_-12px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Command className="w-full" label="Asset search command palette">
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
            {loading && <div className="w-3 h-3 border-2 border-white/10 border-t-matrix rounded-full animate-spin ml-2" aria-label="Loading" />}
            <button 
              onClick={() => setOpen(false)}
              className="ml-3 px-1.5 py-0.5 text-[9px] font-mono text-zinc-600 bg-white/5 rounded border border-white/8 hover:text-zinc-400 transition-colors"
            >
              ESC
            </button>
          </div>
          <Command.List className="max-h-[350px] overflow-y-auto p-1.5 scrollbar-hide">
            <Command.Empty className="py-12 text-center">
              <div className="text-[11px] font-medium text-zinc-500 mb-1">
                {query.startsWith('/') ? 'Unknown command' : 'No results found'}
              </div>
              <div className="text-[10px] text-zinc-700">
                {query.startsWith('/') ? 'Try /remove [TICKER]' : 'Try searching for a ticker symbol like AAPL or NVDA'}
              </div>
            </Command.Empty>
            {query.startsWith("/") && (
              <div className="p-2">
                <span className="text-[10px] font-semibold text-matrix px-2 py-1 mb-2 block tracking-wide">Commands</span>
                <Command.Item onSelect={() => setQuery("/remove ")} className="flex cursor-pointer select-none items-center rounded-xl px-4 py-2.5 outline-none data-[selected=true]:bg-white/5 transition-all text-[11px] font-mono text-zinc-300">
                  <span className="text-matrix mr-3">/remove</span> <span className="opacity-40">[TICKER] — Remove asset</span>
                </Command.Item>
              </div>
            )}
            {results.map(item => (
              <Command.Item key={item.ticker} value={item.ticker} onSelect={() => onSelect(item.ticker, item.name)} className="flex cursor-pointer select-none items-center rounded-xl px-4 py-2.5 outline-none data-[selected=true]:bg-white/5 group transition-all">
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-xs tracking-tight text-zinc-200 group-data-[selected=true]:text-white transition-colors">{item.ticker}</span>
                  <span className="text-[9px] font-medium text-zinc-500 truncate tracking-wide">{item.name}</span>
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
        className="w-full flex items-center justify-between h-9 px-4 glass-card rounded-xl hover:border-white/10 group active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-terminal" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">Search assets...</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-80 transition-opacity" aria-hidden="true">
          <span className="text-[10px] font-mono text-zinc-600">⌘</span>
          <span className="text-[10px] font-mono text-zinc-600">K</span>
        </div>
      </button>

      {/* Render the command palette via Portal to escape header's overflow:hidden */}
      {mounted && commandPalette && createPortal(commandPalette, document.body)}
    </>
  );
}
