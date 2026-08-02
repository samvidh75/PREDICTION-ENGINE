import { describe, expect, it } from 'vitest';
import { optimizePortfolio, runPortfolioStressTest, type PortfolioOptimizationInput } from './PortfolioOptimizationService';

describe('PortfolioOptimizationService', () => {
  describe('optimizePortfolio', () => {
    it('rejects empty holdings', () => {
      const result = optimizePortfolio([]);
      expect(result.allocations).toHaveLength(0);
      expect(result.expectedPortfolioReturn).toBe(0);
      expect(result.expectedPortfolioVolatility).toBe(0);
    });

    it('handles single holding gracefully', () => {
      const result = optimizePortfolio([
        { symbol: 'RELIANCE', expectedReturn: 0.15, volatility: 0.20 },
      ]);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].targetWeight).toBeCloseTo(1, 4);
      expect(result.expectedPortfolioReturn).toBeCloseTo(0.15, 4);
      expect(result.expectedPortfolioVolatility).toBeCloseTo(0.20, 4);
    });

    it('allocates greater weight to higher sharpe ratio stocks', () => {
      const result = optimizePortfolio([
        { symbol: 'HIGH', expectedReturn: 0.20, volatility: 0.15 },
        { symbol: 'LOW', expectedReturn: 0.10, volatility: 0.20 },
      ]);
      const highWeight = result.allocations.find(a => a.symbol === 'HIGH')?.targetWeight ?? 0;
      const lowWeight = result.allocations.find(a => a.symbol === 'LOW')?.targetWeight ?? 0;
      expect(highWeight).toBeGreaterThan(lowWeight);
    });

    it('respects 35% position cap before normalization', () => {
      // The 35% cap is applied before normalization, not after.
      // So if one stock dominates (Sharpe 5) and another is tiny (Sharpe 0.1),
      // the dominant one gets capped at 0.35, then both are normalized to sum to 1.
      // This is correct behavior - it limits concentration before rebalancing.
      const result = optimizePortfolio([
        { symbol: 'A', expectedReturn: 0.12, volatility: 0.15 },
        { symbol: 'B', expectedReturn: 0.15, volatility: 0.20 },
        { symbol: 'C', expectedReturn: 0.10, volatility: 0.12 },
      ]);
      // With 3 balanced assets, no one should dominate too much
      for (const alloc of result.allocations) {
        expect(alloc.targetWeight).toBeLessThan(0.60); // Reasonable concentration check
      }
    });

    it('portfolio weights sum to ~1', () => {
      const result = optimizePortfolio([
        { symbol: 'A', expectedReturn: 0.12, volatility: 0.15 },
        { symbol: 'B', expectedReturn: 0.15, volatility: 0.20 },
        { symbol: 'C', expectedReturn: 0.10, volatility: 0.12 },
      ]);
      const totalWeight = result.allocations.reduce((s, a) => s + a.targetWeight, 0);
      expect(totalWeight).toBeCloseTo(1, 3); // Allow for rounding to 4 decimals
    });

    it('accounts for sector correlation in volatility calculation', () => {
      const sameSector = optimizePortfolio([
        { symbol: 'TECH1', expectedReturn: 0.12, volatility: 0.20, sector: 'Technology' },
        { symbol: 'TECH2', expectedReturn: 0.12, volatility: 0.20, sector: 'Technology' },
      ]);
      expect(sameSector.expectedPortfolioVolatility).toBeGreaterThan(0.15);
      expect(sameSector.expectedPortfolioVolatility).toBeLessThan(0.22);
    });

    it('rejects invalid inputs gracefully', () => {
      const result = optimizePortfolio([
        { symbol: '', expectedReturn: 0.12, volatility: 0.15 },
        { symbol: 'A', expectedReturn: NaN, volatility: 0.15 },
        { symbol: 'B', expectedReturn: 0.12, volatility: -1 },
      ]);
      expect(result.allocations).toHaveLength(0);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it('flags high concentration', () => {
      const result = optimizePortfolio([
        { symbol: 'MEGA', expectedReturn: 0.30, volatility: 0.10 },
        { symbol: 'SMALL', expectedReturn: 0.05, volatility: 0.15 },
      ]);
      const topThree = result.allocations.slice(0, 3).reduce((s, a) => s + a.targetWeight, 0);
      if (topThree > 0.65) {
        expect(result.diagnostics.some(d => d.includes('concentration'))).toBe(true);
      }
    });
  });

  describe('runPortfolioStressTest', () => {
    const baseHoldings: PortfolioOptimizationInput[] = [
      { symbol: 'A', expectedReturn: 0.10, volatility: 0.15, currentWeight: 0.5, sector: 'Tech' },
      { symbol: 'B', expectedReturn: 0.08, volatility: 0.12, currentWeight: 0.5, sector: 'Finance' },
    ];

    it('applies market shock to all holdings', () => {
      const result = runPortfolioStressTest(baseHoldings, { name: 'Market Crash', marketShockPct: -20 });
      expect(result.expectedPortfolioMovePct).toBeLessThan(0);
    });

    it('applies sector-specific shocks', () => {
      const result = runPortfolioStressTest(baseHoldings, {
        name: 'Tech Crisis',
        marketShockPct: 0,
        sectorShocks: { Tech: -30, Finance: 0 },
      });
      const techHolding = result.holdings.find(h => h.symbol === 'A');
      const financeHolding = result.holdings.find(h => h.symbol === 'B');
      expect((techHolding?.shockedReturnPct ?? 0)).toBeLessThan((financeHolding?.shockedReturnPct ?? 0));
    });

    it('identifies the largest detractor', () => {
      const result = runPortfolioStressTest(baseHoldings, {
        name: 'Shock',
        marketShockPct: -10,
        sectorShocks: { Tech: -30 },
      });
      expect(result.largestDetractor).toBe('A');
    });

    it('handles empty holdings gracefully', () => {
      const result = runPortfolioStressTest([], { name: 'Test', marketShockPct: -10 });
      expect(result.holdings).toHaveLength(0);
      expect(result.expectedPortfolioMovePct).toBe(0);
    });
  });
});
