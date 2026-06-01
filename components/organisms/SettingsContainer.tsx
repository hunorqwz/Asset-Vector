"use client";

import React, { useState, useEffect, useTransition } from "react";
import { signOut } from "next-auth/react";
import { AlertManager } from "./AlertManager";
import { PriceAlert } from "@/app/actions/alerts";
import { updateUserProfile, deleteUserAccount } from "@/app/actions/settings";

interface SettingsContainerProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    tier: string;
  };
  initialAlerts: PriceAlert[];
  watchlistTickers: string[];
}

export function SettingsContainer({ user, initialAlerts, watchlistTickers }: SettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<"preferences" | "alerts" | "security">("preferences");
  const [isPending, startTransition] = useTransition();

  // Preferences state
  const [currency, setCurrency] = useState("USD");
  const [horizon, setHorizon] = useState("1D");
  const [chartTheme, setChartTheme] = useState("MATRIX");
  const [columnPreset, setColumnPreset] = useState("GENERAL");

  // Account form state
  const [name, setName] = useState(user.name || "");
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCurrency = localStorage.getItem("settings_currency") || "USD";
      const savedHorizon = localStorage.getItem("settings_horizon") || "1D";
      const savedChartTheme = localStorage.getItem("settings_chart_theme") || "MATRIX";
      
      setCurrency(savedCurrency);
      setHorizon(savedHorizon);
      setChartTheme(savedChartTheme);

      // Determine initial column preset based on watchlist_visible_columns
      const savedCols = localStorage.getItem("watchlist_visible_columns");
      if (savedCols) {
        try {
          const parsed = JSON.parse(savedCols);
          if (Array.isArray(parsed)) {
            const colsStr = parsed.slice().sort().join(",");
            if (colsStr === ["sector", "price", "trend", "projection", "forensics"].sort().join(",")) {
              setColumnPreset("GENERAL");
            } else if (colsStr === ["beta", "alpha", "volatility", "forensics"].sort().join(",")) {
              setColumnPreset("RISK");
            } else if (colsStr === ["sector", "price", "quality", "pe", "forensics"].sort().join(",")) {
              setColumnPreset("VALUATION");
            } else if (colsStr === ["synthesis_pillars", "projection", "forensics"].sort().join(",")) {
              setColumnPreset("SYNTHESIS");
            }
          }
        } catch {
          // Fallback to general
        }
      }
    }
  }, []);

  // Handlers for Preferences
  const handleCurrencyChange = (val: string) => {
    setCurrency(val);
    localStorage.setItem("settings_currency", val);
  };

  const handleHorizonChange = (val: string) => {
    setHorizon(val);
    localStorage.setItem("settings_horizon", val);
  };

  const handleChartThemeChange = (val: string) => {
    setChartTheme(val);
    localStorage.setItem("settings_chart_theme", val);
  };

  const handleColumnPresetChange = (preset: string) => {
    setColumnPreset(preset);
    let cols: string[] = [];
    if (preset === "GENERAL") {
      cols = ["sector", "price", "trend", "projection", "forensics"];
    } else if (preset === "RISK") {
      cols = ["beta", "alpha", "volatility", "forensics"];
    } else if (preset === "VALUATION") {
      cols = ["sector", "price", "quality", "pe", "forensics"];
    } else if (preset === "SYNTHESIS") {
      cols = ["synthesis_pillars", "projection", "forensics"];
    }
    localStorage.setItem("watchlist_visible_columns", JSON.stringify(cols));
  };

  // Profile Update handler
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    if (!name.trim()) {
      setProfileMessage({ type: "error", text: "Name cannot be empty." });
      return;
    }

    startTransition(async () => {
      const res = await updateUserProfile(name.trim());
      if (res.success) {
        setProfileMessage({ type: "success", text: "Profile updated successfully." });
        setTimeout(() => setProfileMessage(null), 3000);
      } else {
        setProfileMessage({ type: "error", text: res.error || "Failed to update profile." });
      }
    });
  };

  // Account Deletion handler
  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("Confirmation text must match exactly.");
      return;
    }
    setDeleteError(null);

    startTransition(async () => {
      const res = await deleteUserAccount();
      if (res.success) {
        signOut({ callbackUrl: "/login" });
      } else {
        setDeleteError(res.error || "Failed to delete account.");
      }
    });
  };

  const tabs = [
    { id: "preferences", name: "Preferences", desc: "Customize layouts and visual defaults" },
    { id: "alerts", name: "Price Alerts", desc: "Manage threshold triggers and status" },
    { id: "security", name: "Account Security", desc: "Manage profile settings and authentication" },
  ] as const;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* ── Tabs Sidebar ── */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-1.5">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left px-5 py-4 border rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-zinc-800/40 border-zinc-700 text-white shadow-lg"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20"
              }`}
            >
              <div className="text-[12px] font-bold uppercase tracking-wider mb-0.5">{t.name}</div>
              <div className="text-[10px] text-zinc-600 font-medium leading-normal">{t.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── Content Panel ── */}
      <div className="flex-1 w-full min-w-0">
        {activeTab === "preferences" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-1 h-4 bg-white" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white">Default Preferences</h2>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Currency */}
              <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
                <div>
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Base Currency</h3>
                  <p className="text-[10px] text-zinc-600 mt-1">Select the standard pricing representation across data tables.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["USD", "EUR", "GBP"].map((curr) => {
                    const selected = currency === curr;
                    return (
                      <button
                        key={curr}
                        onClick={() => handleCurrencyChange(curr)}
                        className={`py-3 text-[10px] font-mono font-bold border rounded-lg transition-all ${
                          selected
                            ? "border-matrix/50 bg-matrix/10 text-matrix"
                            : "border-white/10 bg-transparent text-zinc-500 hover:text-white hover:border-white/30"
                        }`}
                      >
                        {curr} {curr === "USD" ? "($)" : curr === "EUR" ? "(€)" : "(£)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forecast Horizon */}
              <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
                <div>
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Forecast Horizon</h3>
                  <p className="text-[10px] text-zinc-600 mt-1">Configure default target prediction windows on the main dashboard.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["4H", "1D", "3D", "1W", "1M"].map((hz) => {
                    const selected = horizon === hz;
                    return (
                      <button
                        key={hz}
                        onClick={() => handleHorizonChange(hz)}
                        className={`px-4 py-2.5 text-[10px] font-mono font-bold border rounded-lg transition-all flex-1 text-center ${
                          selected
                            ? "border-matrix/50 bg-matrix/10 text-matrix"
                            : "border-white/10 bg-transparent text-zinc-500 hover:text-white hover:border-white/30"
                        }`}
                      >
                        {hz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chart Color Theme */}
              <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
                <div>
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Chart Color Theme</h3>
                  <p className="text-[10px] text-zinc-600 mt-1">Select the default palette representation for stock indicators.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "MATRIX", label: "Matrix Cyan", desc: "Brand default HSL color scheme" },
                    { id: "CLASSIC", label: "Classic Green/Red", desc: "Traditional bullish/bearish mapping" },
                    { id: "VOLATILITY", label: "Volatility Gray", desc: "Accentuate technical noise thresholds" },
                    { id: "MONOCHROME", label: "Monochrome Light", desc: "Clean modern minimal contrast" },
                  ].map((t) => {
                    const selected = chartTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleChartThemeChange(t.id)}
                        className={`p-3.5 border rounded-lg transition-all text-left space-y-1 ${
                          selected
                            ? "border-matrix/50 bg-matrix/10"
                            : "border-white/10 bg-transparent hover:border-white/30"
                        }`}
                      >
                        <div className={`text-[10px] font-bold ${selected ? "text-matrix" : "text-zinc-400"}`}>
                          {t.label}
                        </div>
                        <div className="text-[9px] text-zinc-600 leading-normal font-medium">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Watchlist Column Preset */}
              <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
                <div>
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Watchlist Preset</h3>
                  <p className="text-[10px] text-zinc-600 mt-1">Preset layouts for data columns displayed on your Watchlist table.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "GENERAL", label: "General overview", desc: "Price, Sector, Trend, Projection" },
                    { id: "RISK", label: "Risk analytics", desc: "Beta, Alpha, Volatility, Forensics" },
                    { id: "VALUATION", label: "Valuation models", desc: "Quality rating, P/E, Sector, Price" },
                    { id: "SYNTHESIS", label: "Synthesis pillars", desc: "Aggregate score, GARCH source" },
                  ].map((p) => {
                    const selected = columnPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleColumnPresetChange(p.id)}
                        className={`p-3.5 border rounded-lg transition-all text-left space-y-1 ${
                          selected
                            ? "border-matrix/50 bg-matrix/10"
                            : "border-white/10 bg-transparent hover:border-white/30"
                        }`}
                      >
                        <div className={`text-[10px] font-bold ${selected ? "text-matrix" : "text-zinc-400"}`}>
                          {p.label}
                        </div>
                        <div className="text-[9px] text-zinc-600 leading-normal font-medium">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <AlertManager initialAlerts={initialAlerts} watchlistTickers={watchlistTickers} />
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-1 h-4 bg-white" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white">Account Security &amp; Profile</h2>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Edit Profile */}
              <div className="lg:col-span-2 glass-card rounded-xl border border-white/5 p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">User Profile</h3>
                    <p className="text-[10px] text-zinc-600">Update your display username on dashboard insights.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">Email Address</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full bg-zinc-900/50 border border-white/5 px-3.5 py-2.5 text-[11px] font-mono text-zinc-600 rounded-lg cursor-not-allowed"
                      />
                      <span className="text-[9px] font-bold text-matrix uppercase tracking-wider mt-1 block">Institutional Account Verified</span>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">Display Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Anonymous"
                        className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 text-[12px] font-medium text-white rounded-lg focus:outline-none focus:border-matrix/40 focus:ring-1 focus:ring-matrix/30"
                      />
                    </div>
                  </div>

                  {profileMessage && (
                    <div className={`p-3.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 ${
                      profileMessage.type === "success"
                        ? "border-bull/20 bg-bull/5 text-bull"
                        : "border-bear/20 bg-bear/5 text-bear"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${profileMessage.type === "success" ? "bg-bull" : "bg-bear"}`} />
                      {profileMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40 transition-all rounded-lg disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>

              {/* Danger Zone */}
              <div className="glass-card rounded-xl border border-red-500/10 bg-red-500/[0.01] p-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-bear animate-pulse" />
                    <h3 className="text-[11px] font-bold text-bear uppercase tracking-widest">Danger Zone</h3>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Permanently delete your account. This action cannot be undone. All positions, watchlists, and price alerts will be immediately destroyed.
                  </p>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full py-3 text-[10px] font-bold uppercase tracking-widest bg-bear/10 border border-bear/30 text-bear hover:bg-bear/20 hover:border-bear/50 transition-all rounded-lg"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Account Deletion Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-[14px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-bear" />
                Permanent Account Deletion
              </h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                You are about to delete your account. Please be aware that this will permanently remove your watchlists, positions, price alerts, and settings.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
                  Type <span className="text-white font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 text-[12px] font-mono text-white rounded-lg focus:outline-none focus:border-bear/40 focus:ring-1 focus:ring-bear/30 uppercase"
                />
              </div>

              {deleteError && (
                <p className="text-[10px] font-bold text-bear uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-bear" />
                  {deleteError}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                disabled={isPending}
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-all rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isPending || deleteConfirmText !== "DELETE"}
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest bg-bear/20 border border-bear/30 text-bear hover:bg-bear/30 hover:border-bear/50 transition-all rounded-lg disabled:opacity-40"
              >
                {isPending ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
