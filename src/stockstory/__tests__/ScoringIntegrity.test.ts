import { describe, it, expect } from 'vitest';
import { growthEngine } from '../engines/GrowthEngine';
import { qualityEngine } from '../engines/QualityEngine';
import { stabilityEngine } from '../engines/StabilityEngine';
import { valuationEngine } from '../engines/ValuationEngine';
import { StockStoryEngine } from '../StockStoryEngine';
import type { EngineInputs } from '../types';

const BASE_FIXTURE: EngineInputs = {
  symbol: 'TEST',
  tradeDate: '2026-06-08',
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

function makeFixture(overrides: Partial<EngineInputs>): EngineInputs {
  return { ...BASE_FIXTURE, ...overrides } as EngineInputs;
}

function makeFinancials(overrides: Partial<EngineInputs['financials']>): EngineInputs['financials'] {
  return { ...BASE_FIXTURE.financials, ...overrides };
}

describe('GROUP A: Market Cap Activation', () => {
  it('larger finite market cap improves market-cap stability sub-score', () => {
    const mega = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: 200000 }) }));
    const mid = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: 10000 }) }));

    expect(mega.marketCapSizeScore).toBeGreaterThan(mid.marketCapSizeScore);
    expect(mega.score).toBeGreaterThanOrEqual(mid.score);
  });

  it('null marketCap gives neutral marketCapSizeScore and is excluded from weighted average', () => {
    const result = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: null }) }));

    expect(result.marketCapSizeScore).toBe(50);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('market-cap effect remains bounded', () => {
    const mega = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: 500000 }) }));
    const micro = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: 50 }) }));

    expect(Math.abs(mega.score - micro.score)).toBeLessThan(15);
  });
});

describe('GROUP B: Metric Identity', () => {
  it('fcfGrowth uses fcfGrowth input', () => {
    const result = growthEngine.evaluate(makeFixture({ financials: makeFinancials({ fcfGrowth: 0.20, fcfYield: 0.02 }) }));

    expect(result.fcfGrowth).toBe(0.20);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('profitGrowth uses profitGrowth input', () => {
    const result = growthEngine.evaluate(makeFixture({ financials: makeFinancials({ profitGrowth: 0.25, epsGrowth: -0.05 }) }));

    expect(result.profitGrowth).toBe(0.25);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('grossMargin remains a QualityEngine input distinct from operatingMargin', () => {
    const result = qualityEngine.evaluate(makeFixture({ financials: makeFinancials({ grossMargin: 0.60, operatingMargin: 0.05 }) }));

    expect(result.grossMargin).toBe(0.60);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('ROA present changes QualityEngine output', () => {
    const withRoa = qualityEngine.evaluate(makeFixture({ financials: makeFinancials({ roa: 0.20 }) }));
    const withoutRoa = qualityEngine.evaluate(makeFixture({ financials: makeFinancials({ roa: null }) }));

    expect(withRoa.score).not.toBe(withoutRoa.score);
  });
});

describe('GROUP E: Null Handling', () => {
  const allNullFinancials: EngineInputs['financials'] = {
    peRatio: null,
    pbRatio: null,
    eps: null,
    dividendYield: null,
    beta: null,
    marketCap: null,
    freeFloat: null,
    fcfYield: null,
    evEbitda: null,
    roa: null,
    roe: null,
    roic: null,
    debtToEquity: null,
    currentRatio: null,
    revenueGrowth: null,
    profitGrowth: null,
    epsGrowth: null,
    fcfGrowth: null,
    grossMargin: null,
    operatingMargin: null,
  };

  it('core engines handle all-null financials without crashing', () => {
    const fixture = makeFixture({ financials: allNullFinancials });
    const results = [
      growthEngine.evaluate(fixture),
      qualityEngine.evaluate(fixture),
      stabilityEngine.evaluate(fixture),
      valuationEngine.evaluate(fixture),
    ];

    for (const result of results) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('GROUP H: Dividend Yield Trap', () => {
  it('reasonable finite dividend yield contributes positively', () => {
    const result = valuationEngine.evaluate(makeFixture({ financials: makeFinancials({ dividendYield: 0.04 }) }));

    expect(result.dividendYieldScore).toBe(90);
  });

  it('high finite dividend yield is not blindly favourable', () => {
    const result = valuationEngine.evaluate(makeFixture({ financials: makeFinancials({ dividendYield: 0.20 }) }));

    expect(result.dividendYieldScore).toBeLessThanOrEqual(25);
  });

  it('null dividend yield gives neutral score and no composite weight', () => {
    const result = valuationEngine.evaluate(makeFixture({ financials: makeFinancials({ dividendYield: null }) }));

    expect(result.dividendYieldScore).toBe(50);
  });
});

describe('GROUP K: Adversarial Calibration', () => {
  it('NaN ROA is rejected and treated as missing', () => {
    const result = qualityEngine.evaluate(makeFixture({ financials: makeFinancials({ roa: NaN as any }) }));

    expect(result.roa).toBe(null);
  });

  it('Infinity ROA is rejected and treated as missing', () => {
    const result = qualityEngine.evaluate(makeFixture({ financials: makeFinancials({ roa: Infinity as any }) }));

    expect(result.roa).toBe(null);
  });

  it('NaN dividend yield is treated as missing', () => {
    const malformed = valuationEngine.evaluate(makeFixture({ financials: makeFinancials({ dividendYield: NaN as any }) }));
    const missing = valuationEngine.evaluate(makeFixture({ financials: makeFinancials({ dividendYield: null }) }));

    expect(malformed.dividendYieldScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });

  it('Infinity dividend yield is treated as missing', () => {
    const malformed = valuationEngine.evaluate(makeFixture({ financials: makeFinancials({ dividendYield: Infinity as any }) }));
    const missing = valuationEngine.evaluate(makeFixture({ financials: makeFinancials({ dividendYield: null }) }));

    expect(malformed.dividendYieldScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });

  it('NaN marketCap is treated as missing', () => {
    const malformed = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: NaN as any }) }));
    const missing = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: null }) }));

    expect(malformed.marketCapSizeScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });

  it('Infinity marketCap is treated as missing', () => {
    const malformed = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: Infinity as any }) }));
    const missing = stabilityEngine.evaluate(makeFixture({ financials: makeFinancials({ marketCap: null }) }));

    expect(malformed.marketCapSizeScore).toBe(50);
    expect(malformed.score).toBe(missing.score);
  });
});

describe('GROUP I: Determinism', () => {
  it('engines return identical output for identical input', () => {
    const growthA = growthEngine.evaluate(BASE_FIXTURE);
    const growthB = growthEngine.evaluate(BASE_FIXTURE);
    const qualityA = qualityEngine.evaluate(BASE_FIXTURE);
    const qualityB = qualityEngine.evaluate(BASE_FIXTURE);
    const stabilityA = stabilityEngine.evaluate(BASE_FIXTURE);
    const stabilityB = stabilityEngine.evaluate(BASE_FIXTURE);
    const valuationA = valuationEngine.evaluate(BASE_FIXTURE);
    const valuationB = valuationEngine.evaluate(BASE_FIXTURE);

    expect(growthA.score).toBe(growthB.score);
    expect(qualityA.score).toBe(qualityB.score);
    expect(stabilityA.score).toBe(stabilityB.score);
    expect(valuationA.score).toBe(valuationB.score);
  });

  it('StockStoryEngine returns identical scores for identical input', () => {
    const engine = new StockStoryEngine();
    const a = engine.evaluate(BASE_FIXTURE);
    const b = engine.evaluate(BASE_FIXTURE);

    expect(a.healthScore).toBe(b.healthScore);
    expect(a.classification).toBe(b.classification);
    expect(a.growth).toBe(b.growth);
    expect(a.quality).toBe(b.quality);
    expect(a.stability).toBe(b.stability);
    expect(a.valuation).toBe(b.valuation);
    expect(a.momentum).toBe(b.momentum);
    expect(a.risk).toBe(b.risk);
  });
});

describe('GROUP J: Score Range', () => {
  it('all engine scores are within 0-100 for edge inputs', () => {
    const engines = [growthEngine, qualityEngine, stabilityEngine, valuationEngine];
    for (const engine of engines) {
      const neg = engine.evaluate(makeFixture({
        financials: makeFinancials({
          peRatio: -5,
          pbRatio: -2,
          evEbitda: -10,
          roa: -0.5,
          roe: -0.5,
          roic: -0.5,
          revenueGrowth: -0.5,
          epsGrowth: -0.5,
          profitGrowth: -0.5,
          fcfGrowth: -0.5,
          grossMargin: -0.5,
          operatingMargin: -0.5,
          debtToEquity: -1,
          currentRatio: -1,
          fcfYield: -0.5,
          marketCap: -1,
        }),
      }));
      const pos = engine.evaluate(makeFixture({
        financials: makeFinancials({
          peRatio: 999,
          pbRatio: 999,
          evEbitda: 999,
          roa: 999,
          roe: 999,
          roic: 999,
          revenueGrowth: 999,
          epsGrowth: 999,
          profitGrowth: 999,
          fcfGrowth: 999,
          grossMargin: 999,
          operatingMargin: 999,
          fcfYield: 999,
          marketCap: 999999,
        }),
      }));

      expect(neg.score).toBeGreaterThanOrEqual(0);
      expect(neg.score).toBeLessThanOrEqual(100);
      expect(pos.score).toBeGreaterThanOrEqual(0);
      expect(pos.score).toBeLessThanOrEqual(100);
    }
  });

  it('StockStoryEngine health score is within 0-100', () => {
    const engine = new StockStoryEngine();
    const result = engine.evaluate(BASE_FIXTURE);

    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
  });
});
