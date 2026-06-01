import { describe, it, expect } from 'vitest';
import { detectForensicAlerts } from '../lib/forensic-analyst';
import { MarketSignal } from '../lib/market-data';

const createBaseSignal = (): MarketSignal => ({
  ticker: 'AAPL',
  price: 100,
  smoothPrice: 100,
  uncertainty: 0.1,
  snr: 10,
  trend: 'NEUTRAL',
  regime: 'MEAN_REVERSION',
  predictability: 0.5,
  sentiment: {
    score: 0,
    isInsufficientData: false,
    label: 'NEUTRAL',
    velocity: 0,
    drift: 'STABLE',
    drivers: [],
    headlineCount: 10,
    integrityScore: 1.0,
    isConflicted: false
  },
  history: [
    { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
    { time: 2, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
    { time: 3, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
    { time: 4, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
    { time: 5, open: 100, high: 101, low: 99, close: 100, volume: 1000 }
  ],
  news: [],
  tech: {
    isValid: true,
    confluenceScore: 50,
    rsi14: 50,
    macd: { line: 0, signal: 0, histogram: 0 },
    bollingerBands: { upper: 110, middle: 100, lower: 90, percentB: 0.5 },
    volatilityCompression: { isSqueezing: false, compressionScore: 0 },
    adx: 20,
    signal: 'NEUTRAL',
    predictivePivots: null,
    fibonacci: null,
    orderBlocks: [],
    darkPoolBlocks: []
  },
  synthesis: {
    signal: 'NEUTRAL',
    score: 50,
    sentimentPriceDivergence: 'NONE',
    confidence: 'High',
    primaryDriver: 'None'
  }
});

describe('Forensic Analyst Rules Engine', () => {

  it('detects thin-volume volume-price divergence', () => {
    const signal = createBaseSignal();
    signal.price = 102.5; // rising price (>1.5%)
    signal.history = [
      { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
      { time: 2, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 3, open: 100.5, high: 101, low: 99, close: 101, volume: 1000 },
      { time: 4, open: 101, high: 102, low: 100, close: 101.5, volume: 1000 },
      // volume (500) is 50% below the average volume of 1000
      { time: 5, open: 101.5, high: 103, low: 101, close: 102.5, volume: 500 }
    ];

    const alerts = detectForensicAlerts(signal);
    const volAlert = alerts.find(a => a.id === 'divergence_volume_price_bullish');
    expect(volAlert).toBeDefined();
    expect(volAlert?.severity).toBe('WARNING');
    expect(volAlert?.insightKey).toBe('TRADING_VOLUME');
  });

  it('detects unmitigated order block retests', () => {
    const signal = createBaseSignal();
    signal.price = 95;
    signal.orderBlocks = [
      {
        type: 'BULLISH',
        top: 98,
        bottom: 92,
        date: '2026-05-20',
        strength: 5,
        isMitigated: false
      }
    ];

    const alerts = detectForensicAlerts(signal);
    const obAlert = alerts.find(a => a.id === 'divergence_order_block_bullish');
    expect(obAlert).toBeDefined();
    expect(obAlert?.severity).toBe('WARNING');
    expect(obAlert?.insightKey).toBe('CONFLUENCE_SCORE');
  });

  it('detects narrative and technical conflict decoupling', () => {
    const signal = createBaseSignal();
    signal.sentiment.score = 0.45; // bullish
    signal.tech.signal = 'SELL'; // bearish

    const alerts = detectForensicAlerts(signal);
    const conflictAlert = alerts.find(a => a.id === 'conflict_narrative_bearish_tech');
    expect(conflictAlert).toBeDefined();
    expect(conflictAlert?.severity).toBe('CRITICAL');
    expect(conflictAlert?.insightKey).toBe('CONFLUENCE_SCORE');
  });

  it('detects overbought overextensions', () => {
    const signal = createBaseSignal();
    signal.tech.rsi14 = 82;
    signal.tech.bollingerBands.percentB = 0.98;

    const alerts = detectForensicAlerts(signal);
    const rsiAlert = alerts.find(a => a.id === 'risk_rsi_overbought');
    expect(rsiAlert).toBeDefined();
    expect(rsiAlert?.severity).toBe('WARNING');
    expect(rsiAlert?.insightKey).toBe('SHARPE_RATIO');
  });

  it('detects random walk noise regimes', () => {
    const signal = createBaseSignal();
    signal.predictability = 0.15; // predictability < 0.25

    const alerts = detectForensicAlerts(signal);
    const noiseAlert = alerts.find(a => a.id === 'risk_random_walk');
    expect(noiseAlert).toBeDefined();
    expect(noiseAlert?.severity).toBe('NOTICE');
    expect(noiseAlert?.insightKey).toBe('HURST_EXPONENT');
  });
});
