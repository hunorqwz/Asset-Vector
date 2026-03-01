"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { updatePosition, deletePosition } from "@/app/actions/portfolio";
import { addAsset } from "@/app/actions";

interface PositionRowProps {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  pnl: number | null;
  pnlPct: number | null;
  isWatchlisted?: boolean;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtCurrency(n: number) { return "$" + fmt(n); }

export function PositionRow({ id, ticker, name, shares, avgCost, currentPrice, pnl, pnlPct, isWatchlisted }: PositionRowProps) {
  const [editing, setEditing] = useState(false);
  const [sharesVal, setSharesVal] = useState(shares.toString());
  const [costVal, setCostVal] = useState(avgCost.toString());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingWatch, setAddingWatch] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) sharesRef.current?.focus();
  }, [editing]);

  const handleCancel = () => {
    setSharesVal(shares.toString());
    setCostVal(avgCost.toString());
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    const newShares = parseFloat(sharesVal);
    const newCost = parseFloat(costVal);
    if (isNaN(newShares) || isNaN(newCost) || newShares <= 0 || newCost <= 0) {
      setError("Shares and cost must be positive numbers.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updatePosition(id, newShares, newCost);
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError("Failed to save. Please try again.");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deletePosition(id);
    setDeleting(false);
  };

  const handleAddWatch = async () => {
    if (isWatchlisted || justAdded) return;
    setAddingWatch(true);
    const result = await addAsset(ticker, name);
    setAddingWatch(false);
    if (result.success) {
      setJustAdded(true);
    } else {
      if (result.error === "LIMIT_REACHED") {
        setError("Watchlist limit (12) reached.");
      } else {
        setError("Failed to add to watchlist.");
      }
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  // ─── Edit mode ────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="border-b border-white/5 last:border-0 bg-white/[0.025] animate-in fade-in duration-150">
        <div className="grid grid-cols-12 gap-2 px-6 py-4 items-center">
          <div className="col-span-3">
            <p className="text-[14px] font-bold font-mono text-matrix uppercase tracking-tight">{ticker}</p>
            <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">{name}</p>
          </div>
          <div className="col-span-2 flex justify-end">
            <input
              ref={sharesRef}
              type="number"
              value={sharesVal}
              onChange={(e) => setSharesVal(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0.00000001"
              step="any"
              className="w-full bg-black border border-matrix/50 px-2 py-1.5 text-[13px] text-white font-mono focus:outline-none focus:border-matrix text-right tabular-nums"
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <input
              type="number"
              value={costVal}
              onChange={(e) => setCostVal(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0.00000001"
              step="any"
              className="w-full bg-black border border-matrix/50 px-2 py-1.5 text-[13px] text-white font-mono focus:outline-none focus:border-matrix text-right tabular-nums"
            />
          </div>
          <div className="col-span-2 text-right">
            {currentPrice !== null
              ? <span className="text-[13px] font-mono font-bold text-zinc-500 tabular-nums">{fmtCurrency(currentPrice)}</span>
              : <span className="text-[11px] text-zinc-700 font-mono">N/A</span>
            }
          </div>
          <div className="col-span-2 text-right">
            <span className="text-[11px] text-zinc-600 font-mono">recalculating...</span>
          </div>
          <div className="col-span-1 flex items-center justify-end gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving}
              title="Save (Enter)"
              className="p-1.5 text-matrix hover:bg-matrix/10 border border-matrix/40 transition-colors disabled:opacity-40"
            >
              {saving
                ? <div className="w-3 h-3 border border-matrix border-t-transparent rounded-full animate-spin" />
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
              }
            </button>
            <button
              onClick={handleCancel}
              title="Cancel (Escape)"
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-6 pb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-bear animate-pulse" />
            <span className="text-[10px] font-bold text-bear uppercase tracking-widest">{error}</span>
          </div>
        )}
        <div className="px-6 pb-3">
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">↵ Save · ESC Cancel</span>
        </div>
      </div>
    );
  }

  // ─── Display mode ─────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-12 gap-2 px-6 py-5 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors group">
      <div className="col-span-3">
        <Link href={`/asset/${ticker}`} className="hover:text-matrix transition-colors">
          <p className="text-[14px] font-bold font-mono text-white uppercase tracking-tight">{ticker}</p>
          <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">{name}</p>
        </Link>
      </div>
      <div className="col-span-2 text-right">
        <span className="text-[13px] font-mono font-bold text-zinc-300 tabular-nums">{fmt(shares, 4)}</span>
      </div>
      <div className="col-span-2 text-right">
        <span className="text-[13px] font-mono font-bold text-zinc-400 tabular-nums">{fmtCurrency(avgCost)}</span>
      </div>
      <div className="col-span-2 text-right">
        {currentPrice !== null
          ? <span className="text-[13px] font-mono font-bold text-white tabular-nums">{fmtCurrency(currentPrice)}</span>
          : <span className="text-[11px] text-zinc-600 font-mono">N/A</span>
        }
      </div>
      <div className="col-span-2 text-right">
        {pnl !== null ? (
          <div>
            <p className={`text-[13px] font-mono font-bold tabular-nums ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
              {pnl >= 0 ? "+" : ""}{fmtCurrency(pnl)}
            </p>
            <p className={`text-[10px] font-mono font-bold tabular-nums ${pnl >= 0 ? "text-bull/70" : "text-bear/70"}`}>
              {pnlPct! >= 0 ? "+" : ""}{fmt(pnlPct!)}%
            </p>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-600 font-mono">—</span>
        )}
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1">
        <button
          onClick={() => setEditing(true)}
          title="Edit position"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-matrix p-1.5 hover:bg-matrix/10 rounded-sm"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={handleAddWatch}
          disabled={addingWatch || isWatchlisted || justAdded}
          title={isWatchlisted || justAdded ? "Already in watchlist" : "Add to watchlist"}
          className={`${(isWatchlisted || justAdded) ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-all p-1.5 rounded-sm ${
            isWatchlisted || justAdded
              ? "text-matrix cursor-default"
              : "text-zinc-600 hover:text-matrix hover:bg-matrix/10"
          }`}
        >
          {addingWatch ? (
            <div className="w-3 h-3 border border-matrix border-t-transparent rounded-full animate-spin" />
          ) : isWatchlisted || justAdded ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Remove position"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-bear p-1.5 hover:bg-bear/10 rounded-sm disabled:opacity-30"
        >
          {deleting
            ? <div className="w-3 h-3 border border-bear border-t-transparent rounded-full animate-spin" />
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
          }
        </button>
      </div>
    </div>
  );
}
