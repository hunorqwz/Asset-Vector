import { OHLCV } from "./market-data";

export interface Trendline {
  p1: { time: number; price: number };
  p2: { time: number; price: number };
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number;
}

export function detectTrendlines(data: OHLCV[]): Trendline[] {
  if (data.length < 50) return [];

  const peaks: { time: number; price: number }[] = [];
  const troughs: { time: number; price: number }[] = [];

  // 1. Identify Pivots (Fractals)
  for (let i = 5; i < data.length - 5; i++) {
    const slice = data.slice(i - 5, i + 6);
    const max = Math.max(...slice.map(d => d.high));
    const min = Math.min(...slice.map(d => d.low));

    if (data[i].high === max) peaks.push({ time: data[i].time, price: data[i].high });
    if (data[i].low === min) troughs.push({ time: data[i].time, price: data[i].low });
  }

  const lines: Trendline[] = [];

  // 2. Identify Resitance Trendlines (Connecting Peaks)
  if (peaks.length >= 2) {
    for (let i = 0; i < peaks.length - 1; i++) {
      for (let j = i + 1; j < peaks.length; j++) {
        const p1 = peaks[i];
        const p2 = peaks[j];
        
        // Skip if too close in time
        if (p2.time - p1.time < 5 * 86400) continue;

        const slope = (p2.price - p1.price) / (p2.time - p1.time);
        
        // Resistance lines usually have 0 or negative slope
        if (slope > 0.0001) continue; 

        let touches = 0;
        let broken = false;

        // Check how many points follow this line
        for (let k = 0; k < data.length; k++) {
          const expectedPrice = p1.price + slope * (data[k].time - p1.time);
          const diff = Math.abs(data[k].high - expectedPrice) / expectedPrice;
          
          if (diff < 0.005) touches++;
          if (data[k].close > expectedPrice * 1.01) {
            // Price broke above the resistance
            if (data[k].time > p2.time) {
               broken = true;
               break;
            }
          }
        }

        if (touches >= 3 && !broken) {
          lines.push({ p1, p2, type: 'RESISTANCE', strength: touches });
        }
      }
    }
  }

  // 3. Identify Support Trendlines (Connecting Troughs)
  if (troughs.length >= 2) {
    for (let i = 0; i < troughs.length - 1; i++) {
      for (let j = i + 1; j < troughs.length; j++) {
        const p1 = troughs[i];
        const p2 = troughs[j];

        if (p2.time - p1.time < 5 * 86400) continue;

        const slope = (p2.price - p1.price) / (p2.time - p1.time);
        
        // Support lines usually have 0 or positive slope
        if (slope < -0.0001) continue;

        let touches = 0;
        let broken = false;

        for (let k = 0; k < data.length; k++) {
          const expectedPrice = p1.price + slope * (data[k].time - p1.time);
          const diff = Math.abs(data[k].low - expectedPrice) / expectedPrice;
          
          if (diff < 0.005) touches++;
          if (data[k].close < expectedPrice * 0.99) {
            // Price broke below the support
            if (data[k].time > p2.time) {
                broken = true;
                break;
            }
          }
        }

        if (touches >= 3 && !broken) {
          lines.push({ p1, p2, type: 'SUPPORT', strength: touches });
        }
      }
    }
  }

  // 4. Pruning: Keep only the most relevant lines to avoid chart clutter
  return lines
    .sort((a, b) => b.strength - a.strength)
    .filter((v, i, a) => a.findIndex(t => t.type === v.type) === i) // Keep best one of each type for now
    .slice(0, 2);
}
