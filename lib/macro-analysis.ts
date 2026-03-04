import { fetchFredSeries, FredObservation } from "./fred";

export interface MacroIndicator {
  seriesId: string;
  name: string;
  currentValue: number;
  previousValue: number;
  change: number;
  unit: 'pct' | 'index' | 'basis';
  status: 'UP' | 'DOWN' | 'STABLE';
  history: FredObservation[];
}

export type MacroRegime = 'GOLDILOCKS' | 'REFLATION' | 'STAGFLATION' | 'DEFLATION' | 'RECESSION' | 'NEUTRAL';

export interface MacroSnapshot {
  fedFunds: MacroIndicator;
  inflation: MacroIndicator;
  yieldCurve: MacroIndicator;
  unemployment: MacroIndicator;
  regime: MacroRegime;
  implications: string[];
}

export async function getMacroSnapshot(): Promise<MacroSnapshot> {
  const [fed, cpi, yieldCurve, unrate] = await Promise.all([
    fetchFredSeries('FEDFUNDS'),
    fetchFredSeries('CPIAUCSL'),
    fetchFredSeries('T10Y2Y'),
    fetchFredSeries('UNRATE')
  ]);

  const indicators = {
    fed: processIndicator('FEDFUNDS', 'Fed Funds Rate', fed, 'pct'),
    cpi: processCpiIndicator(cpi),
    yield: processIndicator('T10Y2Y', 'Yield Curve (10Y-2Y)', yieldCurve, 'index'),
    unrate: processIndicator('UNRATE', 'Unemployment', unrate, 'pct')
  };

  const regime = deriveRegime(indicators);
  const implications = deriveImplications(regime, indicators);

  return {
    fedFunds: indicators.fed,
    inflation: indicators.cpi,
    yieldCurve: indicators.yield,
    unemployment: indicators.unrate,
    regime,
    implications
  };
}

function processIndicator(id: string, name: string, data: FredObservation[], unit: 'pct' | 'index' | 'basis'): MacroIndicator {
  const current = data[0]?.value || 0;
  const prev = data[1]?.value || 0;
  const change = current - prev;
  
  return {
    seriesId: id,
    name,
    currentValue: current,
    previousValue: prev,
    change,
    unit,
    status: change > 0.01 ? 'UP' : change < -0.01 ? 'DOWN' : 'STABLE',
    history: data
  };
}

function processCpiIndicator(data: FredObservation[]): MacroIndicator {
  // CPI comes as an index; we need YoY % change
  // We'll calculate the % difference between latest and the observation 12 items ago (approx 1 year)
  const calculateYoY = (index: number) => {
    const current = data[index]?.value;
    const yearAgo = data[index + 12]?.value;
    if (!current || !yearAgo) return 0;
    return ((current - yearAgo) / yearAgo) * 100;
  };

  const currentYoY = calculateYoY(0);
  const prevYoY = calculateYoY(1);
  const change = currentYoY - prevYoY;

  return {
    seriesId: 'CPIAUCSL',
    name: 'Inflation (YoY %)',
    currentValue: currentYoY,
    previousValue: prevYoY,
    change,
    unit: 'pct',
    status: change > 0.1 ? 'UP' : change < -0.1 ? 'DOWN' : 'STABLE',
    history: data.slice(0, 24).map((o, i) => ({ date: o.date, value: calculateYoY(i) }))
  };
}

function deriveRegime(indicators: any): MacroRegime {
  const inf = indicators.cpi.currentValue;
  const infTrend = indicators.cpi.status;
  const yieldCurve = indicators.yield.currentValue;
  const unrateTrend = indicators.unrate.status;

  if (yieldCurve < 0 && unrateTrend === 'UP') return 'RECESSION';
  if (inf > 4 && infTrend === 'UP' && unrateTrend === 'UP') return 'STAGFLATION';
  if (infTrend === 'DOWN' && inf < 3 && yieldCurve > 0.2) return 'GOLDILOCKS';
  if (infTrend === 'UP' && yieldCurve > 1.0) return 'REFLATION';
  if (infTrend === 'DOWN' && yieldCurve < 0) return 'DEFLATION';

  return 'NEUTRAL';
}

function deriveImplications(regime: MacroRegime, indicators: any): string[] {
  const implications = [];
  
  switch(regime) {
    case 'GOLDILOCKS':
      implications.push("High institutional appetite for growth and tech equities.");
      implications.push("Low volatility regime; focus on quality compounders.");
      break;
    case 'STAGFLATION':
      implications.push("Defensive posture advised: Energy and Commodities outperform.");
      implications.push("Multiple compression risk for high-growth tech.");
      break;
    case 'RECESSION':
      implications.push("Flight to safety: Fixed Income and high-dividend defensive sectors.");
      implications.push("Yield curve inversion signaling structural economic stress.");
      break;
    case 'REFLATION':
      implications.push("Cyclical stocks (Banks, Industrials) likely to benefit from growth.");
      implications.push("Inflation protection through hard assets is prioritized.");
      break;
    default:
      implications.push("Mixed macro signals; focus on idiosyncratic stock-specific drivers.");
  }

  if (indicators.fed.status === 'UP') {
    implications.push("Federal Reserve tightening cycle increases cost of capital.");
  } else if (indicators.fed.status === 'DOWN') {
    implications.push("Monetary easing providing tailwinds for equity valuations.");
  }

  return implications;
}
