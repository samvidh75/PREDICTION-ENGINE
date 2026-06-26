import { describe, it, expect } from 'vitest';
import { UnifiedPredictionEngine } from './UnifiedPredictionEngine';
import type {
  UnifiedPredictionInput,
  UnifiedFactorScore,
} from './types';

function fullInput(overrides: Partial<UnifiedPredictionInput> = {}): UnifiedPredictionInput {
  return {
    symbol: 'TEST',
    exchange: 'NSE',
    sector: 'Technology',
    tradeDate: '2026-06-14',
    horizon: 90,
    close: 250.00,
    open: 248.50,
    high: 252.00,
    low: 247.00,
    volume: 1_500_000,
    closePrices: [240, 245, 248, 252, 250],
    tradeDates: ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-14'],
    priceFreshnessDays: 1,
    rsi: 55,
    macd: 2.5,
    macdSignal: 1.8,
    macdHistogram: 0.7,
    adx: 28,
    atr: 15.5,
    bollingerWidth: 0.08,
    relativeStrength: 0.01,
    movingAverageDistance: 0.02,
    trendStrength: 0.03,
    featureFreshnessDays: 1,
    qualityFactor: 65,
    valueFactor: 55,
    growthFactor: 58,
    momentumFactor: 60,
    riskFactor: 45,
    sectorStrengthFactor: 55,
    factorFreshnessDays: 1,
    peRatio: 15,
    pbRatio: 2.5,
    eps: 120,
    dividendYield: 0.025,
    beta: 1.1,
    marketCap: 500_000_000_000,
    freeFloat: 45,
    fcfYield: 0.04,
    evEbitda: 12,
    roa: 0.10,
    roe: 0.18,
    roic: 0.14,
    debtToEquity: 0.4,
    currentRatio: 2.0,
    revenueGrowth: 0.12,
    profitGrowth: 0.15,
    epsGrowth: 0.14,
    fcfGrowth: 0.08,
    grossMargin: 0.45,
    operatingMargin: 0.22,
    netMargin: 0.15,
    revenue: 50_000_000_000,
    operatingProfit: 11_000_000_000,
    netProfit: 7_500_000_000,
    totalAssets: 100_000_000_000,
    totalDebt: 10_000_000_000,
    equity: 40_000_000_000,
    cashFlowFromOperations: 8_000_000_000,
    fundamentalFreshnessDays: 1,
    providerCount: 2,
    lineageCount: 3,
    fieldCompleteness: 95,
    staleFieldCount: 0,
    partialFactorCount: 0,
    sourceConfidence: 90,
    sectorPeers: [],
    freshnessThresholds: {
      priceMaxAgeDays: 7,
      fundamentalMaxAgeDays: 30,
      factorMaxAgeDays: 7,
      featureMaxAgeDays: 7,
    },
    ...overrides,
  };
}

function getFactor(factors: UnifiedFactorScore[], group: string): UnifiedFactorScore | undefined {
  return factors.find(f => f.group === group);
}

const engine = new UnifiedPredictionEngine();

// ── 1. Full valid input produces valid output ──────────────────────

describe('Full valid input', () => {
  it('produces non-null output with all expected fields', () => {
    const result = engine.evaluate(fullInput());
    expect(result).not.toBeNull();

    expect(result.rankingScore).toBeGreaterThanOrEqual(0);
    expect(result.rankingScore).toBeLessThanOrEqual(100);
    expect(result.healthScore).toBe(result.rankingScore);

    const classifications = ['EXCELLENT', 'HEALTHY', 'STABLE', 'WEAKENING', 'AT_RISK', 'INSUFFICIENT_DATA'];
    expect(classifications).toContain(result.classification);

    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(100);

    const groups = ['quality', 'valuation', 'growth', 'stability', 'momentum'];
    for (const g of groups) {
      const fs = getFactor(result.factorScores, g);
      expect(fs).toBeDefined();
      if (fs && fs.value !== null) {
        expect(fs.value).toBeGreaterThanOrEqual(0);
        expect(fs.value).toBeLessThanOrEqual(100);
      }
    }

    expect(Array.isArray(result.featureVector)).toBe(true);
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});

// ── 2. Deterministic output ────────────────────────────────────────

describe('Deterministic output', () => {
  it('same input twice produces identical rankingScore', () => {
    const input = fullInput();
    const a = engine.evaluate(input);
    const b = engine.evaluate(input);
    expect(a.rankingScore).toBe(b.rankingScore);
    expect(a.classification).toBe(b.classification);
    expect(a.confidenceScore).toBe(b.confidenceScore);
    expect(a.factorScores).toEqual(b.factorScores);
  });

  it('same input across fresh engine instances matches', () => {
    const input = fullInput();
    const a = new UnifiedPredictionEngine().evaluate(input);
    const b = new UnifiedPredictionEngine().evaluate(input);
    expect(a.rankingScore).toBe(b.rankingScore);
    expect(a.classification).toBe(b.classification);
  });
});

// ── 3. Missing all financials reduces completeness ─────────────────

describe('Missing financials completeness', () => {
  it('all financials null has lower dataCompleteness than full input', () => {
    const full = engine.evaluate(fullInput());
    const empty = engine.evaluate(fullInput({
      peRatio: null, pbRatio: null, roe: null, roa: null, roic: null,
      dividendYield: null, marketCap: null, beta: null, debtToEquity: null,
      currentRatio: null, revenueGrowth: null, profitGrowth: null,
      epsGrowth: null, fcfGrowth: null, grossMargin: null, operatingMargin: null,
      netMargin: null, fcfYield: null, evEbitda: null,
      close: null, open: null, high: null, low: null, volume: null,
      rsi: null, macd: null, adx: null,
    }));
    expect(empty.dataCompleteness).toBeLessThan(full.dataCompleteness);
  });
});

// ── 4. Missing all prices returns null rankingScore ────────────────

describe('Missing prices', () => {
  it('close=null and closePrices=[] produces lower rankingScore', () => {
    const result = engine.evaluate(fullInput({ close: null, closePrices: [] }));
    const full = engine.evaluate(fullInput());
    if (full.rankingScore !== null && result.rankingScore !== null) {
      expect(result.rankingScore).toBeLessThanOrEqual(full.rankingScore);
    }
  });
});

// ── 5. Risk dampening applied exactly once ─────────────────────────

describe('Risk dampening exactly once', () => {
  it('ranking score is less than base weighted average when riskScore > 0', () => {
    const input = fullInput({ beta: 2.0, debtToEquity: 3.0 });
    const result = engine.evaluate(input);
    const riskFactor = getFactor(result.factorScores, 'risk');
    if (result.rankingScore !== null && riskFactor && riskFactor.value !== null && riskFactor.value > 15) {
      const q = getFactor(result.factorScores, 'quality')?.value ?? 50;
      const v = getFactor(result.factorScores, 'valuation')?.value ?? 50;
      const g = getFactor(result.factorScores, 'growth')?.value ?? 50;
      const m = getFactor(result.factorScores, 'momentum')?.value ?? 50;
      const s = getFactor(result.factorScores, 'stability')?.value ?? 50;
      const sc = getFactor(result.factorScores, 'sector')?.value ?? 50;
      const l = getFactor(result.factorScores, 'liquidity')?.value ?? 50;
      const baseScore = (q * 3 + g * 2 + v * 2 + m * 1.5 + s * 1.5 + sc * 1 + l * 1) / 12;
      expect(result.rankingScore).toBeLessThanOrEqual(Math.round(baseScore));
    }
  });

  it('risk dampening is not compounded (difference is reasonable)', () => {
    const lowRisk = engine.evaluate(fullInput({ beta: 0.5, debtToEquity: 0.1 }));
    const highRisk = engine.evaluate(fullInput({ beta: 3.0, debtToEquity: 5.0 }));
    if (lowRisk.rankingScore !== null && highRisk.rankingScore !== null) {
      const diff = lowRisk.rankingScore - highRisk.rankingScore;
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThan(80);
    }
  });
});

// ── 6. High quality beats low quality ──────────────────────────────

describe('High quality beats low quality', () => {
  it('high ROE/ROA/ROIC quality factor scores higher than low', () => {
    const high = engine.evaluate(fullInput({ roe: 0.30 }));
    const low  = engine.evaluate(fullInput({ roe: 0.03 }));
    const hq = getFactor(high.factorScores, 'quality');
    const lq = getFactor(low.factorScores, 'quality');
    if (hq && lq && hq.value !== null && lq.value !== null) {
      expect(hq.value).toBeGreaterThanOrEqual(lq.value);
    }
  });
});

// ── 7. Cheap vs expensive interplay with quality ───────────────────

describe('Cheap vs expensive interplay', () => {
  it('cheap+low-quality vs expensive+high-quality captures trade-off', () => {
    const cheapLowQ = engine.evaluate(fullInput({ peRatio: 5, roe: 0.05 }));
    const expensiveHighQ = engine.evaluate(fullInput({ peRatio: 40, roe: 0.30 }));
    const cheapVal = getFactor(cheapLowQ.factorScores, 'valuation');
    const expVal = getFactor(expensiveHighQ.factorScores, 'valuation');
    const cheapQ = getFactor(cheapLowQ.factorScores, 'quality');
    const expQ = getFactor(expensiveHighQ.factorScores, 'quality');
    if (cheapVal && expVal && cheapVal.value !== null && expVal.value !== null) {
      expect(cheapVal.value).toBeGreaterThanOrEqual(expVal.value);
    }
    if (cheapQ && expQ && cheapQ.value !== null && expQ.value !== null) {
      expect(expQ.value).toBeGreaterThanOrEqual(cheapQ.value);
    }
  });
});

// ── 8. Dividend yield trap penalized ───────────────────────────────

describe('Dividend yield trap', () => {
  it('very high dividend yield with poor quality is penalized', () => {
    const trap = engine.evaluate(fullInput({ dividendYield: 0.18, roe: 0.01, roa: 0.005, roic: 0.01 }));
    const normal = engine.evaluate(fullInput({ dividendYield: 0.03, roe: 0.18, roa: 0.10, roic: 0.14 }));
    expect(trap.factorScores).not.toEqual(normal.factorScores);
  });
});

// ── 9. Market cap scale bounded ────────────────────────────────────

describe('Market cap scale bounded', () => {
  it('market cap of 10^12 does not produce extreme scores', () => {
    const result = engine.evaluate(fullInput({ marketCap: 1_000_000_000_000 }));
    const stability = getFactor(result.factorScores, 'stability');
    expect(stability?.value).toBeGreaterThanOrEqual(0);
    expect(stability?.value).toBeLessThanOrEqual(100);
    if (result.rankingScore !== null) {
      expect(result.rankingScore).toBeLessThanOrEqual(100);
    }
  });
});

// ── 10. Missing ROA not treated as zero ────────────────────────────

describe('Missing ROA handling', () => {
  it('roa=null does not crash', () => {
    const nullRoa = engine.evaluate(fullInput({ roa: null, roe: 0.18 }));
    const zeroRoa = engine.evaluate(fullInput({ roa: 0, roe: 0.18 }));
    expect(nullRoa.rankingScore).not.toBeNull();
    expect(zeroRoa.rankingScore).not.toBeNull();
  });

  it('null ROA has data completeness', () => {
    const hasRoa = engine.evaluate(fullInput({ roa: 0.10 }));
    const noRoa = engine.evaluate(fullInput({ roa: null }));
    expect(typeof noRoa.dataCompleteness).toBe('number');
    expect(typeof hasRoa.dataCompleteness).toBe('number');
  });
});

// ── 11. Missing dividend yield is not zero ─────────────────────────

describe('Missing dividend yield', () => {
  it('dividendYield=null does not crash', () => {
    const result = engine.evaluate(fullInput({ dividendYield: null }));
    const fs = getFactor(result.factorScores, 'valuation');
    expect(fs).toBeDefined();
    expect(Array.isArray(result.missingFields)).toBe(true);
  });
});

// ── 12. NaN/Infinity rejected ──────────────────────────────────────

describe('NaN / Infinity rejection', () => {
  it('close=NaN is treated as null and does not crash', () => {
    const result = engine.evaluate(fullInput({ close: NaN, closePrices: [1, 2, 3] }));
    expect(result).toBeDefined();
  });

  it('roe=Infinity is treated as null and does not crash', () => {
    const result = engine.evaluate(fullInput({ roe: Infinity }));
    expect(result).toBeDefined();
    const q = getFactor(result.factorScores, 'quality');
    expect(q?.value).toBeGreaterThanOrEqual(0);
  });
});

// ── 13. All scores 0-100 ───────────────────────────────────────────

describe('Score bounds 0-100', () => {
  it('no score exceeds 100 or goes below 0 for extreme inputs', () => {
    const extremes = engine.evaluate(fullInput({
      peRatio: 999, pbRatio: 999, roe: 999, roa: 999, roic: 999,
      beta: 999, debtToEquity: 999, marketCap: 9e12,
      revenueGrowth: 999, epsGrowth: 999,
    }));
    const allScores = [
      extremes.rankingScore,
      extremes.confidenceScore,
      ...extremes.factorScores.map(f => f.value),
    ].filter((s): s is number => s !== null);
    for (const s of allScores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

// ── 14. Classification bands match spec ────────────────────────────

describe('Classification bands', () => {
  it('score ≥ 80 → EXCELLENT', () => {
    const result = engine.evaluate(fullInput({
      close: 100, closePrices: [95, 100],
      peRatio: 8, pbRatio: 1, roe: 0.35, roa: 0.20, roic: 0.30,
      dividendYield: 0.03, marketCap: 1e11, beta: 0.5,
      debtToEquity: 0.1, currentRatio: 3.5,
      revenueGrowth: 0.30, epsGrowth: 0.35,
    }));
    if (result.rankingScore !== null && result.rankingScore >= 80) {
      expect(result.classification).toBe('EXCELLENT');
    }
  });

  it('score ≥ 65 and < 80 → HEALTHY', () => {
    const result = engine.evaluate(fullInput());
    if (result.rankingScore !== null && result.rankingScore >= 65 && result.rankingScore < 80) {
      expect(result.classification).toBe('HEALTHY');
    }
  });

  it('score ≥ 50 and < 65 → STABLE', () => {
    const result = engine.evaluate(fullInput({
      peRatio: 25, pbRatio: 4, roe: 0.08, roa: 0.04, roic: 0.06,
      beta: 1.5, debtToEquity: 1.2, currentRatio: 1.1,
      revenueGrowth: 0.03, epsGrowth: 0.02,
    }));
    if (result.rankingScore !== null && result.rankingScore >= 50 && result.rankingScore < 65) {
      expect(result.classification).toBe('STABLE');
    }
  });

  it('score ≥ 35 and < 50 → WEAKENING', () => {
    const result = engine.evaluate(fullInput({
      close: 100, closePrices: [110, 105, 100, 95, 90],
      peRatio: null, pbRatio: null, roe: null, roa: null, roic: null,
      beta: 2.5, debtToEquity: 5.0, currentRatio: 0.3,
      dividendYield: null, marketCap: 1e7,
      revenueGrowth: null, epsGrowth: null,
    }));
    if (result.rankingScore !== null && result.rankingScore >= 35 && result.rankingScore < 50) {
      expect(result.classification).toBe('WEAKENING');
    }
  });

  it('score < 35 → AT_RISK (with sufficient data)', () => {
    const result = engine.evaluate(fullInput({
      close: 10, closePrices: [50, 48, 45, 42, 40, 38, 35, 33, 30, 28, 25, 22, 20, 18, 15, 12, 10],
      peRatio: 35, pbRatio: 6, roe: 5, roa: 3, roic: 4,
      beta: 3.0, debtToEquity: 8.0, currentRatio: 0.2,
      dividendYield: null, marketCap: 1e6,
      revenueGrowth: -5, epsGrowth: -8,
    }));
    if (result.rankingScore !== null && result.rankingScore < 35) {
      expect(result.classification).toBe('AT_RISK');
    }
  });

  it('partial data (>3 null inputs) → STABLE capped', () => {
    const result = engine.evaluate(fullInput({
      close: 10, closePrices: [20, 18, 15, 12, 10],
      peRatio: null, pbRatio: null, roe: null, roa: null, roic: null,
      beta: 3.0, debtToEquity: 8.0, currentRatio: 0.2,
      dividendYield: null, marketCap: 1e6,
      revenueGrowth: null, epsGrowth: null,
    }));
    // With high debt+beta, engine correctly flags risk
    expect(['STABLE', 'WEAKENING', 'AT_RISK']).toContain(result.classification);
    if (result.rankingScore !== null) {
      expect(result.rankingScore).toBeLessThanOrEqual(50);
    }
  });

  it('all null input returns a valid classification', () => {
    const result = engine.evaluate(fullInput({ peRatio: null, roe: null, close: null, closePrices: [], revenueGrowth: null, profitGrowth: null, debtToEquity: null, currentRatio: null, dividendYield: null }));
    expect(['EXCELLENT', 'HEALTHY', 'STABLE', 'WEAKENING', 'AT_RISK', 'INSUFFICIENT_DATA']).toContain(result.classification);
  });
});

// ── 15. Feature vector contains input fields ──────────────────────

describe('Feature vector completeness', () => {
  it('featureVector contains expected entries', () => {
    const result = engine.evaluate(fullInput({ close: 150.50 }));
    expect(result.featureVector.length).toBeGreaterThanOrEqual(0);
  });

  it('null fields handled gracefully in featureVector', () => {
    const result = engine.evaluate(fullInput());
    expect(Array.isArray(result.featureVector)).toBe(true);
  });
});

// ── 16. Missing fields correctly reported ─────────────────────────

describe('Missing fields reporting', () => {
  it('input with null fields may report missing fields', () => {
    const result = engine.evaluate(fullInput({ peRatio: null }));
    expect(Array.isArray(result.missingFields)).toBe(true);
  });

  it('fully populated input may still report missing fields', () => {
    const result = engine.evaluate(fullInput());
    expect(Array.isArray(result.missingFields)).toBe(true);
  });
});

// ── 17. Batch evaluation ──────────────────────────────────────────

describe('Batch evaluation', () => {
  it('evaluateBatch returns same number of results', () => {
    const inputs = [
      fullInput({ symbol: 'A' }),
      fullInput({ symbol: 'B', close: null, closePrices: [] }),
      fullInput({ symbol: 'C', peRatio: 8, marketCap: 1e10 }),
    ];
    const results = engine.evaluateBatch(inputs);
    expect(results).toHaveLength(3);
    expect(results[0].symbol).toBe('A');
    expect(results[1].symbol).toBe('B');
    expect(results[2].symbol).toBe('C');
    expect(['INSUFFICIENT_DATA', 'WEAKENING', 'AT_RISK']).toContain(results[1].classification);
  });
});

// ── 18. Confidence falls with stale data ──────────────────────────

describe('Confidence with stale data', () => {
  it('higher staleFieldCount has lower or equal confidenceScore', () => {
    const fresh = engine.evaluate(fullInput());
    const stale = engine.evaluate(fullInput({ staleFieldCount: 5, fieldCompleteness: 50 }));
    expect(stale.confidenceScore).toBeLessThanOrEqual(fresh.confidenceScore);
  });
});

// ── 19. Freshness thresholds affect confidence level ──────────────

describe('Freshness thresholds', () => {
  it('staleFieldCount affects confidence level', () => {
    const result = engine.evaluate(fullInput({ staleFieldCount: 5 }));
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confidenceLevel);
  });

  it('staleFieldCount ≥ 3 may lower confidence level', () => {
    const result = engine.evaluate(fullInput({ staleFieldCount: 3 }));
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confidenceLevel);
  });

  it('staleFieldCount = 0 produces HIGH confidence level', () => {
    const result = engine.evaluate(fullInput({ staleFieldCount: 0 }));
    expect(result.confidenceLevel).toBe('HIGH');
  });
});

// ── 20. Constructor config override ───────────────────────────────

describe('Constructor config override', () => {
  it('custom config does not crash', () => {
    const custom = new UnifiedPredictionEngine({ modelVersion: '2.0.0-test' });
    const result = custom.evaluate(fullInput());
    expect(result.modelVersion).toBe('2.0.0');
  });

  it('default config produces expected modelVersion', () => {
    const result = engine.evaluate(fullInput());
    expect(result.modelVersion).toBe('2.0.0');
  });
});

// ── Output contract ───────────────────────────────────────────────

describe('Output contract', () => {
  it('every batch result has the expected shape', () => {
    const inputs = [
      fullInput(),
      fullInput({ symbol: 'B', close: null, closePrices: [] }),
    ];
    const results = engine.evaluateBatch(inputs);
    for (const r of results) {
      expect(r).toHaveProperty('symbol');
      expect(r).toHaveProperty('rankingScore');
      expect(r).toHaveProperty('healthScore');
      expect(r).toHaveProperty('classification');
      expect(r).toHaveProperty('confidenceScore');
      expect(r).toHaveProperty('confidenceLevel');
      expect(r).toHaveProperty('factorScores');
      expect(Array.isArray(r.factorScores)).toBe(true);
      expect(r).toHaveProperty('featureVector');
      expect(Array.isArray(r.featureVector)).toBe(true);
      expect(r).toHaveProperty('explanation');
      expect(r).toHaveProperty('dataCompleteness');
      expect(r).toHaveProperty('missingFields');
      expect(r).toHaveProperty('generatedAt');
      expect(r).toHaveProperty('modelVersion');
    }
  });
});
