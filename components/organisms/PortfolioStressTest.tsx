"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { InfoTooltip } from "@/components/atoms/InfoTooltip";

interface Position {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  openedAt: Date | null;
  notes: string | null;
}

interface PortfolioStressTestProps {
  initialPositions: Position[];
  historyData: { ticker: string; history: { close: number; time: number }[] }[];
  pulse: any;
  isDemoPortfolio?: boolean;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return "$" + fmt(n);
}

export function PortfolioStressTest({
  initialPositions,
  historyData,
  pulse,
  isDemoPortfolio = false,
}: PortfolioStressTestProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Calculate positions initial valuation and weights
  const initialWeightsMap = useMemo(() => {
    const values: Record<string, number> = {};
    let total = 0;
    initialPositions.forEach((p) => {
      const val = p.shares * p.avgCost;
      values[p.ticker] = (values[p.ticker] || 0) + val;
      total += val;
    });

    const weights: Record<string, number> = {};
    initialPositions.forEach((p) => {
      weights[p.ticker] = total > 0 ? values[p.ticker] / total : 0;
    });
    return { weights, totalValue: total };
  }, [initialPositions]);

  const [weights, setWeights] = useState<Record<string, number>>(initialWeightsMap.weights);
  const [volatilityMultiplier, setVolatilityMultiplier] = useState<number>(1.0);
  const [correlationShock, setCorrelationShock] = useState<number>(0.0);
  const [marketReturnShock, setMarketReturnShock] = useState<number>(0.0);
  const [rateShock, setRateShock] = useState<number>(0.0);

  // Align state when initialPositions changes
  useEffect(() => {
    setWeights(initialWeightsMap.weights);
  }, [initialWeightsMap]);

  // 2. Pre-calculate baseline metrics from historyData
  const parsedBaseline = useMemo(() => {
    const spyEntry = historyData.find((h) => h.ticker === "SPY");
    const spyHistory = spyEntry ? spyEntry.history : [];
    if (spyHistory.length === 0) return null;

    const priceMaps = new Map<string, Map<number, number>>();
    historyData.forEach((h) => {
      const map = new Map<number, number>();
      h.history.forEach((bar) => map.set(bar.time, bar.close));
      priceMaps.set(h.ticker, map);
    });

    const alignedTimestamps: number[] = [];
    const returnsMap = new Map<string, number[]>();
    const tickers = Object.keys(initialWeightsMap.weights);

    tickers.forEach((t) => returnsMap.set(t, []));
    const spyReturns: number[] = [];

    for (let i = 1; i < spyHistory.length; i++) {
      const t = spyHistory[i].time;
      const prevT = spyHistory[i - 1].time;

      let allExist = true;
      for (const ticker of tickers) {
        const map = priceMaps.get(ticker);
        if (!map || map.get(t) === undefined || map.get(prevT) === undefined || map.get(prevT) === 0) {
          allExist = false;
          break;
        }
      }

      if (allExist) {
        alignedTimestamps.push(t);
        const spyRet = (spyHistory[i].close - spyHistory[i - 1].close) / spyHistory[i - 1].close;
        spyReturns.push(spyRet);

        tickers.forEach((ticker) => {
          const map = priceMaps.get(ticker)!;
          const ret = (map.get(t)! - map.get(prevT)!) / map.get(prevT)!;
          returnsMap.get(ticker)!.push(ret);
        });
      }
    }

    if (spyReturns.length < 10) return null;

    const assetVolMap = new Map<string, number>(); // daily volatility std dev
    const assetBetaMap = new Map<string, number>();
    const assetNamesMap = new Map<string, string>();
    initialPositions.forEach((p) => assetNamesMap.set(p.ticker, p.name));

    const spyMean = spyReturns.reduce((a, b) => a + b, 0) / spyReturns.length;
    const spyVar = spyReturns.reduce((a, b) => a + Math.pow(b - spyMean, 2), 0) / (spyReturns.length - 1);

    tickers.forEach((t) => {
      const returns = returnsMap.get(t)!;
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
      const vol = Math.sqrt(variance);
      assetVolMap.set(t, vol);

      let cov = 0;
      for (let i = 0; i < returns.length; i++) {
        cov += (returns[i] - mean) * (spyReturns[i] - spyMean);
      }
      cov /= returns.length - 1;
      const beta = spyVar > 1e-12 ? cov / spyVar : 1.0;
      assetBetaMap.set(t, beta);
    });

    const correlationMatrix = new Map<string, Map<string, number>>();
    tickers.forEach((t1) => {
      correlationMatrix.set(t1, new Map<string, number>());
      tickers.forEach((t2) => {
        if (t1 === t2) {
          correlationMatrix.get(t1)!.set(t2, 1.0);
        } else {
          const r1 = returnsMap.get(t1)!;
          const r2 = returnsMap.get(t2)!;
          const m1 = r1.reduce((a, b) => a + b, 0) / r1.length;
          const m2 = r2.reduce((a, b) => a + b, 0) / r2.length;
          const v1 = assetVolMap.get(t1)!;
          const v2 = assetVolMap.get(t2)!;

          let cov = 0;
          for (let i = 0; i < r1.length; i++) {
            cov += (r1[i] - m1) * (r2[i] - m2);
          }
          cov /= r1.length - 1;

          const corr = v1 > 1e-12 && v2 > 1e-12 ? cov / (v1 * v2) : 0;
          correlationMatrix.get(t1)!.set(t2, corr);
        }
      });
    });

    return {
      tickers,
      assetVolMap,
      assetBetaMap,
      correlationMatrix,
      assetNamesMap,
    };
  }, [historyData, initialPositions, initialWeightsMap]);

  // 3. Stressed Metrics Computations
  const stressedMetrics = useMemo(() => {
    if (!parsedBaseline) return null;

    const { tickers, assetVolMap, assetBetaMap, correlationMatrix } = parsedBaseline;

    // Normalizing custom weights (force sum to 1.0 for calculations)
    const rawSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const normalizedWeights: Record<string, number> = {};
    tickers.forEach((t) => {
      normalizedWeights[t] = rawSum > 0 ? (weights[t] ?? 0) / rawSum : 0;
    });

    // Calculate stressed individual assets parameter
    const stressedVols: Record<string, number> = {};
    const stressedBetas: Record<string, number> = {};
    tickers.forEach((t) => {
      const baseVol = assetVolMap.get(t) || 0.015;
      const baseBeta = assetBetaMap.get(t) || 1.0;

      stressedVols[t] = baseVol * volatilityMultiplier;
      // High-beta growth assets get penalized more in rate hikes, defensive ones hold
      stressedBetas[t] = baseBeta * (1 + rateShock * (baseBeta - 1) * 0.12);
    });

    // Portfolio Beta
    let portfolioBeta = 0;
    tickers.forEach((t) => {
      portfolioBeta += normalizedWeights[t] * stressedBetas[t];
    });

    // Calculate portfolio stressed variance
    let portfolioVarianceDaily = 0;
    for (let i = 0; i < tickers.length; i++) {
      const t1 = tickers[i];
      const w1 = normalizedWeights[t1];
      const vol1 = stressedVols[t1];

      portfolioVarianceDaily += w1 * w1 * vol1 * vol1;

      for (let j = i + 1; j < tickers.length; j++) {
        const t2 = tickers[j];
        const w2 = normalizedWeights[t2];
        const vol2 = stressedVols[t2];
        const baseCorr = correlationMatrix.get(t1)?.get(t2) ?? 0;

        // Correlation Shock interpolation
        const stressedCorr = baseCorr + (1 - baseCorr) * correlationShock;
        portfolioVarianceDaily += 2 * w1 * w2 * vol1 * vol2 * stressedCorr;
      }
    }

    const portfolioVolDaily = Math.sqrt(Math.max(0, portfolioVarianceDaily));
    const portfolioVolAnnualized = portfolioVolDaily * Math.sqrt(252);

    // Expected daily/annual return under shock
    // Rate shock introduces expected valuation compressions on systemic growth assets
    const expectedReturnAnnual = portfolioBeta * marketReturnShock - rateShock * portfolioBeta * 1.5;
    const expectedReturnDaily = expectedReturnAnnual / 252;

    // Parametric Value at Risk 95% (Daily)
    const var95DailyPercent = 1.645 * portfolioVolDaily * 100;
    const var95DailyDollar = (var95DailyPercent / 100) * initialWeightsMap.totalValue;

    // Diversification Benefit Score
    let weightedVolSum = 0;
    tickers.forEach((t) => {
      weightedVolSum += normalizedWeights[t] * stressedVols[t];
    });
    const diversificationBenefit = weightedVolSum > 0 ? 1 - portfolioVolDaily / weightedVolSum : 0;

    return {
      portfolioBeta,
      portfolioVolDaily,
      portfolioVolAnnualized,
      expectedReturnDaily,
      expectedReturnAnnual,
      var95DailyPercent,
      var95DailyDollar,
      diversificationBenefit,
      stressedVols,
      stressedBetas,
    };
  }, [parsedBaseline, weights, volatilityMultiplier, correlationShock, marketReturnShock, rateShock, initialWeightsMap.totalValue]);

  // 4. Bell Curve Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stressedMetrics) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const mu = stressedMetrics.expectedReturnDaily * 100; // in percent
    const sigma = Math.max(0.01, stressedMetrics.portfolioVolDaily * 100); // in percent

    // VaR Threshold
    const varCutoff = mu - 1.645 * sigma;

    // Margins
    const margin = 40;
    const chartWidth = width - margin * 2;
    const chartHeight = height - margin * 2;

    // Range of daily returns to draw on X axis (from -4 sigma to +4 sigma relative to mu)
    const minX = mu - 4.5 * Math.max(0.8, sigma);
    const maxX = mu + 4.5 * Math.max(0.8, sigma);

    const getXPixel = (val: number) => {
      return margin + ((val - minX) / (maxX - minX)) * chartWidth;
    };

    const normalPDF = (x: number, m: number, s: number) => {
      return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - m) / s, 2));
    };

    // Calculate maximum Y to scale chart
    const maxPDF = normalPDF(mu, mu, sigma);
    const getYPixel = (val: number) => {
      return height - margin - (val / maxPDF) * chartHeight * 0.85;
    };

    // 1. Draw grid line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();

    // 2. Shade Area Left of VaR Cutoff (Crimson/Red)
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.beginPath();
    const startXPixel = getXPixel(minX);
    ctx.moveTo(startXPixel, height - margin);

    const step = (maxX - minX) / 200;
    for (let xVal = minX; xVal <= varCutoff; xVal += step) {
      const px = getXPixel(xVal);
      const py = getYPixel(normalPDF(xVal, mu, sigma));
      ctx.lineTo(px, py);
    }
    const varPx = getXPixel(varCutoff);
    ctx.lineTo(varPx, height - margin);
    ctx.closePath();
    ctx.fill();

    // 3. Shade Area Right of VaR Cutoff (Green/Matrix)
    ctx.fillStyle = "rgba(0, 255, 163, 0.04)";
    ctx.beginPath();
    ctx.moveTo(varPx, height - margin);
    for (let xVal = varCutoff; xVal <= maxX; xVal += step) {
      const px = getXPixel(xVal);
      const py = getYPixel(normalPDF(xVal, mu, sigma));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(getXPixel(maxX), height - margin);
    ctx.closePath();
    ctx.fill();

    // 4. Draw PDF Curve
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startXPixel, getYPixel(normalPDF(minX, mu, sigma)));
    for (let xVal = minX; xVal <= maxX; xVal += step) {
      ctx.lineTo(getXPixel(xVal), getYPixel(normalPDF(xVal, mu, sigma)));
    }
    ctx.stroke();

    // Draw active highlights
    ctx.strokeStyle = "#00ffa3";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const highlightStart = Math.max(minX, varCutoff);
    ctx.moveTo(getXPixel(highlightStart), getYPixel(normalPDF(highlightStart, mu, sigma)));
    for (let xVal = highlightStart; xVal <= maxX; xVal += step) {
      ctx.lineTo(getXPixel(xVal), getYPixel(normalPDF(xVal, mu, sigma)));
    }
    ctx.stroke();

    // 5. Draw VaR line & Label
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(varPx, getYPixel(normalPDF(varCutoff, mu, sigma)));
    ctx.lineTo(varPx, height - margin + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${varCutoff.toFixed(2)}% VaR`, varPx, height - margin + 32);

    // 6. Draw Mean Line (Expected return)
    const meanPx = getXPixel(mu);
    ctx.strokeStyle = "#00ffa3";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(meanPx, getYPixel(maxPDF));
    ctx.lineTo(meanPx, height - margin + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#00ffa3";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`Mean ${mu >= 0 ? "+" : ""}${mu.toFixed(2)}%`, meanPx, height - margin + 32);

  }, [stressedMetrics]);

  // Adjust individual asset weight helper
  const handleWeightChange = (ticker: string, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [ticker]: value,
    }));
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1400px] mx-auto space-y-12">
          {/* Header */}
          <div className="border-b border-white/5 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-bold text-matrix bg-matrix/10 border border-matrix/20 px-2 py-0.5 rounded tracking-widest uppercase">STAGE 3 LAB</span>
                {isDemoPortfolio && (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded tracking-widest uppercase">DEMO MODE</span>
                )}
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tightest leading-[1.1] mb-4">Interactive Stress Test Simulator</h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Subject your portfolio to extreme macroeconomic shock scenarios. Drag the sliders to simulate interest rate surges, correlation lockstep failures, and global volatility spikes.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 px-6 py-4 rounded-xl text-right">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">Asset Base Value</span>
              <span className="text-xl font-mono font-bold text-white">{fmtCurrency(initialWeightsMap.totalValue)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* LEFT: Controls (Sliders & Weights) */}
            <div className="xl:col-span-4 space-y-8">
              {/* STRESS CONTROLS */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 space-y-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
                  Macro Shocks
                </h3>

                {/* Market Return Shock Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold tracking-wide">
                    <span className="text-zinc-400">Market Return Shock (S&P 500)</span>
                    <span className={`font-mono ${marketReturnShock >= 0 ? "text-bull" : "text-bear"}`}>
                      {marketReturnShock >= 0 ? "+" : ""}
                      {(marketReturnShock * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={marketReturnShock}
                    onChange={(e) => setMarketReturnShock(parseFloat(e.target.value))}
                    className="w-full accent-matrix"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span>Liquidate (-50%)</span>
                    <span>Nominal (0%)</span>
                    <span>Rally (+50%)</span>
                  </div>
                </div>

                {/* Volatility Multiplier Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold tracking-wide">
                    <span className="text-zinc-400">Volatility Spike (VIX scaling)</span>
                    <span className="text-white font-mono">{volatilityMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={volatilityMultiplier}
                    onChange={(e) => setVolatilityMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-matrix"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span>Dampened (0.5x)</span>
                    <span>Baseline (1.0x)</span>
                    <span>Systemic Spike (3.0x)</span>
                  </div>
                </div>

                {/* Correlation Shock Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold tracking-wide">
                    <span className="text-zinc-400">Correlation Panic (Lockstep)</span>
                    <span className="text-white font-mono">{(correlationShock * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={correlationShock}
                    onChange={(e) => setCorrelationShock(parseFloat(e.target.value))}
                    className="w-full accent-matrix"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span>Historical Diversification</span>
                    <span>Systemic Selloff (100%)</span>
                  </div>
                </div>

                {/* Interest Rate Shock Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold tracking-wide">
                    <span className="text-zinc-400">Yield Surge (Fed Rate)</span>
                    <span className={`font-mono ${rateShock >= 0 ? "text-bear" : "text-bull"}`}>
                      {rateShock >= 0 ? "+" : ""}
                      {(rateShock * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.03"
                    max="0.05"
                    step="0.005"
                    value={rateShock}
                    onChange={(e) => setRateShock(parseFloat(e.target.value))}
                    className="w-full accent-matrix"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span>Cut (-3%)</span>
                    <span>Flat (0%)</span>
                    <span>Spike (+5%)</span>
                  </div>
                </div>
              </div>

              {/* ASSET WEIGHT CUSTOMIZER */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 space-y-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
                    Asset Allocation Weights
                  </span>
                </h3>

                <div className="space-y-4">
                  {(() => {
                    const rawSum = Object.values(weights).reduce((a, b) => a + b, 0);
                    return parsedBaseline?.tickers.map((ticker) => {
                      const wt = weights[ticker] ?? 0;
                      const normalizedWeight = rawSum > 0 ? wt / rawSum : 0;
                      return (
                        <div key={ticker} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold tracking-wide">
                            <span className="text-white font-mono">{ticker}</span>
                            <span className="text-zinc-500">{(normalizedWeight * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={wt}
                            onChange={(e) => handleWeightChange(ticker, parseFloat(e.target.value))}
                            className="w-full accent-matrix"
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* RIGHT: Visual Canvas Bell Curve & Stressed Metrics */}
            <div className="xl:col-span-8 space-y-8">
              {stressedMetrics ? (
                <>
                  {/* CHARTS & BELL CURVE CONTAINER */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-start border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Stressed Return Distribution</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Probability density function mapping daily return variance. Red shading indicates the 95% VaR downside tail.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <canvas
                        ref={canvasRef}
                        width={800}
                        height={320}
                        className="w-full h-auto bg-black/40 rounded-lg border border-white/5"
                      />
                    </div>
                  </div>

                  {/* STRESSED METRICS GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                        Stressed Portfolio Beta
                        <InfoTooltip insightKey="REGIME_BETA" category="QUANT" />
                      </span>
                      <div className="text-3xl font-bold font-mono tracking-tighter text-white">
                        {stressedMetrics.portfolioBeta.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium block mt-1.5 leading-none">Systemic Sensitivity</span>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                        Stressed Volatility
                        <InfoTooltip insightKey="ANNUALIZED_VOLATILITY" category="QUANT" />
                      </span>
                      <div className="text-3xl font-bold font-mono tracking-tighter text-white">
                        {(stressedMetrics.portfolioVolAnnualized * 100).toFixed(2)}%
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium block mt-1.5 leading-none">Annualized Dispersion</span>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                        Stressed 95% Daily VaR
                        <InfoTooltip insightKey="VALUE_AT_RISK" category="QUANT" />
                      </span>
                      <div className="text-3xl font-bold font-mono tracking-tighter text-bear">
                        {stressedMetrics.var95DailyPercent.toFixed(2)}%
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium block mt-1.5 leading-none">Tail Risk Threshold</span>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                        Diversification Benefit
                      </span>
                      <div className="text-3xl font-bold font-mono tracking-tighter text-matrix">
                        {(stressedMetrics.diversificationBenefit * 100).toFixed(0)}%
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium block mt-1.5 leading-none">Risk Reduction Advantage</span>
                    </div>
                  </div>

                  {/* STRESSED EQUATION ENGINE & MATH LAYER */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Live Equation */}
                    <div className="bg-[#0b0c10] border border-white/10 rounded-xl p-6 space-y-4 font-mono text-xs">
                      <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pb-2 border-b border-white/5">
                        Live Equation Simulator
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-zinc-500 uppercase text-[8px] block font-bold">Standard Formula (Daily VaR)</span>
                          <code className="text-zinc-400">VaR = Z-Score × Portfolio Volatility (Daily) × Value</code>
                        </div>
                        <div>
                          <span className="text-zinc-500 uppercase text-[8px] block font-bold">Hydrated Parameters</span>
                          <code className="text-matrix">
                            VaR = 1.645 × {stressedMetrics.portfolioVolDaily.toFixed(6)} × {fmtCurrency(initialWeightsMap.totalValue)}
                          </code>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-zinc-400 font-bold block text-sm">
                            VaR = {fmtCurrency(stressedMetrics.var95DailyDollar)} ({stressedMetrics.var95DailyPercent.toFixed(2)}%)
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic leading-relaxed pt-2">
                          Interpretation: Given the current stressed parameters, there is a 5% statistical probability that the portfolio will lose more than {fmtCurrency(stressedMetrics.var95DailyDollar)} in a single trading day.
                        </p>
                      </div>
                    </div>

                    {/* Educational Deep Dive */}
                    <div className="bg-[#0b0c10] border border-white/10 rounded-xl p-6 space-y-4">
                      <h3 className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest pb-2 border-b border-white/5">
                        Educational Concept Review
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Correlation Breakdown Risk</h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                            During market liquidity crises, the historical correlations of assets tend to break down, merging towards 1.0 (lockstep movement). As you increase the **Correlation Panic** slider, note how the **Diversification Benefit** drops to 0% and the **95% VaR** expands, illustrating why diversified holdings can collapse together in systemic panic.
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Valuation under Yield Shifts</h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                            A positive rate shift represents rising discount rates. High-beta assets (like technology or expansion companies) suffer structural valuation drops, increasing their relative systematic risk (Beta) and reducing expected portfolio yields.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 space-y-4 border border-white/5 rounded-xl bg-black/20">
                  <div className="w-8 h-8 rounded-full border-2 border-matrix/20 border-t-matrix animate-spin" />
                  <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Parsing pricing data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
  );
}
