"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { searchAssets, addAsset, removeAsset } from "@/app/actions";

interface SearchResult { ticker: string; name: string; exch: string; type: string; }

interface AssetCommandProps {
  /** When true, the palette opens immediately on mount (e.g. triggered by empty state) */
  autoOpen?: boolean;
}

export function AssetCommand({ autoOpen = false }: AssetCommandProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  // Global keyboard shortcuts: ⌘K to toggle, Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2 || query.startsWith("/")) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      setResults(await searchAssets(query));
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  const onSelect = async (ticker: string, name: string) => {
    await addAsset(ticker, name);
    close();
  };

  const onCommand = async (q: string) => {
    const [cmd, arg] = q.split(" ");
    if (cmd === "/remove" && arg) await removeAsset(arg.toUpperCase());
    close();
  };

  const commandPalette = open ? (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[14vh] p-4 animate-in fade-in duration-150"
      onClick={close}
    >
      <div
        className="w-full max-w-xl bg-[#0a0a0a] border border-white/20 shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full" label="Asset search" shouldFilter={false}>
          {/* Search input row */}
          <div className="flex items-center border-b border-white/8 px-4 h-14 gap-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-500 shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => e.key === "Enter" && query.startsWith("/") && onCommand(query)}
              placeholder="Search tickers or type '/' for commands..."
              className="flex-1 bg-transparent text-[14px] text-white focus:outline-none font-medium h-full placeholder:text-zinc-600"
              autoFocus
            />
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-white/10 border-t-zinc-400 rounded-full animate-spin shrink-0" />
            )}
            <button
              onClick={close}
              className="ml-1 px-2.5 py-1 text-[11px] font-bold font-mono text-zinc-500 border border-white/15 hover:text-white hover:border-white/30 transition-all"
            >
              ESC
            </button>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2 scrollbar-hide">
            <Command.Empty className="py-20 text-center">
              <div className="text-[12px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                {query.startsWith("/") ? "Command Not Found" : "No Assets Found"}
              </div>
              <div className="text-[11px] text-zinc-600 font-medium max-w-[260px] mx-auto leading-relaxed">
                {query.startsWith("/")
                  ? "Type /remove [TICKER] to remove an asset from your watchlist."
                  : "Try a valid ticker symbol like NVDA, AAPL, or BTC-USD."}
              </div>
            </Command.Empty>

            {/* CLI commands */}
            {query.startsWith("/") && (
              <div className="p-1">
                <div className="px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Commands</div>
                <Command.Item
                  onSelect={() => setQuery("/remove ")}
                  className="flex cursor-pointer select-none items-center px-4 py-3.5 outline-none data-[selected=true]:bg-white/8 transition-all text-[12px] font-mono font-bold text-zinc-300 border border-transparent data-[selected=true]:border-white/15 rounded-sm"
                >
                  <span className="text-white mr-3 bg-white/10 px-2 py-0.5 border border-white/20 text-[11px]">/remove</span>
                  <span className="text-zinc-500">[TICKER]</span>
                  <span className="ml-auto text-zinc-600 text-[10px] font-sans font-bold uppercase tracking-widest">Remove from watchlist</span>
                </Command.Item>
              </div>
            )}

            {/* Search results */}
            {results.length > 0 && (
              <div className="p-1">
                <div className="px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Results</div>
                {results.map((item) => (
                  <Command.Item
                    key={item.ticker}
                    value={item.ticker}
                    onSelect={() => onSelect(item.ticker, item.name)}
                    className="flex cursor-pointer select-none items-center px-4 py-3.5 outline-none data-[selected=true]:bg-white/8 group transition-all border border-transparent data-[selected=true]:border-white/15 mb-0.5 rounded-sm"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-bold text-[14px] tracking-tight text-zinc-100 group-data-[selected=true]:text-white transition-colors">{item.ticker}</span>
                      <span className="text-[11px] font-bold text-zinc-500 truncate tracking-wide uppercase mt-0.5">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-[10px] font-bold font-mono text-zinc-600 border border-white/15 px-2 py-0.5 group-data-[selected=true]:border-white/30 group-data-[selected=true]:text-zinc-300 transition-all">{item.exch}</span>
                      <span className="text-[10px] font-bold font-mono text-zinc-600 border border-white/15 px-2 py-0.5 group-data-[selected=true]:border-white/30 group-data-[selected=true]:text-zinc-300 transition-all">{item.type}</span>
                      <div className="w-7 h-7 flex items-center justify-center border border-transparent group-data-[selected=true]:border-matrix/40 group-data-[selected=true]:bg-matrix/10 transition-all">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-transparent group-data-[selected=true]:text-matrix transition-colors">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </div>
                    </div>
                  </Command.Item>
                ))}
              </div>
            )}
          </Command.List>

          {/* Footer hints */}
          <div className="flex items-center justify-between px-5 h-9 bg-white/[0.02] border-t border-white/5 text-[10px] font-mono text-zinc-600">
            <span>Asset Vector v1.0</span>
            <div className="flex gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Add to watchlist</span>
              <span>ESC Close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Trigger button — fills its container width */}
      <button
        id="asset-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open asset search (⌘K)"
        className="w-full flex items-center justify-between h-10 px-4 bg-[#0a0a0a] border border-white/8 hover:border-white/25 group active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <span className="text-[12px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase tracking-[0.12em] whitespace-nowrap">
            Search assets or tickers...
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-80 transition-all" aria-hidden="true">
          <div className="px-1.5 py-0.5 border border-white/20 text-[10px] font-mono text-zinc-400">⌘</div>
          <div className="px-1.5 py-0.5 border border-white/20 text-[10px] font-mono text-zinc-400">K</div>
        </div>
      </button>

      {mounted && commandPalette && createPortal(commandPalette, document.body)}
    </>
  );
}
