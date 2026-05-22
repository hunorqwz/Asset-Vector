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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsla(var(--matrix)/0.04),transparent_60%)] pointer-events-none" />
      <button
        onClick={openSearch}
        aria-label="Add asset to watchlist"
        className="w-16 h-16 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center mb-6 transition-all active:scale-95 relative z-10"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white opacity-80">
          <path d="M12 5v14m-7-7h14"/>
        </svg>
      </button>
      <h3 className="text-lg font-display font-bold text-white mb-2 relative z-10">No Assets Tracked</h3>
      <p className="text-[13px] font-medium text-zinc-500 text-center max-w-sm leading-relaxed relative z-10">
        Your watchlist is empty.<br />Click the + button or use the search bar above to start tracking performance.
      </p>
    </div>
  );
}
