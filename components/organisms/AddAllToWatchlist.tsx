"use client";

import { useState } from "react";
import { addAllToWatchlist } from "@/app/actions";

export function AddAllToWatchlist() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleAddAll = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const result = await addAllToWatchlist();
      if (result.success) {
        if (result.addedCount === 0) {
          setStatus({ type: 'info', message: 'All positions already in watchlist' });
        } else {
          setStatus({ 
            type: 'success', 
            message: `${result.addedCount} assets added to watchlist${result.limitReached ? ' (Limit reached)' : ''}` 
          });
        }
      } else {
        if (result.error === "LIMIT_REACHED") {
          setStatus({ type: 'error', message: 'Watchlist limit (12) already reached' });
        } else {
          setStatus({ type: 'error', message: 'Failed to add assets' });
        }
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {status && (
        <div className={`text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-300 ${
          status.type === 'success' ? 'text-matrix' : 
          status.type === 'error' ? 'text-bear' : 'text-zinc-400'
        }`}>
          {status.message}
        </div>
      )}
      <button
        onClick={handleAddAll}
        disabled={loading}
        className="group flex items-center gap-2 px-3 py-1.5 glass-card border border-white/5 hover:border-matrix/30 hover:bg-matrix/5 transition-all disabled:opacity-50"
      >
        {loading ? (
          <div className="w-3 h-3 border border-matrix border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400 group-hover:text-matrix transition-colors">
             <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
             <circle cx="12" cy="12" r="3" />
             <path d="M12 17v2m0 0v2m0-2h2m-2 0H10" />
          </svg>
        )}
        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-white uppercase tracking-widest transition-colors">
          Watch All
        </span>
      </button>
    </div>
  );
}
