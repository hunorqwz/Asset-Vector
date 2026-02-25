import { describe, expect, it } from 'vitest';
import { runMonteCarloSimulation, MonteCarloParams } from './monte-carlo';

describe('Monte Carlo Simulation', () => {
    it('returns an empty invalid result if there are less than 30 days of history', () => {
        const params: MonteCarloParams = {
            currentPrice: 100,
            historicalPrices: [100, 101, 102], // Only 3 days
            daysToSimulate: 90,
            simulations: 100
        };

        const result = runMonteCarloSimulation(params);
        expect(result.isValid).toBe(false);
        expect(result.expectedPrice).toBe(0);
        expect(result.paths.length).toBe(0);
    });

    it('returns an empty invalid result if current price is zero or negative', () => {
        const prices = Array.from({ length: 40 }, () => 100);
        const params: MonteCarloParams = {
            currentPrice: 0,
            historicalPrices: prices,
            daysToSimulate: 90,
            simulations: 100
        };

        const result = runMonteCarloSimulation(params);
        expect(result.isValid).toBe(false);
    });

    it('calculates a valid simulation for normal 30+ day data', () => {
        // Create 40 days of history, slightly trending up
        const prices = Array.from({ length: 40 }, (_, i) => 100 + (i * 0.1));
        const params: MonteCarloParams = {
            currentPrice: prices[39], // Today is 103.9
            historicalPrices: prices,
            daysToSimulate: 10,
            simulations: 100
        };

        const result = runMonteCarloSimulation(params);
        expect(result.isValid).toBe(true);

        // Expected final price should be a number, not NaN
        expect(Number.isNaN(result.expectedPrice)).toBe(false);
        // Best case vs Worst case relationship holds and they are distinct
        expect(result.percentile95th).toBeGreaterThan(result.percentile5th);

        // It should still only return 5 paths for the UI, regardless of `simulations: 100`!
        expect(result.paths.length).toBeLessThanOrEqual(5);

        // The first point of every single structural path must be currentPrice
        const firstPathPoints = result.paths[0];
        if (firstPathPoints && firstPathPoints.length > 0) {
            expect(firstPathPoints[0].price).toBe(params.currentPrice);
            // It must be day 0
            expect(firstPathPoints[0].day).toBe(0);
        }
    });

    it('handles flat prices (zero volatility) without crashing (division by zero)', () => {
        const prices = Array.from({ length: 40 }, () => 100);
        const params: MonteCarloParams = {
            currentPrice: 100,
            historicalPrices: prices,
            daysToSimulate: 10,
            simulations: 10
        };

        const result = runMonteCarloSimulation(params);
        
        // Due to the GBM box-muller math, zero volatility means log returns are array of 0s. 
        // Volatility calculation (stddev) becomes 0. Mathematical shock becomes 0.
        // Therefore, the price never moves from 100.
        expect(result.isValid).toBe(true);
        expect(result.expectedPrice).toBeCloseTo(100, 2);
        expect(result.percentile5th).toBeCloseTo(100, 2);
        expect(result.percentile95th).toBeCloseTo(100, 2);
    });
});
