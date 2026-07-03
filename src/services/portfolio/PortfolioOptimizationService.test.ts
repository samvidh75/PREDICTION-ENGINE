import { describe, expect, it } from 'vitest';
import { optimizePortfolio, runPortfolioStressTest } from './PortfolioOptimizationService';

describe('PortfolioOptimizationService', () => {
  it('optimizes allocations toward stronger return-to-volatility profiles', () => {
    const result = optimizePortfolio([
      { symbol: 'RELIANCE', expectedReturn: 0.16, volatility: 0.22, currentWeight: 0.4, sector: 'Energy' },
      { symbol: 'INFY', expectedReturn: 0.14, volatility: 0.18, currentWeight: 0.35, sector: 'Technology' },
      { symbol: 'ITC', expectedReturn: 0.1, volatility: 0.12, currentWeight: 0.25, sector: 'Consumer' },
    ]);

    expect(result.allocations).toHaveLength(3);
    expect(result.allocations[0].symbol).toBe('ITC');
    expect(result.expectedPortfolioReturn).toBeGreaterThan(0.11);
    expect(result.expectedPortfolioVolatility).toBeGreaterThan(0);
  });

  it('surfaces concentration diagnostics when targets cluster too tightly', () => {
    const result = optimizePortfolio([
      { symbol: 'A', expectedReturn: 0.4, volatility: 0.1, currentWeight: 0.34 },
      { symbol: 'B', expectedReturn: 0.3, volatility: 0.1, currentWeight: 0.33 },
      { symbol: 'C', expectedReturn: 0.2, volatility: 0.1, currentWeight: 0.33 },
    ]);

    expect(result.concentrationScore).toBeGreaterThan(65);
    expect(result.diagnostics[0]).toContain('Top three positions');
  });

  it('runs a scenario stress test with sector shocks', () => {
    const result = runPortfolioStressTest(
      [
        { symbol: 'RELIANCE', expectedReturn: 0.16, volatility: 0.22, currentWeight: 0.5, sector: 'Energy' },
        { symbol: 'INFY', expectedReturn: 0.14, volatility: 0.18, currentWeight: 0.5, sector: 'Technology' },
      ],
      {
        name: 'Oil Shock',
        marketShockPct: -8,
        sectorShocks: { Energy: -5, Technology: -1 },
      },
    );

    expect(result.largestDetractor).toBe('RELIANCE');
    expect(result.expectedPortfolioMovePct).toBeLessThan(0);
    expect(result.holdings).toHaveLength(2);
  });
});
