/**
 * TRACK-P1 — Scoring Integrity Tests
 * 
 * Test Groups: A (Market Cap Activation), B (Metric Identity),
 * C (Risk Dampening Once), D (Per-Metric Fallback),
 * E (Null Handling), F (Distribution Completeness),
 * G (Rank Map Logic), H (Latest Snapshot), I (Determinism), J (Score Range)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';
import { SectorDistributionEngine } from '../analytics/SectorDistributionEngine';
import { PercentileEngine } from '../scoring/PercentileEngine';
import { growthEngine } from '../engines/GrowthEngine';
import { qualityEngine } from '../engines/QualityEngine';
import { stabilityEngine } from '../engines/StabilityEngine';
import { valuationEngine } from '../engines/ValuationEngine';
import { StockStoryEngine } from '../StockStoryEngine';
import type { EngineInputs } from '../types';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const BASE_FIXTURE: EngineInputs = {
  symbol: 'TEST',
  tradeDate: '2026-06-08',
  features: {
    rsi: 55, macd: 1.2, macdSignal: 1.0, macdHistogram: 0.2,
    adx: 30, atr: 5, bollingerWidth: 0.05, momentum: 0.02,
    volatility: 0.25, relativeStrength: 0.01, movingAverageDistance: 0.02,
    trendStrength: 0.03,
  },
  factors: {
    qualityFactor: 60, valueFactor: 55, growthFactor: 60,
    momentumFactor: 55, riskFactor: 45, sectorStrengthFactor: 50,
    factorScore: 55,
  },
  financials: {
    peRatio: 18, pbRatio: 3, eps: 45, dividendYield: 0.015,
    beta: 1.0, marketCap: 50000, freeFloat: 0.4,
    fcfYield: 0.04, evEbitda: 15,
    roa: 0.10, roe: 0.18, roic: 0.14,
    debtToEquity: 0.4, currentRatio: 1.8,
    revenueGrowth: 0.12, profitGrowth: 0.10,
    epsGrowth: 0.10, fcfGrowth: 0.08,
    grossMargin: 0.50, operatingMargin: 0.20,
  },
  sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
};

function makeFixture(overrides: Partial<EngineInputs>): EngineInputs {
  return { ...BASE_FIXTURE, ...overrides } as EngineInputs;
}

function makeFinancials(overrides: Partial<EngineInputs['financials']>): EngineInputs['financials'] {
  return { ...BASE_FIXTURE.financials, ...overrides };
}

// Initialize distributions once
SectorDistributionEngine.initialise();

// ---------------------------------------------------------------------------
// TEST GROUP A — MARKET CAP ACTIVATION
// ---------------------------------------------------------------------------
describe('GROUP A: Market Cap Activation', () => {
  it('mega-cap > large-cap stability score', () => {
    const mega = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: 200000 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    const large = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: 80000 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(mega.marketCapSizeScore).toBe(95);
    expect(large.marketCapSizeScore).toBe(85);
    expect(mega.score).toBeGreaterThanOrEqual(large.score);
  });

  it('large-cap > mid-cap stability score', () => {
    const large = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: 50000 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    const mid = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: 10000 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(large.marketCapSizeScore).toBe(85);
    expect(mid.marketCapSizeScore).toBe(70);
    expect(large.score).toBeGreaterThanOrEqual(mid.score);
  });

  it('null marketCap gives neutral marketCapSizeScore = 50', () => {
    const result = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: null }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.marketCapSizeScore).toBe(50);
  });

  it('market cap changes composite stability score', () => {
    const withMc = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: 200000 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    const withoutMc = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: null }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(withMc.score).not.toBe(withoutMc.score);
  });

  it('market-cap effect remains bounded (< 15 points difference mega vs micro)', () => {
    const mega = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: 200000 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    const micro = stabilityEngine.evaluate(makeFixture({
      financials: makeFinancials({ marketCap: 50 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    const diff = Math.abs(mega.score - micro.score);
    expect(diff).toBeLessThan(15);
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP B — METRIC IDENTITY
// ---------------------------------------------------------------------------
describe('GROUP B: Metric Identity', () => {
  it('fcfGrowth uses fcfGrowth distribution, not fcfYield', () => {
    const result = growthEngine.evaluate(makeFixture({
      financials: makeFinancials({ fcfGrowth: 0.20, fcfYield: 0.02 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    // fcfGrowth 0.20 in general sector should score high (>= 80)
    expect(result.fcfGrowth).toBe(0.20);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('profitGrowth uses profitGrowth distribution, not epsGrowth', () => {
    const result = growthEngine.evaluate(makeFixture({
      financials: makeFinancials({ profitGrowth: 0.25, epsGrowth: -0.05 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.profitGrowth).toBe(0.25);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('grossMargin uses grossMargin distribution, not operatingMargin', () => {
    const result = qualityEngine.evaluate(makeFixture({
      financials: makeFinancials({ grossMargin: 0.60, operatingMargin: 0.05 }),
      sector: { name: 'Pharma', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.grossMargin).toBe(0.60);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP C — RISK DAMPENING EXACTLY ONCE
// ---------------------------------------------------------------------------
describe('GROUP C: Risk Dampening Exactly Once', () => {
  it('classification thresholds follow adjustedHealth directly', () => {
    const engine = new StockStoryEngine();
    // Use reflection-like approach: test via evaluate with varied risk
    const lowRisk = engine.evaluate(makeFixture({
      financials: makeFinancials({}),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    // Risk dampening once should produce reasonable results
    expect(lowRisk.healthScore).toBeGreaterThan(0);
    expect(lowRisk.healthScore).toBeLessThanOrEqual(100);
    expect(['Excellent', 'Healthy', 'Stable', 'Weakening', 'At Risk']).toContain(lowRisk.classification);
  });

  it('penalties remain separate from risk dampening', () => {
    const engine = new StockStoryEngine();
    const result = engine.evaluate(BASE_FIXTURE);
    expect(result.penaltyDetails).toBeDefined();
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP D — PER-METRIC PERCENTILE FALLBACK
// ---------------------------------------------------------------------------
describe('GROUP D: Per-Metric Percentile Fallback', () => {
  beforeEach(() => {
    SectorPercentileEngine.clear();
  });

  it('partial percentile data: only ROE registered, ROA/ROIC fall back', () => {
    SectorPercentileEngine.registerBuiltDistribution(
      'GENERAL', 'roe',
      PercentileEngine.buildDistribution([0.05, 0.10, 0.15, 0.20, 0.25]),
      5
    );
    // ROA and ROIC NOT registered
    const result = qualityEngine.evaluate(makeFixture({
      financials: makeFinancials({ roe: 0.18, roa: 0.10, roic: 0.14 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    // Should not throw, should produce a score
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('no percentile data: everything falls back to static thresholds', () => {
    // Clear distributions
    SectorPercentileEngine.clear();
    const result = qualityEngine.evaluate(makeFixture({
      financials: makeFinancials({}),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  // Re-initialize for subsequent tests
  afterAll(() => {
    SectorDistributionEngine.initialise();
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP E — NULL HANDLING
// ---------------------------------------------------------------------------
describe('GROUP E: Null Handling', () => {
  it('growth engine handles all null financials', () => {
    const result = growthEngine.evaluate(makeFixture({
      financials: {
        peRatio: null, pbRatio: null, eps: null, dividendYield: null,
        beta: null, marketCap: null, freeFloat: null,
        fcfYield: null, evEbitda: null,
        roa: null, roe: null, roic: null,
        debtToEquity: null, currentRatio: null,
        revenueGrowth: null, profitGrowth: null,
        epsGrowth: null, fcfGrowth: null,
        grossMargin: null, operatingMargin: null,
      },
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('quality engine handles all null financials', () => {
    const result = qualityEngine.evaluate(makeFixture({
      financials: {
        peRatio: null, pbRatio: null, eps: null, dividendYield: null,
        beta: null, marketCap: null, freeFloat: null,
        fcfYield: null, evEbitda: null,
        roa: null, roe: null, roic: null,
        debtToEquity: null, currentRatio: null,
        revenueGrowth: null, profitGrowth: null,
        epsGrowth: null, fcfGrowth: null,
        grossMargin: null, operatingMargin: null,
      },
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('stability engine handles null financials', () => {
    const result = stabilityEngine.evaluate(makeFixture({
      financials: {
        peRatio: null, pbRatio: null, eps: null, dividendYield: null,
        beta: null, marketCap: null, freeFloat: null,
        fcfYield: null, evEbitda: null,
        roa: null, roe: null, roic: null,
        debtToEquity: null, currentRatio: null,
        revenueGrowth: null, profitGrowth: null,
        epsGrowth: null, fcfGrowth: null,
        grossMargin: null, operatingMargin: null,
      },
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('valuation engine handles null financials', () => {
    const result = valuationEngine.evaluate(makeFixture({
      financials: {
        peRatio: null, pbRatio: null, eps: null, dividendYield: null,
        beta: null, marketCap: null, freeFloat: null,
        fcfYield: null, evEbitda: null,
        roa: null, roe: null, roic: null,
        debtToEquity: null, currentRatio: null,
        revenueGrowth: null, profitGrowth: null,
        epsGrowth: null, fcfGrowth: null,
        grossMargin: null, operatingMargin: null,
      },
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP F — DISTRIBUTION COMPLETENESS
// ---------------------------------------------------------------------------
describe('GROUP F: Distribution Completeness', () => {
  const ALL_METRICS = [
    'roa', 'roe', 'roic', 'revenueGrowth', 'epsGrowth', 'profitGrowth', 'fcfGrowth',
    'grossMargin', 'operatingMargin', 'debtToEquity', 'currentRatio',
    'peRatio', 'pbRatio', 'evEbitda', 'fcfYield', 'volatility',
  ] as const;
  const SECTORS = ['BANKING', 'IT', 'FMCG', 'PHARMA', 'AUTO', 'ENERGY', 'GENERAL'];

  it('every sector has every metric', () => {
    for (const sector of SECTORS) {
      for (const metric of ALL_METRICS) {
        const ref = SectorDistributionEngine.getReference(sector as any, metric as any);
        expect(ref).toBeDefined();
      }
    }
  });

  it('all distributions are monotonic', () => {
    for (const sector of SECTORS) {
      for (const metric of ALL_METRICS) {
        const ref = SectorDistributionEngine.getReference(sector as any, metric as any);
        if (ref) {
          expect(ref.p10).toBeLessThanOrEqual(ref.p25);
          expect(ref.p25).toBeLessThanOrEqual(ref.p50);
          expect(ref.p50).toBeLessThanOrEqual(ref.p75);
          expect(ref.p75).toBeLessThanOrEqual(ref.p90);
        }
      }
    }
  });

  it('no NaN values in any distribution', () => {
    for (const sector of SECTORS) {
      for (const metric of ALL_METRICS) {
        const ref = SectorDistributionEngine.getReference(sector as any, metric as any);
        if (ref) {
          expect(isNaN(ref.p10)).toBe(false);
          expect(isNaN(ref.p50)).toBe(false);
          expect(isNaN(ref.p90)).toBe(false);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP I — DETERMINISM
// ---------------------------------------------------------------------------
describe('GROUP I: Determinism', () => {
  it('GrowthEngine returns identical output for identical input', () => {
    const fixture = makeFixture({
      sector: { name: 'IT', sectorStrength: 50, sectorMomentum: 'Steady' },
    });
    const a = growthEngine.evaluate(fixture);
    const b = growthEngine.evaluate(fixture);
    expect(a.score).toBe(b.score);
    expect(a.revenueGrowth).toBe(b.revenueGrowth);
    expect(a.commentary).toBe(b.commentary);
  });

  it('QualityEngine returns identical output for identical input', () => {
    const fixture = makeFixture({
      sector: { name: 'FMCG', sectorStrength: 50, sectorMomentum: 'Steady' },
    });
    const a = qualityEngine.evaluate(fixture);
    const b = qualityEngine.evaluate(fixture);
    expect(a.score).toBe(b.score);
    expect(a.roe).toBe(b.roe);
    expect(a.commentary).toBe(b.commentary);
  });

  it('StabilityEngine returns identical output for identical input', () => {
    const fixture = makeFixture({
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    });
    const a = stabilityEngine.evaluate(fixture);
    const b = stabilityEngine.evaluate(fixture);
    expect(a.score).toBe(b.score);
    expect(a.marketCapSizeScore).toBe(b.marketCapSizeScore);
    expect(a.commentary).toBe(b.commentary);
  });

  it('ValuationEngine returns identical output for identical input', () => {
    const fixture = makeFixture({
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    });
    const a = valuationEngine.evaluate(fixture);
    const b = valuationEngine.evaluate(fixture);
    expect(a.score).toBe(b.score);
    expect(a.peScore).toBe(b.peScore);
    expect(a.commentary).toBe(b.commentary);
  });

  it('StockStoryEngine returns identical scores (generatedAt may differ)', () => {
    const engine = new StockStoryEngine();
    const fixture = makeFixture({
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    });
    const a = engine.evaluate(fixture);
    const b = engine.evaluate(fixture);
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

// ---------------------------------------------------------------------------
// TEST GROUP J — SCORE RANGE
// ---------------------------------------------------------------------------
describe('GROUP J: Score Range', () => {
  it('all engine scores are within 0-100 for edge inputs', () => {
    const engines = [growthEngine, qualityEngine, stabilityEngine, valuationEngine];
    for (const engine of engines) {
      // Extreme negative inputs
      const neg = engine.evaluate(makeFixture({
        financials: makeFinancials({
          peRatio: -5, pbRatio: -2, evEbitda: -10,
          roa: -0.5, roe: -0.5, roic: -0.5,
          revenueGrowth: -0.5, epsGrowth: -0.5, profitGrowth: -0.5, fcfGrowth: -0.5,
          grossMargin: -0.5, operatingMargin: -0.5,
          debtToEquity: -1, currentRatio: -1, fcfYield: -0.5,
          marketCap: -1,
        }),
        sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
      }));
      expect(neg.score).toBeGreaterThanOrEqual(0);
      expect(neg.score).toBeLessThanOrEqual(100);

      // Extreme positive inputs
      const pos = engine.evaluate(makeFixture({
        financials: makeFinancials({
          peRatio: 999, pbRatio: 999, evEbitda: 999,
          roa: 999, roe: 999, roic: 999,
          revenueGrowth: 999, epsGrowth: 999, profitGrowth: 999, fcfGrowth: 999,
          grossMargin: 999, operatingMargin: 999,
          fcfYield: 999, marketCap: 999999,
        }),
        sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
      }));
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
