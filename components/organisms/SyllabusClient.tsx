"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEducation } from "@/components/providers/EducationProvider";
import { QUANT_DEEP_DIVES, FUNDAMENTAL_DEEP_DIVES } from "@/lib/education";

const STAGES = [
  {
    name: "Stage 1: Core Fundamentals",
    description: "Master balance-sheet solvency, growth margins, and standard value multiples.",
    keys: ["PE_RATIO", "DEBT_EQUITY", "DIVIDEND_YIELD", "PROFITABILITY", "LIQUIDITY", "VALUATION"],
    color: "border-l-bull/40"
  },
  {
    name: "Stage 2: Risk Telemetry",
    description: "Understand systematic volatility, standard deviations, and risk-adjusted return ratios.",
    keys: ["REGIME_BETA", "ANNUALIZED_VOLATILITY", "SHARPE_RATIO", "SORTINO_RATIO", "MAX_DRAWDOWN"],
    color: "border-l-matrix/40"
  },
  {
    name: "Stage 3: Valuation Solvers & Correlation",
    description: "Explore Discounted Cash Flows, defensive thresholds, and covariance matrices.",
    keys: ["DCF_MODEL", "GRAHAM_NUMBER", "PETER_LYNCH", "VALUE_AT_RISK", "PORTFOLIO_CORRELATION"],
    color: "border-l-amber-500/40"
  },
  {
    name: "Stage 4: Advanced Predictive Analytics",
    description: "Dive into stochastic paths, Kalman state estimation, and fractal dimensions.",
    keys: ["MONTE_CARLO", "KALMAN_EQUILIBRIUM", "CONFLUENCE_SCORE", "TTM_SQUEEZE", "HURST_EXPONENT", "VOLUME_PROFILE_POC", "SENTIMENT_VELOCITY"],
    color: "border-l-purple-500/40"
  }
];

const NODES = [
  // Column 0: Inputs (X = 100)
  { id: "PRICE", label: "Live Price Action", type: "DATA", x: 100, y: 80, key: "" },
  { id: "FINANCIALS", label: "Balance Sheet Data", type: "DATA", x: 100, y: 260, key: "" },

  // Column 1: Core Telemetry (X = 350)
  { id: "VOLATILITY", label: "Annualized Volatility", type: "QUANT", x: 350, y: 60, key: "ANNUALIZED_VOLATILITY" },
  { id: "KALMAN", label: "Kalman Equilibrium", type: "QUANT", x: 350, y: 150, key: "KALMAN_EQUILIBRIUM" },
  { id: "DCF", label: "Discounted Cash Flow", type: "FUNDAMENTAL", x: 350, y: 240, key: "DCF_MODEL" },
  { id: "GRAHAM", label: "Graham Number", type: "FUNDAMENTAL", x: 350, y: 310, key: "GRAHAM_NUMBER" },

  // Column 2: Risk & Valuation (X = 650)
  { id: "SHARPE", label: "Sharpe & Sortino Ratios", type: "QUANT", x: 650, y: 50, key: "SHARPE_RATIO" },
  { id: "VAR", label: "Value at Risk (VaR)", type: "QUANT", x: 650, y: 130, key: "VALUE_AT_RISK" },
  { id: "CORRELATION", label: "Correlation Matrix", type: "QUANT", x: 650, y: 210, key: "PORTFOLIO_CORRELATION" },

  // Column 3: Advanced Predictions (X = 900)
  { id: "MONTE_CARLO", label: "Monte Carlo Paths", type: "QUANT", x: 900, y: 90, key: "MONTE_CARLO" },
  { id: "CONFLUENCE", label: "Confluence Score", type: "QUANT", x: 900, y: 220, key: "CONFLUENCE_SCORE" },
];

const EDGES = [
  // Price connections
  { from: "PRICE", to: "VOLATILITY" },
  { from: "PRICE", to: "KALMAN" },
  { from: "PRICE", to: "CORRELATION" },

  // Financials connections
  { from: "FINANCIALS", to: "DCF" },
  { from: "FINANCIALS", to: "GRAHAM" },

  // Volatility connections
  { from: "VOLATILITY", to: "SHARPE" },
  { from: "VOLATILITY", to: "VAR" },
  { from: "VOLATILITY", to: "CORRELATION" },

  // DCF/Kalman connections
  { from: "DCF", to: "CONFLUENCE" },
  { from: "KALMAN", to: "CONFLUENCE" },

  // Risk inputs to Monte Carlo
  { from: "SHARPE", to: "MONTE_CARLO" },
  { from: "VAR", to: "MONTE_CARLO" },

  // Correlation to Confluence
  { from: "CORRELATION", to: "CONFLUENCE" },
];

export function SyllabusClient() {
  const { openEducation } = useEducation();
  const [filter, setFilter] = useState<"ALL" | "QUANT" | "FUNDAMENTAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  // Map keys to display details
  const getConceptDetails = (key: string) => {
    if (QUANT_DEEP_DIVES[key]) {
      return { key, category: "QUANT" as const, ...QUANT_DEEP_DIVES[key] };
    }
    if (FUNDAMENTAL_DEEP_DIVES[key]) {
      return { key, category: "FUNDAMENTAL" as const, ...FUNDAMENTAL_DEEP_DIVES[key] };
    }
    return null;
  };

  const handleLaunch = (key: string, cat: "QUANT" | "FUNDAMENTAL") => {
    openEducation(key, cat);
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1400px] mx-auto space-y-12">
          {/* Header Banner */}
          <div className="border-b border-white/5 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tightest leading-none mb-4">Syllabus</h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Systematic roadmap outlining the progression from core financial fundamentals to advanced risk modeling and signal filtering.
              </p>
            </div>

            {/* Reset/Overview stats & Lab Link */}
            <div className="flex gap-4 items-center">
              <Link 
                href="/education/stress-test"
                className="bg-matrix/10 border border-matrix/30 hover:border-matrix/50 text-matrix px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,255,163,0.05)] hover:shadow-[0_0_20px_rgba(0,255,163,0.15)] flex items-center gap-2"
              >
                <span>Interactive Stress Lab ➔</span>
              </Link>
              <div className="bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-lg text-right">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">Total Curriculum</span>
                <span className="text-lg font-mono font-bold text-white">23 Math Models</span>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white/[0.01] p-4 border border-white/5 rounded-xl">
            <input
              type="text"
              placeholder="Search concepts, formulas, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-matrix/40 transition-colors max-w-md"
            />
            
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="flex border border-white/10 rounded overflow-hidden bg-black/20">
                <button 
                  onClick={() => setFilter("ALL")} 
                  className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase transition-colors ${filter === "ALL" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter("QUANT")} 
                  className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase border-l border-r border-white/10 transition-colors ${filter === "QUANT" ? "bg-matrix text-white" : "text-zinc-500 hover:text-white"}`}
                >
                  Quantitative
                </button>
                <button 
                  onClick={() => setFilter("FUNDAMENTAL")} 
                  className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase transition-colors ${filter === "FUNDAMENTAL" ? "bg-bull text-white" : "text-zinc-500 hover:text-white"}`}
                >
                  Fundamental
                </button>
              </div>

              <button
                onClick={() => setShowMap(!showMap)}
                className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase border rounded transition-colors ${showMap ? "bg-matrix/10 text-matrix border-matrix/30 hover:bg-matrix/20" : "text-zinc-400 border-white/10 hover:text-white hover:bg-white/5"}`}
              >
                {showMap ? "Hide Concept Map" : "Show Concept Map"}
              </button>
            </div>
          </div>

          {/* Interactive Concept Map */}
          {showMap && (
            <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-xl p-6 space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quantitative Dependency & Signal Flow Map</h3>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Hover over nodes to trace mathematical connections. Click any active node to launch its blueprint and interactive sandbox.
                  </p>
                </div>
                <div className="flex gap-4 text-[9px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-zinc-850 border border-zinc-700" /> Data Input</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-bull/20 border border-bull/40" /> Fundamental</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-matrix/20 border border-matrix/40" /> Quantitative</span>
                </div>
              </div>

              {/* SVG Map Container with horizontal scroll for responsiveness */}
              <div className="overflow-x-auto scrollbar-hide py-4">
                <div className="min-w-[1000px] relative">
                  <svg viewBox="0 0 1000 360" className="w-full h-auto select-none">
                    <style dangerouslySetInnerHTML={{ __html: `
                      .animate-flow-forward {
                        stroke-dasharray: 6, 4;
                      }
                    `}} />
                    
                    {/* Defs for gradients */}
                    <defs>
                      <linearGradient id="grad-data" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#18181b" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#09090b" stopOpacity="0.9" />
                      </linearGradient>
                      <linearGradient id="grad-quant" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#022c22" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#09090b" stopOpacity="0.9" />
                      </linearGradient>
                      <linearGradient id="grad-fundamental" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#451a03" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#09090b" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>

                    {/* Connection Paths */}
                    {EDGES.map((edge, idx) => {
                      const fromNode = NODES.find(n => n.id === edge.from);
                      const toNode = NODES.find(n => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      const isHovered = hoveredNode !== null;
                      const isFromHovered = hoveredNode === edge.from;
                      const isToHovered = hoveredNode === edge.to;
                      const isPathActive = isFromHovered || isToHovered;

                      // Compute path colors and styles
                      let strokeColor = "rgba(255, 255, 255, 0.12)";
                      let strokeWidth = 1.5;
                      let opacity = 0.3;
                      let isFlowing = false;

                      if (isHovered) {
                        if (isPathActive) {
                          if (isFromHovered) {
                            // Downstream/Outgoing: Matrix green
                            strokeColor = "#10b981";
                          } else {
                            // Upstream/Incoming: Cyan
                            strokeColor = "#06b6d4";
                          }
                          strokeWidth = 2;
                          opacity = 0.95;
                          isFlowing = true;
                        } else {
                          opacity = 0.05;
                        }
                      }

                      const dx = (toNode.x - fromNode.x) / 2;
                      const pathStr = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x + dx} ${fromNode.y}, ${toNode.x - dx} ${toNode.y}, ${toNode.x} ${toNode.y}`;

                      return (
                        <path
                          key={`edge-${idx}`}
                          d={pathStr}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          opacity={opacity}
                          className={`transition-all duration-300 ${isFlowing ? "animate-flow-forward" : ""}`}
                        />
                      );
                    })}

                    {/* Node Elements */}
                    {NODES.map((node) => {
                      const isHovered = hoveredNode === node.id;
                      const isAnyHovered = hoveredNode !== null;
                      
                      // Determine active connection for this node
                      const isNodeActive = isHovered || (isAnyHovered && EDGES.some(e => 
                        (e.from === hoveredNode && e.to === node.id) || 
                        (e.to === hoveredNode && e.from === node.id)
                      ));

                      let strokeColor = "rgba(255, 255, 255, 0.08)";
                      let gradientId = "grad-data";
                      let accentColor = "#71717a"; // zinc-500

                      if (node.type === "QUANT") {
                        gradientId = "grad-quant";
                        accentColor = "#10b981"; // Green
                        strokeColor = isNodeActive ? "#10b981" : "rgba(16, 185, 129, 0.2)";
                      } else if (node.type === "FUNDAMENTAL") {
                        gradientId = "grad-fundamental";
                        accentColor = "#f59e0b"; // Amber
                        strokeColor = isNodeActive ? "#f59e0b" : "rgba(245, 158, 11, 0.2)";
                      } else {
                        strokeColor = isNodeActive ? "#3b82f6" : "rgba(59, 130, 246, 0.2)";
                        accentColor = "#3b82f6";
                      }

                      const width = 180;
                      const height = 50;
                      const rx = node.x - width / 2;
                      const ry = node.y - height / 2;

                      return (
                        <g
                          key={node.id}
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                          onClick={() => {
                            if (node.key) {
                              handleLaunch(node.key, node.type as "QUANT" | "FUNDAMENTAL");
                            }
                          }}
                          className={`cursor-pointer transition-all duration-300 ${isAnyHovered && !isNodeActive ? "opacity-30" : "opacity-100"}`}
                        >
                          {/* Node Outer Glow if hovered */}
                          {isHovered && (
                            <rect
                              x={rx - 4}
                              y={ry - 4}
                              width={width + 8}
                              height={height + 8}
                              rx={10}
                              ry={10}
                              fill="none"
                              stroke={accentColor}
                              strokeWidth="1.5"
                              opacity="0.25"
                              className="blur-sm"
                            />
                          )}

                          {/* Node Body */}
                          <rect
                            x={rx}
                            y={ry}
                            width={width}
                            height={height}
                            rx={8}
                            ry={8}
                            fill={`url(#${gradientId})`}
                            stroke={strokeColor}
                            strokeWidth={isHovered ? 1.5 : 1}
                            className="transition-all duration-200"
                          />

                          {/* Indicator dot */}
                          <circle
                            cx={rx + 15}
                            cy={node.y}
                            r={3}
                            fill={accentColor}
                            className={isHovered ? "animate-pulse" : ""}
                          />

                          {/* Category Text (top line) */}
                          <text
                            x={node.x + 8}
                            y={node.y - 4}
                            textAnchor="middle"
                            className="text-[8px] font-black tracking-widest font-mono"
                            fill={accentColor}
                          >
                            {node.type === "DATA" ? "DATA INLET" : node.type}
                          </text>

                          {/* Label Text (bottom line) */}
                          <text
                            x={node.x + 8}
                            y={node.y + 11}
                            textAnchor="middle"
                            className="text-[10px] font-bold tracking-wide"
                            fill="#ffffff"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Stages Grid */}
          <div className="space-y-12">
            {STAGES.map((stage) => {
              // Map keys to actual objects and filter by search query & category filter
              const items = stage.keys
                .map(getConceptDetails)
                .filter((item): item is NonNullable<typeof item> => item !== null)
                .filter((item) => {
                  const matchesFilter = filter === "ALL" || item.category === filter;
                  const matchesSearch = 
                    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.formula || "").toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesFilter && matchesSearch;
                });

              if (items.length === 0) return null;

              return (
                <div key={stage.name} className="space-y-6">
                  <div className="border-b border-white/5 pb-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-3">
                      <span className="w-1.5 h-4 bg-matrix rounded-sm" />
                      {stage.name}
                    </h2>
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{stage.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => {
                      const isQuant = item.category === "QUANT";
                      const badgeColor = isQuant ? "bg-matrix/10 text-matrix border-matrix/20" : "bg-bull/10 text-bull border-bull/20";
                      
                      return (
                        <div 
                          key={item.key}
                          onClick={() => handleLaunch(item.key, item.category)}
                          className={`bg-black/40 backdrop-blur-md border border-white/5 border-l-[3px] ${isQuant ? 'border-l-matrix/50' : 'border-l-bull/50'} p-6 rounded-xl flex flex-col justify-between hover:border-white/20 transition-all cursor-pointer group`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-matrix transition-colors">{item.title}</h3>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight block mt-0.5">{item.subtitle}</span>
                              </div>
                              <span className={`text-[8px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider ${badgeColor}`}>
                                {item.category}
                              </span>
                            </div>

                            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium line-clamp-3">
                              {item.definition}
                            </p>

                            {item.formula && (
                              <div className="p-2 bg-[#111] border border-white/5 rounded font-mono text-[9px] text-zinc-500 truncate leading-none">
                                {item.formula}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
                            <span>Study Blueprint ➔</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Launch ⛶</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
  );
}
