"use client";

/**
 * Empty watchlist state.
 * Clicking the + button programmatically triggers the header's search bar
 * (id="asset-search-trigger") — no duplication of the search component.
 */
export function EmptyWatchlist() {
  const openSearch = () => {
    const trigger = document.getElementById("asset-search-trigger");
    trigger?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 glass-card border border-white/10 relative overflow-hidden h-full min-h-[400px]">
      <button
        onClick={openSearch}
        aria-label="Add asset to watchlist"
        className="w-16 h-16 rounded-full border border-matrix/40 bg-matrix/10 hover:bg-matrix/20 hover:border-matrix/70 flex items-center justify-center mb-6 transition-all active:scale-95"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-matrix opacity-80">
          <path d="M12 5v14m-7-7h14"/>
        </svg>
      </button>
      <h3 className="text-lg font-bold text-white uppercase tracking-tightest mb-2">No Assets Tracked</h3>
      <p className="text-[11px] font-bold text-zinc-500 tracking-widest uppercase text-center max-w-sm leading-relaxed">
        Your watchlist is empty.<br />Click <span className="text-matrix">+</span> or use the search bar above to add assets.
      </p>
    </div>
  );
}
