import { describe, it, expect } from 'vitest';
import { algorithmicAnalysisEngine } from '../analysis/AlgorithmicAnalysisEngine';
import { healthometerEngine } from '../healthometer/HealthometerEngine';
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

describe('AlgorithmicAnalysisEngine', () => {
  it('generates strengths from high-scoring dimensions', () => {
    const health = healthometerEngine.evaluate(makeInput());
    const result = algorithmicAnalysisEngine.evaluate(health);
    expect(result.narrative.strengths.length).toBeGreaterThan(0);
    expect(result.bullCase).not.toBeNull();
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it('generates risks from low-scoring dimensions', () => {
    const health = healthometerEngine.evaluate(makeInput({
      debtToEquity: 6, beta: 2.5, operatingMargin: -5,
      revenueGrowth: -0.15, profitGrowth: -0.2,
    }));
    const result = algorithmicAnalysisEngine.evaluate(health);
    expect(result.narrative.risks.length).toBeGreaterThan(0);
    expect(result.bearCase).not.toBeNull();
  });

  it('returns null bull and bear when no strengths or risks', () => {
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
    const health = healthometerEngine.evaluate(input);
    const result = algorithmicAnalysisEngine.evaluate(health);
    expect(result.bullCase).toBeNull();
    expect(result.bearCase).toBeNull();
    expect(result.narrative.overall).toContain('Not enough information');
  });

  it('reflects health label in overall score', () => {
    const health = healthometerEngine.evaluate(makeInput());
    const result = algorithmicAnalysisEngine.evaluate(health);
    expect(result.overallScore).toBe(health.overallScore);
    expect(result.healthLabel).toBe(health.label);
  });

  it('narrative mentions dimension count when partial', () => {
    const health = healthometerEngine.evaluate(makeInput({
      peRatio: null, pbRatio: null, evEbitda: null,
    }));
    const result = algorithmicAnalysisEngine.evaluate(health);
    expect(result.narrative.overall).toMatch(/based on \d+ of \d+/);
  });
});
