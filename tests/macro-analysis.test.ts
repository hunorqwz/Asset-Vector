import { describe, it, expect, vi } from 'vitest';
import { getMacroSnapshot } from '../lib/macro-analysis';
import * as fred from '../lib/fred';

vi.mock('../lib/fred', () => ({
  fetchFredSeries: vi.fn()
}));

describe('Macro Analysis Engine', () => {
  it('identifies Goldilocks regime (Low Inflation, Positive Yield Curve)', async () => {
    (fred.fetchFredSeries as any).mockImplementation((seriesId: string) => {
      if (seriesId === 'CPIAUCSL') {
        const obs = new Array(30).fill(0).map((_, i) => ({ 
          date: '2024-01-01', 
          value: 300 // Baseline
        }));
        // Goldilocks: current is 306 (2%), prev is 309 (3%) -> DOWN trend
        obs[0].value = 306;
        obs[1].value = 309; 
        obs[12].value = 300;
        obs[13].value = 300;
        return Promise.resolve(obs);
      }
      if (seriesId === 'T10Y2Y') return Promise.resolve([{ value: 0.5 }, { value: 0.4 }]);
      if (seriesId === 'UNRATE') return Promise.resolve([{ value: 3.5 }, { value: 3.5 }]);
      if (seriesId === 'FEDFUNDS') return Promise.resolve([{ value: 5.0 }, { value: 5.0 }]);
      return Promise.resolve([]);
    });

    const snapshot = await getMacroSnapshot();
    expect(snapshot.regime).toBe('GOLDILOCKS');
  });

  it('identifies Recession (Inverted Curve, Rising Unemployment)', async () => {
    (fred.fetchFredSeries as any).mockImplementation((seriesId: string) => {
      if (seriesId === 'T10Y2Y') return Promise.resolve([{ value: -0.5 }, { value: -0.4 }]);
      if (seriesId === 'UNRATE') return Promise.resolve([{ value: 4.5 }, { value: 4.0 }]);
      if (seriesId === 'CPIAUCSL') return Promise.resolve(new Array(30).fill(0).map(() => ({ value: 300 })));
      if (seriesId === 'FEDFUNDS') return Promise.resolve([{ value: 5.0 }, { value: 5.0 }]);
      return Promise.resolve([]);
    });

    const snapshot = await getMacroSnapshot();
    expect(snapshot.regime).toBe('RECESSION');
  });

  it('derives correct implications for Stagflation', async () => {
     (fred.fetchFredSeries as any).mockImplementation((seriesId: string) => {
      if (seriesId === 'CPIAUCSL') {
        const obs = new Array(30).fill(0).map((_, i) => ({ 
          date: '2024-01-01', 
          value: 300 
        }));
        // Stagflation: current is 315, year ago is 300 -> 5% YoY
        obs[0].value = 315;
        obs[1].value = 314; // Rising trend
        obs[12].value = 300;
        obs[13].value = 300;
        return Promise.resolve(obs);
      }
      if (seriesId === 'UNRATE') return Promise.resolve([{ value: 5.0 }, { value: 4.8 }]);
      if (seriesId === 'T10Y2Y') return Promise.resolve([{ value: 0.1 }, { value: 0.1 }]);
      if (seriesId === 'FEDFUNDS') return Promise.resolve([{ value: 5.0 }, { value: 5.0 }]);
      return Promise.resolve([]);
    });

    const snapshot = await getMacroSnapshot();
    expect(snapshot.regime).toBe('STAGFLATION');
    expect(snapshot.implications).toContain("Defensive posture advised: Energy and Commodities outperform.");
  });

  it('derives correct implications for Recession', async () => {
    (fred.fetchFredSeries as any).mockImplementation((seriesId: string) => {
      if (seriesId === 'T10Y2Y') return Promise.resolve([{ value: -0.5 }, { value: -0.4 }]);
      if (seriesId === 'UNRATE') return Promise.resolve([{ value: 4.5 }, { value: 4.0 }]);
      if (seriesId === 'CPIAUCSL') return Promise.resolve(new Array(30).fill(0).map(() => ({ value: 300 })));
      if (seriesId === 'FEDFUNDS') return Promise.resolve([{ value: 5.0 }, { value: 5.0 }]);
      return Promise.resolve([]);
    });

    const snapshot = await getMacroSnapshot();
    expect(snapshot.regime).toBe('RECESSION');
    expect(snapshot.implications).toContain("Flight to safety: Fixed Income and high-dividend defensive sectors.");
  });
});
