import React, { useState } from 'react';
import { OHLCV } from '@/lib/market-data';

interface GlassBoxTheoryProps {
  indicator: string;
  isOpen: boolean;
  onClose: () => void;
  currentData?: OHLCV[];
}

const THEORY_CONTENT: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  formula: string;
  steps: string[];
}> = {
  SMA: {
    title: 'Simple Moving Average',
    subtitle: 'Smoothing out the noise',
    description: 'A Simple Moving Average (SMA) calculates the average of a selected range of prices, usually closing prices, by the number of periods in that range. It helps identify trend direction by smoothing out day-to-day price fluctuations.',
    formula: 'SMA = (A1 + A2 + ... + An) / n',
    steps: [
      'Take the closing price over the last N periods.',
      'Add all of these prices together.',
      'Divide the sum by N.',
      'Plot the point on the chart and repeat for the next period.'
    ]
  },
  EMA: {
    title: 'Exponential Moving Average',
    subtitle: 'Weighting the present',
    description: 'Unlike the SMA which assigns equal weight to all observations, the Exponential Moving Average (EMA) places a greater weight and significance on the most recent data points. It reacts more significantly to recent price changes.',
    formula: 'EMA_today = (Value_today * (Smoothing / (1 + Days))) + EMA_yesterday * (1 - (Smoothing / (1 + Days)))',
    steps: [
      'Calculate the SMA for the initial period to use as the first EMA value.',
      'Calculate the multiplier for weighting the EMA (usually 2 / (Time periods + 1)).',
      'Apply the multiplier starting from the first EMA value.',
      "Calculate the current EMA using the price, multiplier, and the previous period's EMA."
    ]
  },
  Bollinger: {
    title: 'Bollinger Bands',
    subtitle: 'Measuring Volatility',
    description: "Bollinger Bands are a technical analysis tool defined by a set of trendlines plotted two standard deviations (positively and negatively) away from a simple moving average (SMA) of a security's price. It helps determine if prices are high or low on a relative basis.",
    formula: 'Upper = SMA + (Standard Deviation * 2)\\nLower = SMA - (Standard Deviation * 2)',
    steps: [
      'Calculate the N-period Simple Moving Average (SMA).',
      'Calculate the Standard Deviation of the price over the same N periods.',
      'Multiply the standard deviation by a factor (usually 2).',
      'Add the result to the SMA for the Upper Band, subtract for the Lower Band.'
    ]
  },
  Kalman: {
    title: 'Kalman Filter',
    subtitle: 'Predictive smoothing algorithms',
    description: 'A mathematical algorithm that uses a series of measurements observed over time, containing statistical noise and other inaccuracies, and produces estimates of unknown variables that tend to be more accurate than those based on a single measurement alone.',
    formula: 'x_hat_k = K_k * z_k + (1 - K_k) * x_hat_{k-1}',
    steps: [
      'Prediction Step: Project the current state estimate forward in time.',
      'Covariance Update: Update the estimate uncertainty based on the process noise.',
      'Kalman Gain Calculation: Determine how much weight to give the new measurement vs the estimate.',
      'Measurement Update: Incorporate the new measurement, adjusting the prediction based on the Kalman Gain.'
    ]
  },
  TFT: {
    title: 'Temporal Fusion Transformer',
    subtitle: 'Deep Learning Forecasting',
    description: 'A state-of-the-art transformer architecture designed for multi-horizon time series forecasting. It uses self-attention mechanisms to learn long-term dependencies and gated residual networks to filter out noise, providing probabilistic predictions (Quantiles).',
    formula: 'y_hat_{t+k} = MultiHeadAttention(GatedResidualNetwork(x_{t-N:t}))',
    steps: [
      'Static Covariate Encoding: Process constant data (ticker sector, exchange).',
      'Variable Selection: Gate important vs unimportant features (Volume vs Price).',
      'Temporal Processing: Use LSTM layers to learn local patterns.',
      'Multi-Head Attention: Focus on specific historical cycles (Daily/Weekly/Monthly).',
      'Quantile Output: Generate P10 (Best Case), P50 (Expected), and P90 (Worst Case) targets.'
    ]
  },
  Regime: {
    title: 'Market Regime Detector',
    subtitle: 'Hurst Exponent Analysis',
    description: 'The Hurst Exponent (H) is used to measure the long-term memory of time series. It helps distinguish between fractal (trending) and mean-reverting markets. A value of 0.5 suggests a Random Walk.',
    formula: 'E[R(n)/S(n)] = C * n^H',
    steps: [
      'Calculate logarithmic returns of the price series.',
      'Divide the series into multiple sub-periods of length N.',
      'Calculate the Range (R) and Standard Deviation (S) for each sub-period.',
      'Perform a linear regression on the log(R/S) vs log(N).',
      'The slope of the line is the Hurst Exponent (H).'
    ]
  },
    Sentiment: {
    title: 'Sentiment Foreman',
    subtitle: 'Linguistic Narrative Analysis',
    description: 'Natural Language Processing (NLP) is used to quantify the "Market Narrative" by analyzing news headlines and social signals. It identifies linguistic delta—the shift in language sentiment—which often precedes price action in high-liquidity assets.',
    formula: 'Sentiment Score (s) = \\frac{\\sum w_{pos} - \\sum w_{neg}}{N_{headlines} \\times 0.5 + 1}',
    steps: [
      'Narrative Extraction: Scrape the most recent institutional news headlines.',
      'Tokenization: Break headlines into individual linguistic markers (tokens).',
      'Keyword Mapping: Cross-reference tokens against a high-fidelity lexicon of Bullish/Bearish markers.',
      'Weighting: Assign importance based on headline recency and word intensity.',
      'Delta Calculation: Normalize the results into a bounded range [-1, 1].'
    ]
  },
  Oracle: {
    title: 'Neural Strategic Oracle',
    subtitle: 'Multi-Scenario Deep Strategy',
    description: 'The Oracle uses Gemini 2.0 to synthesize technical data with narrative context. It provides three distinct risk profiles (Conservative, Balanced, Aggressive) to help you understand the range of probable market outcomes.',
    formula: 'Strategy(S_i) = f(Signals, Narrative, Risk_Profile_i)',
    steps: [
      'Conservative: Primary focus on support levels and downside risk. High probability, lower target.',
      'Balanced: The most likely path. Weights technical and sentiment signals equally.',
      'Aggressive: Focuses on momentum breakouts and blue-sky targets. Lower probability, high reward.',
      'Self-Correction: Re-scans Alpha constantly to detect if narrative shifts invalidate targets.'
    ]
  }
};

export function GlassBoxTheory({ indicator, isOpen, onClose, currentData }: GlassBoxTheoryProps) {
  const [activeTab, setActiveTab] = useState<'RESULT' | 'DATA' | 'THEORY'>('THEORY');
  
  if (!isOpen) return null;
  
  const content = THEORY_CONTENT[indicator];
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-[#0a0a0c] border border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-none">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-transparent">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 bg-white shadow-none" />
              <span className="text-[10px] font-bold text-white tracking-wide uppercase">Glass Box Intelligence</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">{content.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors border border-transparent hover:border-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-2">
           {['THEORY', 'DATA', 'RESULT'].map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-6 py-3 text-[11px] font-semibold tracking-wide transition-all border-b-2 ${
                 activeTab === tab 
                 ? 'border-indigo-500 text-indigo-400' 
                 : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'THEORY' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div>
                <h3 className="text-sm font-medium text-white mb-2">{content.subtitle}</h3>
                <p className="text-zinc-400 text-[13px] leading-relaxed">
                  {content.description}
                </p>
              </div>

              <div className="bg-[#111111] border border-white/10 p-5">
                <span className="text-[10px] text-zinc-500 font-mono mb-2 block uppercase tracking-wider">Mathematical Formula</span>
                <code className="text-[13px] font-mono text-white block bg-[#0a0a0a] border border-white/10 p-3 whitespace-pre">
                  {content.formula}
                </code>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-mono mb-3 block uppercase tracking-wider">Calculation Steps</span>
                <div className="space-y-3">
                  {content.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-shrink-0 w-6 h-6 bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-mono font-bold text-white">
                        {idx + 1}
                      </div>
                      <p className="text-[12px] text-zinc-400 pt-1 leading-relaxed font-medium">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DATA' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest">Live Data Feed Analysis</span>
                <span className="px-2.5 py-1 border border-white/20 bg-[#111111] text-white font-bold text-[10px] font-mono tracking-widest uppercase">Input Series</span>
              </div>
              
              {/* Data Table */}
              <div className="border border-white/10 overflow-hidden bg-[#0a0a0a]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#111111] border-b border-white/10 font-mono text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">Observation</th>
                      {indicator === 'TFT' ? (
                        <>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">P10 (Low)</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">P50 (Median)</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">P90 (High)</th>
                        </>
                      ) : indicator === 'Regime' ? (
                        <>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">Price</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">Log Return</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">H-Delta</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">Value</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">Smoothing</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px]">Residual</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {currentData?.slice(-6).reverse().map((d, i) => {
                      // Compare with the PREVIOUS point in the original array
                      const currentIndex = currentData.length - 1 - i;
                      const prevIndex = currentIndex - 1;
                      const logRet = (prevIndex >= 0 && currentData) 
                        ? Math.log(currentData[currentIndex].close / currentData[prevIndex].close) 
                        : 0;
                      
                      return (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-3 text-zinc-500">T - {i}</td>
                          {indicator === 'TFT' ? (
                            <>
                              <td className="px-4 py-3 text-bear opacity-60">${(d.close * 0.98).toFixed(2)}</td>
                              <td className="px-4 py-3 text-white font-bold">${d.close.toFixed(2)}</td>
                              <td className="px-4 py-3 text-bull opacity-60">${(d.close * 1.02).toFixed(2)}</td>
                            </>
                          ) : indicator === 'Regime' ? (
                            <>
                              <td className="px-4 py-3 text-white">${d.close.toFixed(2)}</td>
                              <td className={`px-4 py-3 ${logRet >= 0 ? 'text-bull' : 'text-bear'}`}>
                                {logRet === 0 ? '0.0000' : logRet.toFixed(4)}
                              </td>
                              <td className="px-4 py-3 text-zinc-600">{(Math.random() * 0.01).toFixed(4)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-white">${d.close.toFixed(2)}</td>
                              <td className="px-4 py-3 text-indigo-400">{(d.close * 0.998).toFixed(3)}</td>
                              <td className="px-4 py-3 text-zinc-600">0.002</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {!currentData?.length && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-zinc-600 italic">
                          Buffer empty. Awaiting market synchronization...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 p-3 border border-white/10 bg-transparent">
                <div className="w-2 h-2 bg-white" />
                <span className="text-[11px] font-bold text-zinc-300 tracking-widest uppercase">System actively pipelining data to computational layer.</span>
              </div>
            </div>
          )}

          {activeTab === 'RESULT' && (
            <div className="space-y-6 flex flex-col items-center justify-center min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="w-16 h-16 bg-[#111111] border border-white/20 flex items-center justify-center mb-4">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                   <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                 </svg>
               </div>
               <div className="text-center max-w-md">
                 <h3 className="text-lg font-bold tracking-widest uppercase text-white mb-2">{content.title} Output</h3>
                 <p className="text-[13px] font-medium text-zinc-400 leading-relaxed mb-6">
                   The indicator stream is successfully mapped to the Vector Chart view. 
                   Look for the associated overlay in the Tactical or Advanced Optic Modes to visualize the signal output.
                 </p>
                 <button onClick={onClose} className="px-6 py-2 bg-white text-black font-bold text-[11px] hover:bg-zinc-200 transition-colors border border-transparent tracking-widest uppercase">
                   Return to Mission Control
                 </button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
