"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import { PriceAlert, createAlert, deleteAlert, dismissAlert } from "@/app/actions/alerts";

interface AlertManagerProps {
  initialAlerts: PriceAlert[];
  watchlistTickers: string[];
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

// ── Single Alert Row ─────────────────────────────────────────────────────
function AlertRow({
  alert,
  onDelete,
  onDismiss,
  isPending,
}: {
  alert: PriceAlert;
  onDelete: (id: string) => void;
  onDismiss: (id: string) => void;
  isPending: boolean;
}) {
  const isAbove = alert.direction === "above";
  const color = alert.isTriggered
    ? "border-bull/30 bg-bull/5"
    : isAbove
    ? "border-white/10 bg-black/40"
    : "border-white/10 bg-black/40";

  return (
    <div className={`border ${color} p-4 flex items-start gap-4 group transition-all`}>
      {/* Direction indicator */}
      <div className="shrink-0 pt-0.5">
        <div className={`w-6 h-6 flex items-center justify-center border ${
          alert.isTriggered
            ? "border-bull/50 bg-bull/10 text-bull"
            : isAbove
            ? "border-white/20 bg-white/5 text-white"
            : "border-white/20 bg-white/5 text-white"
        }`}>
          {alert.isTriggered ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : isAbove ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[12px] font-bold font-mono text-white uppercase tracking-tight">{alert.ticker}</span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${
            alert.isTriggered
              ? "bg-bull/20 text-bull"
              : "bg-white/5 text-zinc-500"
          }`}>
            {alert.isTriggered ? "TRIGGERED" : isAbove ? "ABOVE" : "BELOW"}
          </span>
        </div>
        <p className={`text-[13px] font-mono font-bold tabular-nums ${alert.isTriggered ? "text-bull" : "text-zinc-300"}`}>
          ${fmt(alert.targetPrice)}
        </p>
        {alert.isTriggered && alert.triggeredPrice !== null && (
          <p className="text-[10px] text-zinc-500 font-mono mt-1">
            Triggered at ${fmt(alert.triggeredPrice)} · {formatDate(alert.triggeredAt)}
          </p>
        )}
        {!alert.isTriggered && (
          <p className="text-[10px] text-zinc-600 font-mono mt-1">
            Created {formatDate(alert.createdAt)}
          </p>
        )}
        {alert.note && (
          <p className="text-[10px] text-zinc-500 mt-1 italic truncate">{alert.note}</p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {alert.isTriggered && (
          <button
            onClick={() => onDismiss(alert.id)}
            disabled={isPending}
            title="Dismiss alert"
            className="p-1.5 text-zinc-500 hover:text-bull hover:bg-bull/10 transition-colors disabled:opacity-40"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          disabled={isPending}
          title="Delete alert"
          className="p-1.5 text-zinc-600 hover:text-bear hover:bg-bear/10 transition-colors disabled:opacity-40"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export function AlertManager({ initialAlerts, watchlistTickers }: AlertManagerProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(initialAlerts);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [ticker, setTicker] = useState(watchlistTickers[0] ?? "");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [note, setNote] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const triggered = alerts.filter(a => a.isTriggered);
  const active = alerts.filter(a => !a.isTriggered);

  const handleCreate = () => {
    const price = parseFloat(targetPrice);
    if (!ticker || isNaN(price) || price <= 0) {
      setCreateError("Enter a valid ticker and price.");
      return;
    }
    setCreateError(null);
    startTransition(async () => {
      const result = await createAlert(ticker.toUpperCase(), price, direction, note || undefined);
      if (result.success) {
        const newAlert: PriceAlert = {
          id: crypto.randomUUID(),
          ticker: ticker.toUpperCase(),
          targetPrice: price,
          direction,
          note: note || null,
          isTriggered: false,
          triggeredAt: null,
          triggeredPrice: null,
          createdAt: new Date(),
        };
        setAlerts(prev => [newAlert, ...prev]);
        setTargetPrice("");
        setNote("");
        setCreateSuccess(true);
        setTimeout(() => setCreateSuccess(false), 2500);
      } else {
        if (result.error === "LIMIT_REACHED") setCreateError("Alert limit (20) reached.");
        else setCreateError("Failed to create alert.");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteAlert(id);
      if (result.success) setAlerts(prev => prev.filter(a => a.id !== id));
    });
  };

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      const result = await dismissAlert(id);
      if (result.success) setAlerts(prev => prev.filter(a => a.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-1 h-4 bg-white" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white">Price Alerts</h2>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">
          {active.length} ACTIVE · {triggered.length} TRIGGERED
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Create Form ── */}
        <div className="border border-white/10 bg-[#0a0a0a] overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Create Alert
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Ticker */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
                Ticker
              </label>
              {watchlistTickers.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {watchlistTickers.map(t => (
                    <button
                      key={t}
                      onClick={() => setTicker(t)}
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-widest border transition-colors ${
                        ticker === t
                          ? "border-white/50 bg-white/10 text-white"
                          : "border-white/10 bg-transparent text-zinc-500 hover:text-white hover:border-white/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  className="w-full bg-black border border-white/10 px-3 py-2 text-[13px] font-mono text-white focus:outline-none focus:border-white/40 uppercase"
                />
              )}
              {watchlistTickers.length > 0 && (
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="Or type a custom ticker"
                  className="mt-2 w-full bg-black border border-white/5 px-3 py-2 text-[11px] font-mono text-zinc-400 focus:outline-none focus:border-white/30 uppercase placeholder:normal-case"
                />
              )}
            </div>

            {/* Direction */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
                Condition
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["above", "below"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`py-2.5 text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                      direction === d
                        ? d === "above"
                          ? "border-bull/50 bg-bull/10 text-bull"
                          : "border-bear/50 bg-bear/10 text-bear"
                        : "border-white/10 bg-transparent text-zinc-500 hover:text-white"
                    }`}
                  >
                    {d === "above" ? "↑ Crosses Above" : "↓ Crosses Below"}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Price */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
                Target Price (USD)
              </label>
              <input
                type="number"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                placeholder="e.g. 200.00"
                min="0.01"
                step="0.01"
                className="w-full bg-black border border-white/10 px-3 py-2.5 text-[14px] font-mono font-bold text-white focus:outline-none focus:border-white/40 tabular-nums"
              />
            </div>

            {/* Optional Note */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Support level retest"
                maxLength={100}
                className="w-full bg-black border border-white/5 px-3 py-2 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-white/30 placeholder:text-zinc-700"
              />
            </div>

            {createError && (
              <p className="text-[10px] font-bold text-bear uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-bear" />
                {createError}
              </p>
            )}

            <button
              onClick={handleCreate}
              disabled={isPending}
              className={`w-full py-3 text-[11px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                createSuccess
                  ? "border-bull/50 bg-bull/10 text-bull"
                  : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40"
              } disabled:opacity-40`}
            >
              {isPending ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : createSuccess ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Alert Set
                </>
              ) : (
                "Set Alert"
              )}
            </button>

            <p className="text-[9px] font-mono text-zinc-700 leading-relaxed">
              Alerts are checked each time market data is refreshed. Up to 20 active alerts per account.
            </p>
          </div>
        </div>

        {/* ── Alert List ── */}
        <div className="border border-white/10 bg-[#0a0a0a] overflow-hidden flex flex-col">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Active &amp; Triggered
            </h3>
          </div>

          {alerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">No alerts set</p>
              <p className="text-[10px] text-zinc-700 mt-1">Create an alert to get notified when a price target is reached.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {/* Triggered first */}
              {triggered.map(a => (
                <AlertRow key={a.id} alert={a} onDelete={handleDelete} onDismiss={handleDismiss} isPending={isPending} />
              ))}
              {/* Then active */}
              {active.map(a => (
                <AlertRow key={a.id} alert={a} onDelete={handleDelete} onDismiss={handleDismiss} isPending={isPending} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
