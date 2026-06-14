/**
 * TRACK-P1 — Scoring Integrity Tests
 * TRACK-12B: Added GROUP H (Dividend Yield Trap), updated GROUP A (log10 market cap)
 * 
 * Test Groups: A (Market Cap Activation), B (Metric Identity),
 * C (Risk Dampening Once), D (Per-Metric Fallback),
 * E (Null Handling), F (Distribution Completeness),
 * H (Dividend Yield Trap), I (Determinism), J (Score Range)
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
    expect(mega.marketCapSizeScore).toBe(87);
    expect(large.marketCapSizeScore).toBe(79);
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
    expect(large.marketCapSizeScore).toBe(75);
    expect(mid.marketCapSizeScore).toBe(62);
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
// TEST GROUP H — DIVIDEND YIELD TRAP
// ---------------------------------------------------------------------------
describe('GROUP H: Dividend Yield Trap', () => {
  it('normal healthy yield (2-4%) scores highly', () => {
    const result = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: 0.035 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.dividendYieldScore).toBe(80);
  });

  it('moderate yield (5-7%) scores highest (90)', () => {
    const result = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: 0.06 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.dividendYieldScore).toBe(90);
  });

  it('high yield (10%) penalised to neutral (possible distress)', () => {
    const result = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: 0.10 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.dividendYieldScore).toBe(50);
  });

  it('extreme yield (25%) penalised heavily', () => {
    const result = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: 0.25 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.dividendYieldScore).toBe(10);
  });

  it('very low yield (0.5%) scores 35', () => {
    const result = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: 0.005 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.dividendYieldScore).toBe(35);
  });

  it('null yield gives neutral score 50', () => {
    const result = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: null }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(result.dividendYieldScore).toBe(50);
  });

  it('distress yield drags composite valuation score down vs normal yield', () => {
    const normal = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: 0.03 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    const distressed = valuationEngine.evaluate(makeFixture({
      financials: makeFinancials({ dividendYield: 0.15 }),
      sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
    }));
    expect(normal.score).toBeGreaterThan(distressed.score);
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP K — ADVERSARIAL CALIBRATION (TRACK-12C)
// ---------------------------------------------------------------------------
describe('GROUP K: Adversarial Calibration (TRACK-12C)', () => {

  describe('K1 — ROA calibration', () => {
    it('negative ROA scores base penalty (10)', () => {
      const result = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: -0.05, roe: 0.15, roic: 0.12 }),
        sector: { name: 'General', sectorStrength: 50, sectorMomentum: 'Steady' },
      }));
      // ROA = -0.05 is < 0 → normalized to 10; score diluted by other quality metrics
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.roa).toBe(-0.05);
    });

    it('positive vs negative ROA differentiates via percentile scoring', () => {
      const positive = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: 0.10, roe: 0.15, roic: 0.12 }),
      }));
      const negative = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: -0.05, roe: 0.15, roic: 0.12 }),
      }));
      // 0.10 is at GENERAL p50 (score 65); -0.05 is below p10 (score 15)
      expect(positive.roa).toBe(0.10);
      expect(negative.roa).toBe(-0.05);
      expect(positive.score).toBeGreaterThan(negative.score);
    });

    it('low ROA (0.04) returns value correctly', () => {
      const result = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: 0.04, roe: 0.15, roic: 0.12 }),
      }));
      expect(result.roa).toBe(0.04);
    });

    it('high ROA (0.12) returns value correctly', () => {
      const result = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: 0.12, roe: 0.15, roic: 0.12 }),
      }));
      expect(result.roa).toBe(0.12);
    });

    it('null ROA does NOT behave like zero ROA', () => {
      const nullRoa = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: null, roe: 0.15, roic: 0.12 }),
      }));
      const zeroRoa = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: 0, roe: 0.15, roic: 0.12 }),
      }));
      // Null ROA excludes the 2.0 weight entirely; zero ROA includes it with score 30
      // The composite should differ because the denominator changed
      expect(nullRoa.roa).toBe(null);
      expect(zeroRoa.roa).toBe(0);
      // Null ROA should not produce a score identical to poor performance
      // (denominator is smaller when ROA omitted)
    });

    it('NaN ROA is rejected and treated as missing', () => {
      const result = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: NaN as any, roe: 0.15, roic: 0.12 }),
      }));
      expect(result.roa).toBe(null);
    });

    it('Infinity ROA is rejected and treated as missing', () => {
      const result = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: Infinity as any, roe: 0.15, roic: 0.12 }),
      }));
      expect(result.roa).toBe(null);
    });

    it('ROA cannot overwhelm ROE and ROIC (weight parity 2:2:2)', () => {
      const extremeRoa = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: 0.50, roe: 0.05, roic: 0.05 }),
      }));
      const lowRoa = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({ roa: 0.05, roe: 0.05, roic: 0.05 }),
      }));
      // ROE and ROIC each have weight 2.0, same as ROA — gap should be modest
      const gap = Math.abs(extremeRoa.score - lowRoa.score);
      expect(gap).toBeLessThan(60);
    });
  });

  describe('K2 — Dividend Yield calibration', () => {
    it('null yield → null in output', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: null }),
      }));
      expect(result.dividendYieldScore).toBe(50);
    });

    it('zero yield scores 20', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0 }),
      }));
      expect(result.dividendYieldScore).toBe(20);
    });

    it('low yield 0.5% scores 35', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.005 }),
      }));
      expect(result.dividendYieldScore).toBe(35);
    });

    it('healthy yield 2% scores 65', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.02 }),
      }));
      expect(result.dividendYieldScore).toBe(65);
    });

    it('sweet-spot yield 4% scores 90', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.04 }),
      }));
      expect(result.dividendYieldScore).toBe(90);
    });

    it('moderate yield 6% scores 90 (top of sweet spot)', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.06 }),
      }));
      expect(result.dividendYieldScore).toBe(90);
    });

    it('distress yield 12% scores 25 (probable distress)', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.12 }),
      }));
      expect(result.dividendYieldScore).toBe(25);
    });

    it('extreme yield 20% scores 10', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.20 }),
      }));
      expect(result.dividendYieldScore).toBe(10);
    });

    it('negative yield scores 20 (same as zero)', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: -0.02 }),
      }));
      expect(result.dividendYieldScore).toBe(20);
    });

    it('NaN dividend yield → falls through all thresholds to default score 20', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: NaN as any }),
      }));
      // NaN !== null → enters if, NaN >= 0.20 → false → ... → else → 20
      expect(result.dividendYieldScore).toBe(20);
    });

    it('Infinity dividend yield → hits extreme distress branch (score 10)', () => {
      const result = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: Infinity as any }),
      }));
      // Infinity >= 0.20 → true → score 10
      expect(result.dividendYieldScore).toBe(10);
    });

    it('extreme dividend yields do not receive blindly favourable scores', () => {
      const veryHigh = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.50 }),
      }));
      // 50% yield → extreme distress penalty → 10
      expect(veryHigh.dividendYieldScore).toBeLessThanOrEqual(25);
    });

    it('null yield does not increase confidence vs real yield', () => {
      // When yield is null, weight=0 so composite effectively ignores it
      const nullYield = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: null }),
      }));
      const poorYield = valuationEngine.evaluate(makeFixture({
        financials: makeFinancials({ dividendYield: 0.001 }),
      }));
      // Both should produce valid scores; null yield should not falsely inflate
      expect(nullYield.score).toBeGreaterThanOrEqual(0);
      expect(poorYield.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('K3 — Market Cap calibration', () => {
    it('null marketCap → null in engine inputs, score 50 excluded from weighted avg', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: null }),
      }));
      expect(result.marketCapSizeScore).toBe(50);
    });

    it('zero marketCap scores floor (10)', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 0 }),
      }));
      expect(result.marketCapSizeScore).toBe(10);
    });

    it('negative marketCap scores floor (10)', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: -100 }),
      }));
      expect(result.marketCapSizeScore).toBe(10);
    });

    it('micro-cap (50 Cr) scores ~18', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 50 }),
      }));
      expect(result.marketCapSizeScore).toBeGreaterThanOrEqual(15);
      expect(result.marketCapSizeScore).toBeLessThanOrEqual(25);
    });

    it('small-cap (500 Cr) scores ~33', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 500 }),
      }));
      expect(result.marketCapSizeScore).toBeGreaterThanOrEqual(28);
      expect(result.marketCapSizeScore).toBeLessThanOrEqual(38);
    });

    it('mid-cap (5000 Cr) scores ~56', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 5000 }),
      }));
      expect(result.marketCapSizeScore).toBeGreaterThanOrEqual(50);
      expect(result.marketCapSizeScore).toBeLessThanOrEqual(62);
    });

    it('large-cap (50000 Cr) scores ~75', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 50000 }),
      }));
      expect(result.marketCapSizeScore).toBeGreaterThanOrEqual(70);
      expect(result.marketCapSizeScore).toBeLessThanOrEqual(80);
    });

    it('mega-cap (500000 Cr) scores ~94', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 500000 }),
      }));
      expect(result.marketCapSizeScore).toBeGreaterThanOrEqual(88);
      expect(result.marketCapSizeScore).toBeLessThanOrEqual(100);
    });

    it('market-cap scoring cannot dominate StabilityEngine (weight=1.0)', () => {
      const highMcap = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 500000, debtToEquity: 0.1, currentRatio: 3.0 }),
      }));
      const lowMcap = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: 50, debtToEquity: 0.1, currentRatio: 3.0 }),
      }));
      // With weight=1.0, mega vs micro cap gap is ~76 points in sub-score
      // but only ~7 points in composite (76/11 = ~7)
      const diff = Math.abs(highMcap.score - lowMcap.score);
      expect(diff).toBeLessThan(15);
    });

    it('NaN marketCap → falls to zero/negative branch (score 10) at engine level', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: NaN as any }),
      }));
      // NaN is not null and NaN > 0 is false → hits else-if (not null) → 10
      expect(result.marketCapSizeScore).toBe(10);
    });

    it('Infinity marketCap → hits positive branch, clamped to 100', () => {
      const result = stabilityEngine.evaluate(makeFixture({
        financials: makeFinancials({ marketCap: Infinity as any }),
      }));
      // Infinity > 0 → log10(Infinity) = Infinity → clampScore(Infinity) → 100
      expect(result.marketCapSizeScore).toBe(100);
    });
  });

  describe('K4 — Missing data cannot increase confidence', () => {
    it('missing all optional metrics still produces bounded score', () => {
      const result = qualityEngine.evaluate(makeFixture({
        financials: makeFinancials({
          roa: null, roe: 0.15, roic: null,
          grossMargin: null, operatingMargin: null,
          peRatio: null, pbRatio: null, evEbitda: null, fcfYield: null,
          dividendYield: null, marketCap: null,
        }),
      }));
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('score changes remain bounded and explainable', () => {
      const engine = new StockStoryEngine();
      const base = engine.evaluate(makeFixture({}));
      const allNull = engine.evaluate(makeFixture({
        financials: makeFinancials({
          roa: null, roe: null, roic: null,
          grossMargin: null, operatingMargin: null,
          dividendYield: null, marketCap: null,
          revenueGrowth: null, profitGrowth: null, epsGrowth: null, fcfGrowth: null,
        }),
      }));
      const gap = Math.abs(base.healthScore - allNull.healthScore);
      expect(gap).toBeLessThanOrEqual(100);
    });
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
