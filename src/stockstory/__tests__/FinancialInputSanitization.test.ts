import { describe, expect, it } from 'vitest';
import { valuationEngine } from '../engines/ValuationEngine';
import { stabilityEngine } from '../engines/StabilityEngine';
import type { EngineInputs } from '../types';

const BASE_INPUTS: EngineInputs = {
  symbol: 'TEST',
  tradeDate: '2026-06-30',
  features: {
    rsi: 55,
    macd: 1.2,
    macdSignal: 1.0,
    macdHistogram: 0.2,
    adx: 30,
    atr: 5,
    bollingerWidth: 0.05,
    momentum: 0.02,
    volatility: 0.25,
    relativeStrength: 0.01,
    movingAverageDistance: 0.02,
    trendStrength: 0.03,
  },
  factors: {
    qualityFactor: 60,
    valueFactor: 55,
    growthFactor: 60,
    momentumFactor: 55,
    riskFactor: 45,
    sectorStrengthFactor: 50,
    factorScore: 55,
  },
  financials: {
    peRatio: 18,
    pbRatio: 3,
    eps: 45,
    dividendYield: 0.015,
    beta: 1.0,
    marketCap: 50000,
    freeFloat: 0.4,
    fcfYield: 0.04,
    evEbitda: 15,
    roa: 0.10,
    roe: 0.18,
    roic: 0.14,
    debtToEquity: 0.4,
    currentRatio: 1.8,
    revenueGrowth: 0.12,
    profitGrowth: 0.10,
    epsGrowth: 0.10,
    fcfGrowth: 0.08,
    grossMargin: 0.50,
    operatingMargin: 0.20,
  },
  sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
};

function withFinancials(overrides: Partial<EngineInputs['financials']>): EngineInputs {
  return {
    ...BASE_INPUTS,
    financials: {
      ...BASE_INPUTS.financials,
      ...overrides,
    },
  };
}

describe('Financial input sanitization', () => {
  it('treats NaN dividend yield as missing instead of scoring it as a low yield', () => {
    const malformed = valuationEngine.evaluate(withFinancials({ dividendYield: NaN as any }));
    const missing = valuationEngine.evaluate(withFinancials({ dividendYield: null }));

    expect(malformed.dividendYieldScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });

  it('treats infinite dividend yield as missing instead of scoring it as distress yield', () => {
    const malformed = valuationEngine.evaluate(withFinancials({ dividendYield: Infinity as any }));
    const missing = valuationEngine.evaluate(withFinancials({ dividendYield: null }));

    expect(malformed.dividendYieldScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });

  it('preserves finite dividend yield scoring', () => {
    const result = valuationEngine.evaluate(withFinancials({ dividendYield: 0.04 }));

    expect(result.dividendYieldScore).toBe(90);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('treats NaN market cap as missing instead of scoring it as microcap risk', () => {
    const malformed = stabilityEngine.evaluate(withFinancials({ marketCap: NaN as any }));
    const missing = stabilityEngine.evaluate(withFinancials({ marketCap: null }));

    expect(malformed.marketCapSizeScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });

  it('treats infinite market cap as missing instead of scoring it as a mega-cap', () => {
    const malformed = stabilityEngine.evaluate(withFinancials({ marketCap: Infinity as any }));
    const missing = stabilityEngine.evaluate(withFinancials({ marketCap: null }));

    expect(malformed.marketCapSizeScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });

  it('preserves finite market cap scoring', () => {
    const result = stabilityEngine.evaluate(withFinancials({ marketCap: 50000 }));

    expect(result.marketCapSizeScore).toBeGreaterThanOrEqual(70);
    expect(result.marketCapSizeScore).toBeLessThanOrEqual(80);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
