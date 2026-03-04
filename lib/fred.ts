import { getFromCache, setInCache } from "./cache";

const FRED_API_BASE = "https://api.stlouisfed.org/fred";
const MACRO_TTL = 12 * 60 * 60 * 1000; // 12 Hours (Economic data is slow moving)

export interface FredObservation {
  date: string;
  value: number;
}

export async function fetchFredSeries(seriesId: string): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  const cacheKey = `fred_series_${seriesId}`;
  
  if (!apiKey) {
    console.warn(`[FRED] No API Key found for macro data. Returning mock for ${seriesId}.`);
    return generateMockSeries(seriesId);
  }

  const cached = await getFromCache<FredObservation[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${FRED_API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=50`;
    
    // Add timeout to prevent hanging on network failure
    const res = await Promise.race([
      fetch(url),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
    ]);
    
    if (!res.ok) {
      throw new Error(`FRED API Error: ${res.statusText}`);
    }

    const data = await res.json();
    const observations = (data.observations || []).map((o: any) => ({
      date: o.date,
      value: parseFloat(o.value)
    })).filter((o: any) => !isNaN(o.value));

    await setInCache(cacheKey, observations, MACRO_TTL);
    return observations;
  } catch (err) {
    console.error(`[FRED Fetch Error] ${seriesId}:`, err);
    return generateMockSeries(seriesId);
  }
}

/**
 * Fallback generator for development/demonstration if no API key exists.
 */
function generateMockSeries(seriesId: string): FredObservation[] {
  const data: FredObservation[] = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    
    let val = 0;
    if (seriesId === 'FEDFUNDS') val = 5.33 - (i * 0.05);
    else if (seriesId === 'CPIAUCSL') val = 3.1 + (Math.sin(i / 5) * 0.5);
    else if (seriesId === 'T10Y2Y') val = -0.2 - (Math.cos(i / 4) * 0.3);
    else if (seriesId === 'UNRATE') val = 3.8 + (i * 0.02);
    else val = 100 + i;

    data.push({
      date: d.toISOString().split('T')[0],
      value: val
    });
  }
  return data;
}
