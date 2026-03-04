import { getFromCache, setInCache } from "./cache";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface OptionStrike {
  strike: number;
  callOI: number;
  putOI: number;
  callVol: number;
  putVol: number;
  callIV: number;
  putIV: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
}

export interface OptionsIntelligence {
  currentPrice: number;
  atmImpliedVolatility: number;
  expectedMovePercentage: number;
  expectedMoveDollars: number;
  upperBound: number;
  lowerBound: number;
  daysToExpiration: number;
  expirationDate: string;
  putCallRatio: number;
  strikes: OptionStrike[];
  zeroGammaLevel: number;
  gravityWells: number[];
  totalGEX: number;
  isValid: boolean;
}

// Standard Normal Cumulative Distribution Function
export function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Black-Scholes Gamma (same for Call and Put)
export function calculateGamma(S: number, K: number, T: number, sigma: number, r: number = 0.04): number {
  if (T <= 0 || sigma <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const npDF = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * d1 * d1);
  return npDF / (S * sigma * Math.sqrt(T));
}

export async function fetchOptionsIntelligence(ticker: string, currentPrice: number): Promise<OptionsIntelligence> {
  const CACHE_KEY = `options_intel_${ticker}_v1`;
  const cached = await getFromCache<OptionsIntelligence>(CACHE_KEY);
  if (cached) return cached;

  const emptyResult: OptionsIntelligence = {
    currentPrice,
    atmImpliedVolatility: 0,
    expectedMovePercentage: 0,
    expectedMoveDollars: 0,
    upperBound: 0,
    lowerBound: 0,
    daysToExpiration: 0,
    expirationDate: "",
    putCallRatio: 0,
    strikes: [],
    zeroGammaLevel: 0,
    gravityWells: [],
    totalGEX: 0,
    isValid: false
  };

  try {
    const chain = await yahooFinance.options(ticker);
    if (!chain || !chain.options || chain.options.length === 0) return emptyResult;

    // Pick the expiration that is closest to 30 days out to represent a standardized 1-month expected move.
    // If fewer than 30 days available, pick the latest.
    let targetOption = chain.options[0];
    let minDiff = Infinity;
    const targetMs = 30 * 24 * 60 * 60 * 1000;
    
    for (const opt of chain.options) {
      if (!opt.calls || opt.calls.length === 0) continue;
      const expDate = new Date(opt.calls[0].expiration);
      const diff = Math.abs((expDate.getTime() - Date.now()) - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        targetOption = opt;
      }
    }

    if (!targetOption.calls || targetOption.calls.length === 0) return emptyResult;

    // Find ATM (At-The-Money) strike
    let atmCall = targetOption.calls[0];
    let minStrikeDiff = Math.abs(currentPrice - atmCall.strike);

    for (const call of targetOption.calls) {
      const diff = Math.abs(currentPrice - call.strike);
      if (diff < minStrikeDiff) {
        minStrikeDiff = diff;
        atmCall = call;
      }
    }

    const atmIV = atmCall.impliedVolatility;
    if (!atmIV || atmIV <= 0) return emptyResult;

    const expirationDate = new Date(atmCall.expiration);
    const msToExpiration = expirationDate.getTime() - Date.now();
    const daysToExpiration = Math.max(1, msToExpiration / (1000 * 60 * 60 * 24)); // Minimum 1 day to prevent 0 division

    // Market Maker Expected Move Formula: Price * IV * sqrt(Days/365)
    // Sometimes a simpler rule of thumb for 1 StdDev is used: Price * IV * sqrt(Days/365)
    const expectedMovePercentage = atmIV * Math.sqrt(daysToExpiration / 365);
    const expectedMoveDollars = currentPrice * expectedMovePercentage;

    const upperBound = currentPrice + expectedMoveDollars;
    const lowerBound = Math.max(0, currentPrice - expectedMoveDollars);

    // Calculate Put/Call Ratio for this specific expiration (Open Interest bias)
    let totalCallOI = 0;
    let totalPutOI = 0;
    targetOption.calls.forEach((c: any) => totalCallOI += (c.openInterest || 0));
    targetOption.puts?.forEach((p: any) => totalPutOI += (p.openInterest || 0));
    
    const putCallRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

    // Build strikes map
    const strikesMap = new Map<number, OptionStrike>();
    const T = daysToExpiration / 365;

    targetOption.calls.forEach((c: any) => {
      const iv = c.impliedVolatility || 0;
      const gamma = calculateGamma(currentPrice, c.strike, T, iv);
      const callOI = c.openInterest || 0;
      
      strikesMap.set(c.strike, {
        strike: c.strike,
        callOI,
        putOI: 0,
        callVol: c.volume || 0,
        putVol: 0,
        callIV: iv,
        putIV: 0,
        callGamma: gamma,
        putGamma: 0,
        netGamma: gamma * callOI * 100 // Approximation of Dealer Call GEX (usually assumed long call -> short dealer -> positive gamma exposure)
      });
    });
    
    targetOption.puts?.forEach((p: any) => {
      const existing = strikesMap.get(p.strike);
      const iv = p.impliedVolatility || 0;
      const gamma = calculateGamma(currentPrice, p.strike, T, iv);
      const putOI = p.openInterest || 0;
      const putGEX = -gamma * putOI * 100; // Dealer short put -> long dealer -> negative gamma exposure

      if (existing) {
        existing.putOI = putOI;
        existing.putVol = p.volume || 0;
        existing.putIV = iv;
        existing.putGamma = gamma;
        existing.netGamma += putGEX;
      } else {
        strikesMap.set(p.strike, {
          strike: p.strike,
          callOI: 0,
          putOI,
          callVol: 0,
          putVol: p.volume || 0,
          callIV: 0,
          putIV: iv,
          callGamma: 0,
          putGamma: gamma,
          netGamma: putGEX
        });
      }
    });

    // Sort by strike and only keep those within a reasonable +/- 25% range of current price to save bandwidth
    const strikes = Array.from(strikesMap.values())
      .filter(s => s.strike > currentPrice * 0.75 && s.strike < currentPrice * 1.25)
      .sort((a, b) => a.strike - b.strike);

    let totalGEX = 0;
    strikes.forEach(s => totalGEX += s.netGamma);

    // Find Gravity Wells (Highest absolute netGamma)
    const gravityWells = [...strikes]
      .sort((a, b) => Math.abs(b.netGamma) - Math.abs(a.netGamma))
      .slice(0, 2)
      .map(s => s.strike);

    // Calculate Zero Gamma Level (Approximate point where Call GEX + Put GEX = 0)
    // A simple approximation is the strike where netGamma flips from positive to negative, 
    // or the strike with netGamma closest to 0 if we're interpolating.
    // For simplicity, we find the cumulative GEX and the flip point.
    let zeroGammaLevel = currentPrice;
    let minGammaAbs = Infinity;
    strikes.forEach(s => {
      if (Math.abs(s.netGamma) < minGammaAbs && s.callOI > 0 && s.putOI > 0) {
        minGammaAbs = Math.abs(s.netGamma);
        zeroGammaLevel = s.strike;
      }
    });

    const result: OptionsIntelligence = {
      currentPrice,
      atmImpliedVolatility: atmIV,
      expectedMovePercentage,
      expectedMoveDollars,
      upperBound,
      lowerBound,
      daysToExpiration: Math.round(daysToExpiration),
      expirationDate: expirationDate.toISOString(),
      putCallRatio,
      strikes,
      zeroGammaLevel,
      gravityWells,
      totalGEX,
      isValid: true
    };

    // Cache the options chain result for 1 hour to prevent scraping bans
    await setInCache(CACHE_KEY, result, 60 * 60 * 1000);
    return result;

  } catch (error) {
    console.warn(`[Options Intel] Failed to fetch chain for ${ticker}:`, error);
    return emptyResult;
  }
}
