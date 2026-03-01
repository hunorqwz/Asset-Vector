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
    <div className="border border-white/10 bg-[#0a0a0a] p-5 space-y-5">
      {/* Ticker Chips + Input */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Active tickers */}
        {currentTickers.map(ticker => (
          <div
            key={ticker}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/20 bg-white/5 group"
          >
            <span className="text-[12px] font-bold font-mono text-white uppercase tracking-tight">{ticker}</span>
            <button
              onClick={() => handleRemove(ticker)}
              className="text-zinc-600 hover:text-white transition-colors"
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
              className="bg-black border border-white/10 px-3 py-1.5 text-[12px] font-mono text-white focus:outline-none focus:border-white/40 uppercase placeholder:normal-case placeholder:text-zinc-600 w-44"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim() || isPending}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-white/15 text-zinc-400 hover:text-white hover:border-white/40 transition-colors disabled:opacity-30"
            >
              {isPending ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : "Add"}
            </button>
          </div>
        )}

        {currentTickers.length >= MAX_TICKERS && (
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            Max {MAX_TICKERS} assets
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* Preset Quick-Select */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 shrink-0">Quick Select:</span>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.tickers)}
            disabled={isPending}
            className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-white/5 text-zinc-500 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
          >
            {p.label}
          </button>
        ))}
        {currentTickers.length > 0 && (
          <button
            onClick={() => navigate([])}
            disabled={isPending}
            className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:text-bear transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <p className="text-[9px] font-mono text-zinc-700">
        Compare up to {MAX_TICKERS} assets · URL is shareable · Press Enter to add
      </p>
    </div>
  );
}
