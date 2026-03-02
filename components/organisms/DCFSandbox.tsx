"use client";
import React, { useState, useMemo } from 'react';
import { calculateDCF, DCFResult } from '@/lib/valuation';
import { StockDetails } from '@/lib/stock-details';
import { fmtBigNum, fmtCount } from '@/lib/format';

interface DCFSandboxProps {
  details: StockDetails;
  currentPrice: number;
}

export const DCFSandbox = React.memo(function DCFSandbox({ details, currentPrice }: DCFSandboxProps) {
  // Base inputs from financials
  const fcf = details.financialHealth?.freeCashflow || 0;
  const cash = details.financialHealth?.totalCash || 0;
  const debt = details.financialHealth?.totalDebt || 0;
  const shares = details.keyStats?.sharesOutstanding || 0;

  // Sandbox State
  const [growth1, setGrowth1] = useState(0.10); // 10%
  const [growth2, setGrowth2] = useState(0.05); // 5%
  const [discountRate, setDiscountRate] = useState(0.09); // 9% WACC
  const [terminalGrowth, setTerminalGrowth] = useState(0.02); // 2% perpetual

  const [activeScenario, setActiveScenario] = useState<'BASE' | 'BULL' | 'BEAR'>('BASE');

  const applyScenario = (scenario: 'BASE' | 'BULL' | 'BEAR') => {
    setActiveScenario(scenario);
    if (scenario === 'BASE') {
      setGrowth1(0.10); setGrowth2(0.05); setDiscountRate(0.09); setTerminalGrowth(0.02);
    } else if (scenario === 'BULL') {
      setGrowth1(0.20); setGrowth2(0.12); setDiscountRate(0.08); setTerminalGrowth(0.025);
    } else if (scenario === 'BEAR') {
      setGrowth1(0.05); setGrowth2(0.02); setDiscountRate(0.11); setTerminalGrowth(0.015);
    }
  };

  // Calculate DCF output memoized
  const result: DCFResult = useMemo(() => {
    return calculateDCF({
      fcf,
      cash,
      debt,
      sharesOutstanding: shares,
      growthRateStage1: growth1,
      growthRateStage2: growth2,
      discountRate,
      terminalGrowthRate: terminalGrowth,
      projectionYears: 10
    });
  }, [fcf, cash, debt, shares, growth1, growth2, discountRate, terminalGrowth]);

  const canCalculate = fcf > 0 && shares > 0;
  const marginOfSafety = result.isValid ? ((result.intrinsicValue - currentPrice) / currentPrice) * 100 : 0;
  
  if (!canCalculate) {
    return (
      <div className="p-6 border border-white/10 bg-[#0a0a0a] flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="w-12 h-12 border border-zinc-500/20 flex items-center justify-center mb-4 bg-[#111111]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-white font-bold tracking-widest uppercase mb-2">Insufficient Fundamental Data</h3>
        <p className="text-zinc-500 text-sm max-w-md">
          This asset either has negative Free Cash Flow or missing shares outstanding data, which makes traditional Discounted Cash Flow valuation unreliable.
        </p>
      </div>
    );
  }

  return (
    <section className="border border-white/10 bg-[#0a0a0a]">
      
      {/* HEADER */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-transparent">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-white shadow-none" />
            <h3 className="text-[13px] font-bold text-zinc-200 tracking-[0.15em] uppercase">Discounted Cash Flow (DCF)</h3>
          </div>
          <p className="text-[12px] text-zinc-500 font-bold uppercase tracking-widest ml-5">Intrinsic Value Projection Alpha</p>
        </div>
        
        {/* Intrinsic Value Badge */}
        <div className="text-right">
          <span className="text-[11px] text-zinc-500 font-bold tracking-[0.15em] uppercase block mb-1">Implied Value</span>
          <span className={`text-3xl font-bold tabular-nums tracking-tighter shadow-none ${result.isValid ? (marginOfSafety >= 0 ? 'text-bull' : 'text-bear') : 'text-zinc-500'}`}>
            {result.isValid ? `$${result.intrinsicValue.toFixed(2)}` : 'N/A'}
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-8 bg-transparent">
        
        {/* SLIDERS PANEL */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
            <h4 className="text-[12px] uppercase font-bold text-zinc-500 tracking-[0.2em]">Projection Parameters</h4>
            
            <div className="flex bg-[#111111] border border-white/10 rounded overflow-hidden">
              <button onClick={() => applyScenario('BEAR')} className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeScenario === 'BEAR' ? 'bg-bear text-white' : 'text-zinc-500 hover:text-white'}`}>Bear</button>
              <button onClick={() => applyScenario('BASE')} className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase border-l border-r border-white/10 transition-colors ${activeScenario === 'BASE' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Base</button>
              <button onClick={() => applyScenario('BULL')} className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeScenario === 'BULL' ? 'bg-bull text-white' : 'text-zinc-500 hover:text-white'}`}>Bull</button>
            </div>
          </div>
          
          <SliderRow 
            label="Year 1-5 Growth" 
            value={growth1} 
            setValue={setGrowth1} 
            min={-0.2} max={0.5} step={0.01} 
            formatter={(v) => `+${(v * 100).toFixed(0)}%`}
          />
          <SliderRow 
            label="Year 6-10 Growth" 
            value={growth2} 
            setValue={setGrowth2} 
            min={-0.1} max={0.3} step={0.01} 
            formatter={(v) => `+${(v * 100).toFixed(0)}%`}
          />
          <SliderRow 
            label="Discount Rate (WACC)" 
            value={discountRate} 
            setValue={setDiscountRate} 
            min={0.04} max={0.20} step={0.005} 
            formatter={(v) => `${(v * 100).toFixed(1)}%`}
          />
          <SliderRow 
            label="Terminal Growth" 
            value={terminalGrowth} 
            setValue={setTerminalGrowth} 
            min={0.0} max={0.05} step={0.005} 
            formatter={(v) => `${(v * 100).toFixed(1)}%`}
          />
          
          <div className="pt-6 border-t border-white/10">
            <div className="flex justify-between items-center bg-transparent p-4 border border-white/10 shadow-none">
               <span className="text-[12px] text-zinc-400 font-bold uppercase tracking-widest">Margin of Safety</span>
               <span className={`text-[15px] font-bold font-mono tracking-tight ${marginOfSafety >= 0 ? 'text-bull' : 'text-bear'}`}>
                 {marginOfSafety > 0 ? '+' : ''}{marginOfSafety.toFixed(2)}%
               </span>
            </div>
          </div>
        </div>

        {/* MATH BREAKDOWN & "GLASS BOX" */}
        <div className="space-y-5 flex flex-col justify-between">
           <div>
              <h4 className="text-[11px] uppercase font-bold text-zinc-600 tracking-wider mb-4 border-b border-white/10 pb-2">Valuation Bridge</h4>
              <div className="space-y-2.5">
                <ValuationRow label="Current Free Cash Flow" value={fcf} />
                <div className="pl-4 border-l border-white/20 space-y-2.5 my-2">
                   <ValuationRow label="PV of Yr 1-10 Cash Flows" value={result.enterpriseValue - result.pvOfTerminalValue} dim />
                   <ValuationRow label="PV of Terminal Value" value={result.pvOfTerminalValue} dim />
                </div>
                <ValuationRow label="Enterprise Value" value={result.enterpriseValue} />
                <ValuationRow label="Add: Total Cash" value={cash} isAdd />
                <ValuationRow label="Less: Total Debt" value={debt} isSub />
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="min-w-[300px] space-y-2.5">
                    <ValuationRow label="Implied Equity Value" value={result.equityValue} bold />
                    <ValuationRow label="Shares Outstanding" value={shares} raw />
                  </div>
                </div>
              </div>
           </div>
           
           <div className="bg-transparent border border-white/10 p-5 flex gap-4 text-left shadow-none">
             <div className="text-zinc-500 mt-1">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                 <circle cx="12" cy="12" r="10" />
                 <line x1="12" y1="16" x2="12" y2="12" />
                 <line x1="12" y1="8" x2="12.01" y2="8" />
               </svg>
             </div>
             <div>
               <p className="text-[12px] uppercase font-bold text-zinc-300 tracking-[0.2em] mb-2">Algorithm Framework</p>
               <p className="text-[12px] text-zinc-400 leading-relaxed font-medium">
                 Our neural framework calculates intrinsic value by projecting future FCF yields and normalizing for systemic risk via the <strong>WACC Vector</strong>. 
                 The <strong>Terminal Velocity</strong> factor assume perpetual growth benchmarks at global GDP parity.
               </p>
             </div>
           </div>
        </div>

      </div>
    </section>
  );
});

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  setValue: (val: number) => void;
  min: number;
  max: number;
  step: number;
  formatter: (val: number) => string;
}

function SliderRow({ label, value, setValue, min, max, step, formatter }: SliderRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[12px]">
        <label className="font-bold text-zinc-400 tracking-widest uppercase">{label}</label>
        <span className="font-mono font-bold text-white bg-white/10 px-3 py-1 border border-white/20 shadow-none">{formatter(value)}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full h-[2px] bg-white/20 appearance-none cursor-pointer accent-white"
      />
    </div>
  );
}

interface ValuationRowProps {
  label: string;
  value: number;
  dim?: boolean;
  isAdd?: boolean;
  isSub?: boolean;
  bold?: boolean;
  raw?: boolean;
}

function ValuationRow({ label, value, dim, isAdd, isSub, bold, raw }: ValuationRowProps) {
  return (
    <div className={`flex justify-between items-center text-[12px] tabular-nums ${dim ? 'text-zinc-500' : 'text-zinc-200'} ${bold ? 'font-bold text-white text-[14px] pt-2' : 'font-medium'}`}>
      <span className="tracking-widest uppercase">
        {isAdd && '+ '}
        {isSub && '- '}
        {label}
      </span>
      <span className="font-mono">
        {raw ? fmtCount(value) : fmtBigNum(value)}
      </span>
    </div>
  );
}
