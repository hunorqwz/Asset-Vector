"use client";
import { useState } from "react";
import { addPosition } from "@/app/actions/portfolio";

interface AddPositionFormProps {
  onSuccess?: () => void;
}

export function AddPositionForm({ onSuccess }: AddPositionFormProps) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("ticker", ticker);
    formData.set("name", name || ticker);
    formData.set("shares", shares);
    formData.set("avgCost", avgCost);

    const result = await addPosition(formData);
    setLoading(false);

    if (result.success) {
      setTicker("");
      setName("");
      setShares("");
      setAvgCost("");
      onSuccess?.();
    } else {
      setError(result.error === "INVALID_INPUT" ? "Please fill in all fields correctly." : "Failed to add position.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Ticker</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
            placeholder="NVDA"
            className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all uppercase"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Company Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nvidia Corp"
            className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Shares</label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            required
            min="0.00000001"
            step="any"
            placeholder="100"
            className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Avg Cost (USD)</label>
          <input
            type="number"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            required
            min="0.00000001"
            step="any"
            placeholder="165.00"
            className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-bear/5 border border-bear/20 px-4 py-3 animate-in fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-bear animate-pulse" />
          <span className="text-[11px] font-bold text-bear uppercase tracking-widest">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="relative py-3 bg-matrix text-black font-black uppercase text-[12px] tracking-[0.3em] overflow-hidden group hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-crosshair"
      >
        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <span className="relative">{loading ? "Adding..." : "Add Position"}</span>
      </button>
    </form>
  );
}
