"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEducation, EducationCategory } from "@/components/providers/EducationProvider";
import { QUANT_DEEP_DIVES, FUNDAMENTAL_DEEP_DIVES, DeepInsight } from "@/lib/education";
import { fmtBigNum } from "@/lib/format";

// Pre-generated noisy price sequence for Kalman simulator (constant wave)
const KALMAN_NOISY_BASE = Array.from({ length: 60 }, (_, i) => {
  const angle = (i / 60) * Math.PI * 4;
  const trend = i * 0.15;
  const basePrice = 100 + Math.sin(angle) * 15 + trend;
  // Deterministic noise to prevent flashing on render
  const noise = Math.sin(i * 1.5) * 4 + Math.cos(i * 3) * 2;
  return basePrice + noise;
});

export function EducationDrawer() {
  const { isOpen, activeKey, activeCategory, closeEducation } = useEducation();
  const [activeTab, setActiveTab] = useState<"DEEP_DIVE" | "TRADER" | "INVESTOR">("DEEP_DIVE");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Simulators State
  const [kalmanQ, setKalmanQ] = useState(0.01);
  const [kalmanR, setKalmanR] = useState(0.5);
  const [mcDrift, setMcDrift] = useState(0.1);
  const [mcVol, setMcVol] = useState(0.25);
  const [dcfGrowth, setDcfGrowth] = useState(0.08);
  const [dcfDiscount, setDcfDiscount] = useState(0.1);
  const [betaCov, setBetaCov] = useState(0.024);
  const [betaMktVar, setBetaMktVar] = useState(0.016);

  const kalmanCanvasRef = useRef<HTMLCanvasElement>(null);
  const mcCanvasRef = useRef<HTMLCanvasElement>(null);

  // Retrieve glossary data
  let insight: DeepInsight | undefined;
  if (activeKey) {
    insight = activeCategory === "QUANT"
      ? QUANT_DEEP_DIVES[activeKey]
      : FUNDAMENTAL_DEEP_DIVES[activeKey];
  }

  // Reset tab and fullscreen when active node shifts
  useEffect(() => {
    setActiveTab("DEEP_DIVE");
    setIsFullscreen(false);
  }, [activeKey]);

  // Kalman Simulator Canvas Redraw
  useEffect(() => {
    if (activeKey !== "KALMAN_EQUILIBRIUM" || !isOpen || !kalmanCanvasRef.current) return;
    const canvas = kalmanCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Run 1D Kalman Filter over constant sequence
    const smoothed: number[] = [];
    let x = KALMAN_NOISY_BASE[0];
    let P = 1.0;
    KALMAN_NOISY_BASE.forEach((price) => {
      P = P + kalmanQ;
      const K = P / (P + kalmanR);
      x = x + K * (price - x);
      P = (1 - K) * P;
      smoothed.push(x);
    });

    // Clear and draw grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * canvas.height;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      const xGrid = (i / 4) * canvas.width;
      ctx.beginPath(); ctx.moveTo(xGrid, 0); ctx.lineTo(xGrid, canvas.height); ctx.stroke();
    }

    const min = Math.min(...KALMAN_NOISY_BASE) - 2;
    const max = Math.max(...KALMAN_NOISY_BASE) + 2;
    const range = max - min || 1;

    const getX = (idx: number) => (idx / (KALMAN_NOISY_BASE.length - 1)) * canvas.width;
    const getY = (val: number) => canvas.height - ((val - min) / range) * canvas.height;

    // Draw Raw Noisy
    ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(KALMAN_NOISY_BASE[0]));
    for (let i = 1; i < KALMAN_NOISY_BASE.length; i++) {
      ctx.lineTo(getX(i), getY(KALMAN_NOISY_BASE[i]));
    }
    ctx.stroke();

    // Draw Kalman Filtered
    ctx.strokeStyle = "#10B981"; // Emerald green
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(smoothed[0]));
    for (let i = 1; i < smoothed.length; i++) {
      ctx.lineTo(getX(i), getY(smoothed[i]));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [activeKey, isOpen, kalmanQ, kalmanR, isFullscreen]);

  // Monte Carlo Simulator Canvas Redraw
  useEffect(() => {
    if (activeKey !== "MONTE_CARLO" || !isOpen || !mcCanvasRef.current) return;
    const canvas = mcCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate deterministic seed paths based on drift/vol to prevent screen flickering
    const dt = 1 / 252;
    const startPrice = 100;
    const days = 30;
    const pathsCount = 15;
    const paths: number[][] = [];

    for (let p = 0; p < pathsCount; p++) {
      const path = [startPrice];
      let price = startPrice;
      for (let d = 0; d < days; d++) {
        // Deterministic pseudo-random number generation based on path index
        const u1 = Math.abs(Math.sin(p * 12.3 + d * 45.6));
        const u2 = Math.abs(Math.cos(p * 78.9 + d * 12.3));
        const z = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);

        const change = Math.exp((mcDrift - 0.5 * mcVol * mcVol) * dt + mcVol * Math.sqrt(dt) * z);
        price = price * change;
        path.push(price);
      }
      paths.push(path);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * canvas.height;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      const xGrid = (i / 4) * canvas.width;
      ctx.beginPath(); ctx.moveTo(xGrid, 0); ctx.lineTo(xGrid, canvas.height); ctx.stroke();
    }

    const allPrices = paths.flat();
    const min = Math.min(...allPrices) * 0.98;
    const max = Math.max(...allPrices) * 1.02;
    const range = max - min || 1;

    const getX = (dIndex: number) => (dIndex / days) * canvas.width;
    const getY = (val: number) => canvas.height - ((val - min) / range) * canvas.height;

    // Draw background paths
    ctx.lineWidth = 1;
    paths.forEach((path, idx) => {
      ctx.strokeStyle = idx === 0 ? "rgba(139, 92, 246, 0.7)" : "rgba(255,255,255,0.07)";
      if (idx === 0) ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(path[0]));
      for (let d = 1; d <= days; d++) {
        ctx.lineTo(getX(d), getY(path[d]));
      }
      ctx.stroke();
      if (idx === 0) ctx.lineWidth = 1;
    });

    // Draw p10 / p90 bounds
    const p10: number[] = [];
    const p90: number[] = [];
    for (let d = 0; d <= days; d++) {
      const sorted = paths.map(p => p[d]).sort((a, b) => a - b);
      p10.push(sorted[Math.floor(pathsCount * 0.1)]);
      p90.push(sorted[Math.floor(pathsCount * 0.9)]);
    }

    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(p10[0]));
    for (let d = 1; d <= days; d++) ctx.lineTo(getX(d), getY(p10[d]));
    ctx.stroke();

    ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(p90[0]));
    for (let d = 1; d <= days; d++) ctx.lineTo(getX(d), getY(p90[d]));
    ctx.stroke();
    ctx.setLineDash([]);
  }, [activeKey, isOpen, mcDrift, mcVol, isFullscreen]);

  if (!isOpen || !insight) return null;

  // DCF Calculation variables
  const dcfBaseCf = 1000;
  const dcfYears = Array.from({ length: 5 }, (_, i) => {
    const year = i + 1;
    const cf = dcfBaseCf * Math.pow(1 + dcfGrowth, year);
    const pv = cf / Math.pow(1 + dcfDiscount, year);
    return { year, cf, pv };
  });
  const dcfSum = dcfYears.reduce((sum, y) => sum + y.pv, 0);

  // Beta Calculation variables
  const computedBeta = betaMktVar > 0 ? betaCov / betaMktVar : 0;

  const drawerWidthClass = isFullscreen ? "w-full" : "w-full sm:w-[480px]";

  return (
    <div className={`fixed inset-y-0 right-0 ${drawerWidthClass} bg-zinc-950/98 border-l border-white/10 shadow-2xl z-[100] flex flex-col transition-all duration-300 animate-in slide-in-from-right duration-300 backdrop-blur-md`}>
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">{insight.title}</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{insight.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Maximize Toggle Button */}
          {["KALMAN_EQUILIBRIUM", "MONTE_CARLO", "DCF_MODEL", "REGIME_BETA"].includes(activeKey || "") && (
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="px-2.5 py-1 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-widest transition-colors focus:outline-none"
              title={isFullscreen ? "Minimize Screen" : "Maximize Screen"}
            >
              {isFullscreen ? "Minimize ⛶" : "Maximize ⛶"}
            </button>
          )}
          <button
            onClick={() => {
              setIsFullscreen(false);
              closeEducation();
            }}
            className="w-8 h-8 rounded-lg border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors focus:outline-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-zinc-900/30 text-[10px] font-bold tracking-wider uppercase">
        {(["DEEP_DIVE", "TRADER", "INVESTOR"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === t
                ? "text-matrix border-b-2 border-matrix font-extrabold"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "DEEP_DIVE" ? "Concept & Blueprint" : t === "TRADER" ? "Trading Lens" : "Investment Lens"}
          </button>
        ))}
      </div>

      {/* Body Layout */}
      {isFullscreen ? (
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 text-[12px] leading-relaxed text-zinc-300">
          {/* LEFT PANEL: ACTIVE SIMULATOR / CANVAS */}
          <div className="lg:col-span-7 flex flex-col justify-between overflow-y-auto pr-6 border-r border-white/5 space-y-6 scrollbar-hide">
            {activeKey === "KALMAN_EQUILIBRIUM" && (
              <div className="space-y-6 bg-black/30 border border-white/5 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-matrix">Kalman Filtering Dynamic Telemetry</span>
                  <span className="text-[9px] font-mono text-zinc-500">process noise vs measurement noise</span>
                </div>
                <canvas ref={kalmanCanvasRef} width={800} height={280} className="w-full bg-black/60 rounded border border-white/5 block" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Process Noise Q</span>
                      <span className="font-mono text-matrix">{kalmanQ.toFixed(4)}</span>
                    </div>
                    <input
                      type="range" min="0.0001" max="0.2" step="0.0005" value={kalmanQ}
                      onChange={(e) => setKalmanQ(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Measurement Noise R</span>
                      <span className="font-mono text-matrix">{kalmanR.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min="0.01" max="5.0" step="0.05" value={kalmanR}
                      onChange={(e) => setKalmanR(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeKey === "MONTE_CARLO" && (
              <div className="space-y-6 bg-black/30 border border-white/5 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Stochastic Pricing GBM Paths</span>
                  <span className="text-[9px] font-mono text-zinc-500">drift vs dispersion volatility</span>
                </div>
                <canvas ref={mcCanvasRef} width={800} height={280} className="w-full bg-black/60 rounded border border-white/5 block" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Drift μ</span>
                      <span className="font-mono text-purple-400">{(mcDrift * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range" min="-0.5" max="0.5" step="0.05" value={mcDrift}
                      onChange={(e) => setMcDrift(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Volatility σ</span>
                      <span className="font-mono text-purple-400">{(mcVol * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range" min="0.05" max="1.0" step="0.05" value={mcVol}
                      onChange={(e) => setMcVol(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeKey === "DCF_MODEL" && (
              <div className="space-y-6 bg-black/30 border border-white/5 p-6 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">DCF Present Value Compounding</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Growth Rate g</span>
                      <span className="font-mono text-amber-500">{(dcfGrowth * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range" min="-0.1" max="0.3" step="0.01" value={dcfGrowth}
                      onChange={(e) => setDcfGrowth(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Discount Rate r</span>
                      <span className="font-mono text-amber-500">{(dcfDiscount * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range" min="0.05" max="0.2" step="0.01" value={dcfDiscount}
                      onChange={(e) => setDcfDiscount(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
                <div className="border border-white/5 rounded overflow-hidden text-[11px] mt-6">
                  <div className="grid grid-cols-3 bg-white/[0.02] border-b border-white/5 px-4 py-2 font-bold uppercase text-zinc-500">
                    <span>Period</span>
                    <span className="text-right">Projected Cash Flow</span>
                    <span className="text-right">Discounted PV</span>
                  </div>
                  {dcfYears.map((y) => (
                    <div key={y.year} className="grid grid-cols-3 px-4 py-2 border-b border-white/5 font-mono text-zinc-400">
                      <span>Year {y.year}</span>
                      <span className="text-right">${y.cf.toFixed(2)}</span>
                      <span className="text-right text-white">${y.pv.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 bg-white/[0.01] px-4 py-3.5 font-bold">
                    <span className="text-zinc-500 uppercase col-span-2">Sum of present values (FCF Intrinsic base)</span>
                    <span className="text-right font-mono text-amber-500 text-sm">${dcfSum.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeKey === "REGIME_BETA" && (
              <div className="space-y-6 bg-black/30 border border-white/5 p-6 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-matrix">Covariance Beta Estimator</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Asset/Market Covariance</span>
                      <span className="font-mono text-matrix">{betaCov.toFixed(4)}</span>
                    </div>
                    <input
                      type="range" min="-0.02" max="0.05" step="0.001" value={betaCov}
                      onChange={(e) => setBetaCov(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Benchmark Variance</span>
                      <span className="font-mono text-matrix">{betaMktVar.toFixed(4)}</span>
                    </div>
                    <input
                      type="range" min="0.005" max="0.03" step="0.001" value={betaMktVar}
                      onChange={(e) => setBetaMktVar(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 rounded bg-black/60 border border-white/5 mt-6">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase">Systematic Co-variance Index (Beta)</span>
                  <span className={`text-xl font-mono font-bold ${computedBeta > 1.2 ? 'text-bear animate-pulse' : computedBeta < 0.8 ? 'text-matrix' : 'text-white'}`}>
                    {computedBeta.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="text-[11px] text-zinc-500 leading-relaxed bg-white/[0.01] border border-white/5 p-4 rounded-lg">
              <strong>Simulated State Mechanics</strong>: This sandbox runs live mathematical logic on the client-side. Slide parameters to observe the convergence of risk and alpha bands under different simulated regimes.
            </div>
          </div>

          {/* RIGHT COLUMN: TEXT INFRASTRUCTURE */}
          <div className="lg:col-span-5 flex flex-col overflow-y-auto pl-6 space-y-6 scrollbar-hide">
            {/* Render active tabs content */}
            {activeTab === "DEEP_DIVE" && (
              <>
                <section className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Overview Definition</span>
                  <p className="text-zinc-200 font-medium leading-relaxed">{insight.definition}</p>
                </section>
                {insight.formula && (
                  <section className="space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Mathematical Formula</span>
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl font-mono text-[11px] text-matrix break-all leading-relaxed whitespace-pre-wrap">
                      {insight.formula}
                    </div>
                  </section>
                )}
                {insight.lookback && (
                  <section className="space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Lookback Window</span>
                    <p className="text-zinc-300 font-medium">{insight.lookback}</p>
                  </section>
                )}
                <section className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Key Takeaway</span>
                  <p className="text-zinc-300 font-normal leading-relaxed">{insight.keyTakeaway}</p>
                </section>
                {insight.pitfalls && insight.pitfalls.length > 0 && (
                  <section className="space-y-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-bear">Analytical Pitfalls</span>
                    <ul className="space-y-2">
                      {insight.pitfalls.map((p, idx) => (
                        <li key={idx} className="flex gap-2 text-zinc-400 font-normal leading-relaxed">
                          <span className="text-bear font-bold">⚠️</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
            {activeTab === "TRADER" && (
              <section className="space-y-4">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Short-Term Volatility & Momentum</span>
                <p className="text-zinc-200 font-normal leading-relaxed">{insight.whyItMatters}</p>
              </section>
            )}
            {activeTab === "INVESTOR" && (
              <section className="space-y-4">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Long-Term Allocations</span>
                <p className="text-zinc-200 font-normal leading-relaxed">{insight.keyTakeaway}</p>
              </section>
            )}
          </div>
        </div>
      ) : (
        /* ORIGINAL VERTICAL SCROLL LAYOUT */
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide text-[12px] leading-relaxed text-zinc-300">
          {activeTab === "DEEP_DIVE" && (
            <>
              {/* Definition */}
              <section className="space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Overview Definition</span>
                <p className="text-zinc-200 font-medium leading-relaxed">{insight.definition}</p>
              </section>

              {/* Interactive Sandbox */}
              {activeKey === "KALMAN_EQUILIBRIUM" && (
                <section className="space-y-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-matrix block">Recursive Kalman Filter Simulator</span>
                  <canvas ref={kalmanCanvasRef} width={400} height={120} className="w-full bg-black/60 rounded border border-white/5 block" />
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>PROCESS NOISE (Q)</span>
                        <span className="font-mono text-matrix">{kalmanQ.toFixed(4)}</span>
                      </div>
                      <input
                        type="range" min="0.0001" max="0.2" step="0.0005" value={kalmanQ}
                        onChange={(e) => setKalmanQ(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>MEASUREMENT NOISE (R)</span>
                        <span className="font-mono text-matrix">{kalmanR.toFixed(2)}</span>
                      </div>
                      <input
                        type="range" min="0.01" max="5.0" step="0.05" value={kalmanR}
                        onChange={(e) => setKalmanR(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-normal leading-normal">
                    Adjust <span className="text-zinc-400">Process Noise</span> higher to force the smoothed line (green) to hug prices closer; increase <span className="text-zinc-400">Measurement Noise</span> to lag the filter and smooth out noise.
                  </p>
                </section>
              )}

              {activeKey === "MONTE_CARLO" && (
                <section className="space-y-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 block">Stochastic GBM Simulation Sandbox</span>
                  <canvas ref={mcCanvasRef} width={400} height={120} className="w-full bg-black/60 rounded border border-white/5 block" />
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>DRIFT (μ)</span>
                        <span className="font-mono text-purple-400">{(mcDrift * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="-0.5" max="0.5" step="0.05" value={mcDrift}
                        onChange={(e) => setMcDrift(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>VOLATILITY (σ)</span>
                        <span className="font-mono text-purple-400">{(mcVol * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="0.05" max="1.0" step="0.05" value={mcVol}
                        onChange={(e) => setMcVol(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-normal leading-normal">
                    Red dashed line represents the <span className="text-bear">5th percentile (Bear case / p10)</span>. Green line shows the <span className="text-bull">95th percentile (Bull case / p90)</span>.
                  </p>
                </section>
              )}

              {activeKey === "DCF_MODEL" && (
                <section className="space-y-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 block">DCF Present Value Compounding</span>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>ANNUAL GROWTH RATE (g)</span>
                        <span className="font-mono text-amber-500">{(dcfGrowth * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="-0.1" max="0.3" step="0.01" value={dcfGrowth}
                        onChange={(e) => setDcfGrowth(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>DISCOUNT RATE / WACC (r)</span>
                        <span className="font-mono text-amber-500">{(dcfDiscount * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="0.05" max="0.2" step="0.01" value={dcfDiscount}
                        onChange={(e) => setDcfDiscount(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>
                  {/* Math Step table */}
                  <div className="border border-white/5 rounded overflow-hidden text-[10px]">
                    <div className="grid grid-cols-3 bg-white/[0.02] border-b border-white/5 px-3 py-1.5 font-bold uppercase text-zinc-500">
                      <span>Period</span>
                      <span className="text-right">Estimated Cash Flow</span>
                      <span className="text-right">Present Value</span>
                    </div>
                    {dcfYears.map((y) => (
                      <div key={y.year} className="grid grid-cols-3 px-3 py-1.5 border-b border-white/5 font-mono text-zinc-400">
                        <span>Year {y.year}</span>
                        <span className="text-right">${y.cf.toFixed(0)}</span>
                        <span className="text-right text-white">${y.pv.toFixed(0)}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 bg-white/[0.01] px-3 py-2 font-bold">
                      <span className="text-zinc-500 uppercase col-span-2">Sum of present values</span>
                      <span className="text-right font-mono text-amber-500">${dcfSum.toFixed(2)}</span>
                    </div>
                  </div>
                </section>
              )}

              {activeKey === "REGIME_BETA" && (
                <section className="space-y-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-matrix block">Covariance Beta Estimator</span>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>ASSET/MARKET COVARIANCE</span>
                        <span className="font-mono text-matrix">{betaCov.toFixed(4)}</span>
                      </div>
                      <input
                        type="range" min="-0.02" max="0.05" step="0.001" value={betaCov}
                        onChange={(e) => setBetaCov(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>MARKET BENCHMARK VARIANCE</span>
                        <span className="font-mono text-matrix">{betaMktVar.toFixed(4)}</span>
                      </div>
                      <input
                        type="range" min="0.005" max="0.03" step="0.001" value={betaMktVar}
                        onChange={(e) => setBetaMktVar(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-matrix"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded bg-black/60 border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Calculated Beta</span>
                    <span className={`text-lg font-mono font-bold ${computedBeta > 1.2 ? 'text-bear' : computedBeta < 0.8 ? 'text-matrix' : 'text-white'}`}>
                      {computedBeta.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal font-normal">
                    If Beta is <span className="text-white">&gt; 1.0</span>, the asset is highly volatile and amplifies market trends; if <span className="text-white">&lt; 1.0</span>, it acts as a defensive holdings hedge.
                  </p>
                </section>
              )}

              {/* Formula */}
              {insight.formula && (
                <section className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Mathematical Formula</span>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl font-mono text-[11px] text-matrix break-all leading-relaxed whitespace-pre-wrap">
                    {insight.formula}
                  </div>
                </section>
              )}

              {/* Lookback */}
              {insight.lookback && (
                <section className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Default Lookback Window</span>
                  <p className="text-zinc-300 font-medium">{insight.lookback}</p>
                </section>
              )}

              {/* Key Takeaway */}
              <section className="space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Strategic Takeaway</span>
                <p className="text-zinc-300 font-normal leading-relaxed">{insight.keyTakeaway}</p>
              </section>

              {/* Pitfalls */}
              {insight.pitfalls && insight.pitfalls.length > 0 && (
                <section className="space-y-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-bear">Caution & Analytical Pitfalls</span>
                  <ul className="space-y-2">
                    {insight.pitfalls.map((p, idx) => (
                      <li key={idx} className="flex gap-2 text-zinc-400 font-normal leading-relaxed">
                        <span className="text-bear font-bold">⚠️</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {activeTab === "TRADER" && (
            <section className="space-y-6">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Short-Term Volatility & Momentum</span>
                <p className="text-zinc-200 font-normal leading-relaxed">
                  For active traders, this metric serves as a key indicator of price expansion/compression thresholds or execution signals:
                </p>
              </div>
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-bear mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Execution Trigger</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Look for sudden breaks beyond standard deviations. In high-volatility regimes, price spikes are often momentum indicators; in low-volatility regimes, they represent exhaustion.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-bear mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Stop Loss Placement</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Position your hard risk parameters outside of the calculated statistical noise envelope (e.g. beyond the Kalman smoothed support or the Monte Carlo p10 threshold) to avoid premature stop-outs.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "INVESTOR" && (
            <section className="space-y-6">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Long-Term Systematic Allocations</span>
                <p className="text-zinc-200 font-normal leading-relaxed">
                  For long-term investors, this metric dictates risk management, capital diversification, and fair value entry zones:
                </p>
              </div>
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-bull mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Asset Allocation</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Compare the calculated Beta and Alpha to adjust sector weights. Maintain a lower portfolio Beta during macro rate hikes and increase Beta during systemic growth periods.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-bull mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Margin of Safety</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Always buy below the calculated intrinsic Graham Number or DCF ceiling. Buying with a 20-30% margin of safety protects your principal capital if macro dynamics shift.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Footer Legal */}
      <div className="p-6 border-t border-white/5 text-[9px] text-zinc-600 font-bold uppercase tracking-wider text-center">
        Educational purposes only • No investment advisory
      </div>
    </div>
  );
}
