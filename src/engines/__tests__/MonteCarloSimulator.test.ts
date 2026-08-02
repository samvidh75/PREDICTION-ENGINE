import { describe, expect, it } from 'vitest';
import { MonteCarloSimulator } from '../MonteCarloSimulator.js';

describe('MonteCarloSimulator', () => {
  it('simulates portfolio outcomes', () => {
    const simulator = new MonteCarloSimulator({ simulations: 1000, timeHorizon: 252 });
    const result = simulator.simulate({
      initialPortfolioValue: 1000000,
      expectedReturn: 0.12,
      volatility: 0.18,
      weights: { RELIANCE: 0.5, INFY: 0.5 },
      assetVolatilities: { RELIANCE: 0.22, INFY: 0.18 },
      correlations: { RELIANCE: { INFY: 0.3, RELIANCE: 1 }, INFY: { RELIANCE: 0.3, INFY: 1 } },
    });

    expect(result.expectedFinalValue).toBeGreaterThan(0);
    expect(result.probabilityOfLoss).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfLoss).toBeLessThanOrEqual(1);
    expect(result.var95).toBeGreaterThan(0);
    expect(result.var99).toBeGreaterThan(0);
    expect(result.maxDrawdown).toBeGreaterThan(0);
    expect(result.paths.length).toBeLessThanOrEqual(100);
  });

  it('VaR 99 is larger than VaR 95', () => {
    const simulator = new MonteCarloSimulator({ simulations: 1000 });
    const result = simulator.simulate({
      initialPortfolioValue: 1000000,
      expectedReturn: 0.10,
      volatility: 0.20,
      weights: { A: 1 },
      assetVolatilities: { A: 0.20 },
      correlations: { A: { A: 1 } },
    });
    expect(result.var99).toBeGreaterThanOrEqual(result.var95);
  });

  it('handles extreme volatility gracefully', () => {
    const simulator = new MonteCarloSimulator({ simulations: 500 });
    const result = simulator.simulate({
      initialPortfolioValue: 100000,
      expectedReturn: 0.20,
      volatility: 0.60,
      weights: { A: 1 },
      assetVolatilities: { A: 0.60 },
      correlations: { A: { A: 1 } },
    });
    expect(result.expectedFinalValue).toBeGreaterThan(0);
    expect(result.worstCase).toBeGreaterThanOrEqual(0);
  });

  it('computes probability of target return', () => {
    const simulator = new MonteCarloSimulator({ simulations: 1000 });
    const input = {
      initialPortfolioValue: 1000000,
      expectedReturn: 0.15,
      volatility: 0.15,
      weights: { A: 1 },
      assetVolatilities: { A: 0.15 },
      correlations: { A: { A: 1 } },
    };
    const prob = simulator.estimateProbabilityOfTarget(input, 0.10);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });
});
