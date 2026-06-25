import { describe, it, expect } from 'vitest';
import { localPrecisionForecast, runWalkForwardFeedback } from '../lib/local-forecast';

describe('Adaptive Error-Feedback Loops (Online Learning)', () => {
  // Generate a mock sequence of 50 bars
  // Format: [open, high, low, close, volume]
  const generateMockSequence = (length: number, basePrice: number, dailyReturn: number = 0.001): number[][] => {
    const seq: number[][] = [];
    let price = basePrice;
    for (let i = 0; i < length; i++) {
      price = price * (1 + dailyReturn);
      seq.push([price * 0.99, price * 1.01, price * 0.98, price, 1000000]);
    }
    return seq;
  };

  it('correctly calculates bias and RMSE on a simulated sequence', () => {
    const seq = generateMockSequence(50, 100, 0.002);
    const feedback = runWalkForwardFeedback(seq, 0.2, 1);

    expect(feedback.isValid).toBe(true);
    // Since it's a trended sequence, there should be a systematic prediction error (bias)
    expect(feedback.rmse).toBeGreaterThan(0);
    expect(Math.abs(feedback.bias)).toBeGreaterThan(0);
  });

  it('returns invalid state for sequences with insufficient history (< 40 bars)', () => {
    const seq = generateMockSequence(30, 100);
    const feedback = runWalkForwardFeedback(seq, 0.2, 1);

    expect(feedback.isValid).toBe(false);
    expect(feedback.bias).toBe(0);
    expect(feedback.rmse).toBe(0);
  });

  it('applies systematic drift correction bias to forecast price', () => {
    const seq = generateMockSequence(50, 100, 0.001); // Gentle uptrend to prevent hitting the hard drift cap

    // Run prediction with feedback disabled
    const noFeedback = localPrecisionForecast(
      seq,
      0.2,
      "1D",
      undefined,
      1, // barsPerDay
      20, // vix
      1.0, // beta
      'NEUTRAL',
      3.5, // creditSpread
      undefined, // macroSnapshot
      null, // optionsIntel
      true // disableFeedback = true
    );

    // Run prediction with feedback enabled
    const withFeedback = localPrecisionForecast(
      seq,
      0.2,
      "1D",
      undefined,
      1,
      20,
      1.0,
      'NEUTRAL',
      3.5,
      undefined,
      null,
      false // disableFeedback = false
    );

    // Because the stock is in an uptrend, OLS/Kalman will systematically underpredict
    // the next step (bias > 0). Proportional feedback will add a positive correction factor,
    // making the feedback-enabled forecast (p50) higher than the baseline.
    expect(withFeedback.p50).toBeGreaterThan(noFeedback.p50);
  });

  it('widens the uncertainty cone and dampens confidence when RMSE is high', () => {
    // Generate a highly volatile, noisy sequence to increase RMSE
    const seq: number[][] = [];
    let price = 100;
    for (let i = 0; i < 50; i++) {
      // Alternate returns sharply to confuse linear trend estimators
      const ret = i % 2 === 0 ? 0.08 : -0.07;
      price = price * (1 + ret);
      seq.push([price * 0.95, price * 1.05, price * 0.94, price, 1000000]);
    }

    // Run prediction with feedback disabled
    const noFeedback = localPrecisionForecast(
      seq,
      0.2,
      "1D",
      undefined,
      1,
      20,
      1.0,
      'NEUTRAL',
      3.5,
      undefined,
      null,
      true
    );

    // Run prediction with feedback enabled
    const withFeedback = localPrecisionForecast(
      seq,
      0.2,
      "1D",
      undefined,
      1,
      20,
      1.0,
      'NEUTRAL',
      3.5,
      undefined,
      null,
      false
    );

    const noFeedbackCone = noFeedback.p90 - noFeedback.p10;
    const withFeedbackCone = withFeedback.p90 - withFeedback.p10;

    // Error-feedback loop should expand the volatility multiplier (widening the uncertainty cone)
    expect(withFeedbackCone).toBeGreaterThan(noFeedbackCone);
    // Error-feedback loop should penalize the prediction confidence score
    expect(withFeedback.confidence).toBeLessThan(noFeedback.confidence);
  });
});
