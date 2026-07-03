import { describe, expect, it } from 'vitest';
import { MarkowitzOptimizer } from '../MarkowitzOptimizer.js';

describe('MarkowitzOptimizer', () => {
  it('computes efficient frontier with 2+ assets', () => {
    const optimizer = new MarkowitzOptimizer();
    const assets = [
      { symbol: 'RELIANCE', expectedReturn: 0.16, volatility: 0.22 },
      { symbol: 'INFY', expectedReturn: 0.14, volatility: 0.18 },
      { symbol: 'ITC', expectedReturn: 0.10, volatility: 0.12 },
    ];
    const covMatrix = optimizer.computeCovarianceMatrix(assets);
    const result = optimizer.computeEfficientFrontier(assets, covMatrix, 20);

    expect(result.efficientFrontier.length).toBeGreaterThan(0);
    expect(result.maxSharpePortfolio.sharpe).toBeGreaterThan(0);
    expect(result.minVolatilityPortfolio.volatility).toBeGreaterThan(0);
    expect(result.maxSharpePortfolio.allocations).toBeDefined();
  });

  it('returns single asset output for single asset', () => {
    const optimizer = new MarkowitzOptimizer();
    const assets = [{ symbol: 'RELIANCE', expectedReturn: 0.16, volatility: 0.22 }];
    const covMatrix = optimizer.computeCovarianceMatrix(assets);
    const result = optimizer.computeEfficientFrontier(assets, covMatrix);
    expect(result.efficientFrontier).toHaveLength(1);
    expect(result.maxSharpePortfolio.allocations).toEqual({ RELIANCE: 1 });
  });

  it('allocations sum to approximately 1', () => {
    const optimizer = new MarkowitzOptimizer();
    const assets = [
      { symbol: 'A', expectedReturn: 0.12, volatility: 0.15 },
      { symbol: 'B', expectedReturn: 0.15, volatility: 0.20 },
      { symbol: 'C', expectedReturn: 0.08, volatility: 0.10 },
    ];
    const covMatrix = optimizer.computeCovarianceMatrix(assets);
    const result = optimizer.computeEfficientFrontier(assets, covMatrix, 10);

    for (const point of result.efficientFrontier) {
      const total = Object.values(point.allocations).reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(1, 1);
    }
  });

  it('covariance matrix has correct dimensions', () => {
    const optimizer = new MarkowitzOptimizer();
    const assets = [
      { symbol: 'A', expectedReturn: 0.1, volatility: 0.2 },
      { symbol: 'B', expectedReturn: 0.1, volatility: 0.2 },
      { symbol: 'C', expectedReturn: 0.1, volatility: 0.2 },
    ];
    const cm = optimizer.computeCovarianceMatrix(assets);
    expect(cm.symbols).toHaveLength(3);
    expect(cm.matrix).toHaveLength(3);
    expect(cm.matrix[0]).toHaveLength(3);
  });
});
