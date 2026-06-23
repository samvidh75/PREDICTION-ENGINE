import { describe, it, expect } from 'vitest';
import { healthometerEngine, HealthometerEngine } from '../healthometer/HealthometerEngine';
import { classifyHealthometer } from '../healthometer/labels';
import type { HealthometerInput } from '../healthometer/types';

function makeInput(overrides: Partial<HealthometerInput['financials']> = {}): HealthometerInput {
  return {
    symbol: 'TEST',
    financials: {
      peRatio: 18, pbRatio: 3.0, evEbitda: 12,
      roe: 18, roce: 14, roa: 10,
      debtToEquity: 0.5, currentRatio: 2.0,
      operatingMargin: 20, netMargin: 14, grossMargin: 45,
      revenueGrowth: 0.12, profitGrowth: 0.14, epsGrowth: 0.13,
      fcfYield: 0.04, marketCap: 500000, beta: 1.0,
      ...overrides,
    },
    factors: {
      qualityFactor: 65, valueFactor: 55, growthFactor: 60,
      momentumFactor: 58, riskFactor: 35, sectorStrengthFactor: 50,
    },
    features: {
      volatility: 0.18, momentum: 1.2, rsi: 62, trendStrength: 0.6,
    },
    predictionRegistry: {
      rankingScore: 72, classification: 'Good', confidenceScore: 75, confidenceLevel: 'High',
    },
  };
}

describe('HealthometerEngine', () => {
  describe('evaluate', () => {
    it('returns complete scores for full input', () => {
      const result = healthometerEngine.evaluate(makeInput());
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.validDimensionCount).toBe(8);
      expect(result.totalDimensionCount).toBe(9);
      expect(result.dimensions).toHaveLength(9);
      const verifiedDims = result.dimensions.filter((d) => d.score !== null);
      verifiedDims.forEach((d) => {
        expect(d.status).toBe('verified');
        expect(d.score).toBeGreaterThanOrEqual(0);
        expect(d.score).toBeLessThanOrEqual(100);
      });
      const insufficientDims = result.dimensions.filter((d) => d.score === null);
      insufficientDims.forEach((d) => {
        expect(d.status).toBe('insufficient');
      });
    });

    it('returns healthy label for strong fundamentals', () => {
      const result = healthometerEngine.evaluate(makeInput());
      expect(['Very healthy', 'Healthy', 'Stable']).toContain(result.label);
    });

    it('returns risk rising or fragile for very weak fundamentals', () => {
      const input: HealthometerInput = {
        symbol: 'TEST',
        financials: {
          peRatio: 500, pbRatio: 50, evEbitda: 100,
          roe: -15, roce: -10, roa: -8,
          debtToEquity: 15, currentRatio: 0.15,
          operatingMargin: -30, netMargin: -25, grossMargin: 2,
          revenueGrowth: -0.5, profitGrowth: -0.6, epsGrowth: -0.4,
          fcfYield: -0.1, marketCap: 10, beta: 4.0,
        },
        factors: {
          qualityFactor: 10, valueFactor: 10, growthFactor: 10,
          momentumFactor: 10, riskFactor: 95, sectorStrengthFactor: 10,
        },
        features: {
          volatility: 0.8, momentum: -5, rsi: 20, trendStrength: -0.5,
        },
        predictionRegistry: {
          rankingScore: 10, classification: 'Weak', confidenceScore: 20, confidenceLevel: 'Low',
        },
      };
      const result = healthometerEngine.evaluate(input);
      expect(result.overallScore).toBeLessThan(30);
      expect(['Risk rising', 'Fragile']).toContain(result.label);
    });

    it('returns not enough information for all null input', () => {
      const input: HealthometerInput = {
        symbol: 'TEST',
        financials: {
          peRatio: null, pbRatio: null, evEbitda: null,
          roe: null, roce: null, roa: null,
          debtToEquity: null, currentRatio: null,
          operatingMargin: null, netMargin: null, grossMargin: null,
          revenueGrowth: null, profitGrowth: null, epsGrowth: null,
          fcfYield: null, marketCap: null, beta: null,
        },
        factors: {
          qualityFactor: null, valueFactor: null, growthFactor: null,
          momentumFactor: null, riskFactor: null, sectorStrengthFactor: null,
        },
        features: {
          volatility: null, momentum: null, rsi: null, trendStrength: null,
        },
        predictionRegistry: {
          rankingScore: null, classification: null, confidenceScore: null, confidenceLevel: null,
        },
      };
      const result = healthometerEngine.evaluate(input);
      expect(result.overallScore).toBeNull();
      expect(result.label).toBe('Not enough information');
      expect(result.validDimensionCount).toBe(0);
    });

    it('returns partial results for partially null input', () => {
      const input = makeInput({
        peRatio: null, pbRatio: null, evEbitda: null,
        roe: 15, roce: 12, roa: null,
        debtToEquity: 0.5, currentRatio: null,
        operatingMargin: null, netMargin: null, grossMargin: null,
        revenueGrowth: null, profitGrowth: null, epsGrowth: null,
        fcfYield: null, marketCap: null, beta: null,
      });
      const result = healthometerEngine.evaluate(input);
      expect(result.validDimensionCount).toBeGreaterThan(0);
      expect(result.validDimensionCount).toBeLessThan(9);
      expect(result.dimensions.some((d) => d.status === 'insufficient')).toBe(true);
    });

    it('never returns NaN or Infinity scores', () => {
      const result = healthometerEngine.evaluate(makeInput());
      expect(result.overallScore === null || Number.isFinite(result.overallScore)).toBe(true);
      result.dimensions.forEach((d) => {
        if (d.score !== null) {
          expect(Number.isFinite(d.score)).toBe(true);
        }
      });
    });

    it('handles extreme input values without crashing', () => {
      const input = makeInput({
        peRatio: 9999, pbRatio: 0.01, evEbitda: 1000,
        roe: -999, roce: 999, roa: 0,
        debtToEquity: 500, currentRatio: 100,
        operatingMargin: -999, grossMargin: 999,
        revenueGrowth: -10, profitGrowth: 10, epsGrowth: 0,
        fcfYield: -5, marketCap: 0, beta: 50,
      });
      const result = healthometerEngine.evaluate(input);
      expect(Number.isFinite(result.overallScore)).toBe(true);
      result.dimensions.forEach((d) => {
        if (d.score !== null) {
          expect(Number.isFinite(d.score)).toBe(true);
        }
      });
    });
  });

  describe('labels', () => {
    it('classifyHealthometer returns correct labels for score ranges', () => {
      expect(classifyHealthometer(95, 7, 7)).toBe('Very healthy');
      expect(classifyHealthometer(80, 7, 7)).toBe('Very healthy');
      expect(classifyHealthometer(72, 7, 7)).toBe('Healthy');
      expect(classifyHealthometer(65, 7, 7)).toBe('Healthy');
      expect(classifyHealthometer(55, 7, 7)).toBe('Stable');
      expect(classifyHealthometer(45, 7, 7)).toBe('Stable');
      expect(classifyHealthometer(38, 7, 7)).toBe('Needs review');
      expect(classifyHealthometer(30, 7, 7)).toBe('Needs review');
      expect(classifyHealthometer(22, 7, 7)).toBe('Risk rising');
      expect(classifyHealthometer(15, 7, 7)).toBe('Risk rising');
      expect(classifyHealthometer(8, 7, 7)).toBe('Fragile');
      expect(classifyHealthometer(0, 7, 7)).toBe('Fragile');
    });

    it('classifyHealthometer returns not enough information for null score', () => {
      expect(classifyHealthometer(null, 0, 7)).toBe('Not enough information');
    });

    it('classifyHealthometer returns not enough information when few valid dimensions', () => {
      expect(classifyHealthometer(40, 2, 7)).toBe('Not enough information');
      expect(classifyHealthometer(30, 3, 7)).toBe('Needs review');
    });
  });
});
