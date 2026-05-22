"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface CompareTickerManagerProps {
  currentTickers: string[];
}

const MAX_TICKERS = 4;

// Preset groups for quick-start
const PRESETS = [
  { label: "Tech Giants", tickers: ["AAPL", "GOOGL", "MSFT"] },
  { label: "Semis", tickers: ["NVDA", "AMD", "INTC"] },
  { label: "Mag 7", tickers: ["AAPL", "MSFT", "NVDA", "GOOGL"] },
  { label: "Big Finance", tickers: ["JPM", "GS", "BAC"] },
];

export function CompareTickerManager({ currentTickers }: CompareTickerManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");

  const navigate = (tickers: string[]) => {
    startTransition(() => {
      const unique = [...new Set(tickers.map(t => t.toUpperCase().trim()))].slice(0, MAX_TICKERS);
      const url = unique.length > 0 ? `/compare?t=${unique.join(",")}` : "/compare";
      router.push(url);
    });
  };

  const handleAdd = () => {
    const val = input.trim().toUpperCase();
    if (!val || val.length > 10) return;
    if (currentTickers.includes(val)) { setInput(""); return; }
    if (currentTickers.length >= MAX_TICKERS) return;
    navigate([...currentTickers, val]);
    setInput("");
  };

  const handleRemove = (ticker: string) => {
    navigate(currentTickers.filter(t => t !== ticker));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") setInput("");
  };

  const handlePreset = (tickers: string[]) => {
    navigate(tickers);
  };

  return (
    <div className="glass-card p-6 space-y-5 rounded-xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      {/* Ticker Chips + Input */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Active tickers */}
        {currentTickers.map(ticker => (
          <div
            key={ticker}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/[0.03] rounded-lg group hover:border-white/25 hover:bg-white/[0.05] transition-all"
          >
            <span className="text-[12px] font-bold font-mono text-white uppercase tracking-tight">{ticker}</span>
            <button
              onClick={() => handleRemove(ticker)}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              title={`Remove ${ticker}`}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add Input */}
        {currentTickers.length < MAX_TICKERS && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder={currentTickers.length === 0 ? "Add ticker (e.g. AAPL)" : "+ Add ticker"}
              maxLength={10}
              className="bg-black/40 border border-white/10 rounded-lg px-3.5 py-1.5 text-[12px] font-mono text-white focus:outline-none focus:border-matrix/40 focus:ring-1 focus:ring-matrix/30 uppercase placeholder:normal-case placeholder:text-zinc-600 w-48 transition-all"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim() || isPending}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-matrix/10 border border-matrix/30 text-matrix hover:bg-matrix hover:text-black hover:border-matrix transition-all rounded-lg disabled:opacity-30 cursor-pointer"
            >
              {isPending ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : "Add"}
            </button>
          </div>
        )}

        {currentTickers.length >= MAX_TICKERS && (
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-1.5 border border-dashed border-white/5 rounded-lg bg-white/[0.01]">
            Max {MAX_TICKERS} assets reached
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* Preset Quick-Select */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 shrink-0">Quick Select:</span>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.tickers)}
            disabled={isPending}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05] hover:border-white/20 transition-all rounded-md disabled:opacity-40 cursor-pointer"
          >
            {p.label}
          </button>
        ))}
        {currentTickers.length > 0 && (
          <button
            onClick={() => navigate([])}
            disabled={isPending}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-red-950/20 bg-red-950/10 text-zinc-400 hover:text-bear hover:bg-bear/10 hover:border-bear/20 transition-all rounded-md cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Compare up to {MAX_TICKERS} assets · URL is shareable · Press Enter to add
      </p>
    </div>
  );
}
