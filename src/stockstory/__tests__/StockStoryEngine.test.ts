/**
 * StockStory Engine Tests — RC-ENGINE-002
 * 
 * Covers: all 7 engines + AccountingEngine + SectorAdapter + confidence gate + narrative compliance
 */
import { describe, it, expect } from 'vitest';
import { StockStoryEngine } from '../StockStoryEngine';
import { GrowthEngine } from '../engines/GrowthEngine';
import { QualityEngine } from '../engines/QualityEngine';
import { StabilityEngine } from '../engines/StabilityEngine';
import { MomentumEngine } from '../engines/MomentumEngine';
import { ValuationEngine } from '../engines/ValuationEngine';
import { RiskEngine } from '../engines/RiskEngine';
import { ConfidenceEngine } from '../engines/ConfidenceEngine';
import { AccountingEngine } from '../engines/AccountingEngine';
import { getSectorProfile, listSectorProfiles } from '../SectorAdapter';
import { EngineInputs, clampScore, weightedAverage } from '../types';

// ─── Test Fixture Factory ─────────────────────────────────────────

function makeInputs(overrides: Partial<EngineInputs> = {}): EngineInputs {
  return {
    symbol: 'TEST',
    tradeDate: '2026-06-05',
    features: {
      rsi: 55, macd: 2.5, macdSignal: 1.8, macdHistogram: 0.7,
      adx: 28, atr: 15.5, bollingerWidth: 0.08, momentum: 0.03,
      volatility: 0.22, relativeStrength: 0.01, movingAverageDistance: 0.02,
      trendStrength: 0.03,
    },
    factors: {
      qualityFactor: 65, valueFactor: 55, growthFactor: 58,
      momentumFactor: 60, riskFactor: 45, sectorStrengthFactor: 55,
      factorScore: 56,
    },
    financials: {
      peRatio: 18, pbRatio: 3.2, eps: 120, dividendYield: 1.8,
      beta: 1.1, marketCap: 500000, freeFloat: 45,
      fcfYield: 0.04, evEbitda: 12, roa: 0.12, roe: 0.18, roic: 0.14,
      debtToEquity: 0.5, currentRatio: 2.0,
      revenueGrowth: 0.12, profitGrowth: 0.15, epsGrowth: 0.14,
      fcfGrowth: 0.08, grossMargin: 0.45, operatingMargin: 0.22,
    },
    historical: {
      featureHistory: Array.from({ length: 15 }, (_, i) => ({
        tradeDate: `2026-05-${String(20 + i).padStart(2, '0')}`,
        rsi: 50 + i * 0.3, macdHistogram: 0.5 + i * 0.02,
        adx: 25 + i * 0.2, volatility: 0.22 - i * 0.002,
      })),
      factorHistory: Array.from({ length: 10 }, (_, i) => ({
        tradeDate: `2026-05-${String(25 + i).padStart(2, '0')}`,
        factorScore: 54 + i * 0.3, qualityFactor: 63 + i * 0.2,
        riskFactor: 46 - i * 0.1, growthFactor: 56 + i * 0.2,
      })),
      priceHistory: [
        { tradeDate: '2026-05-01', close: 2450 },
        { tradeDate: '2026-05-15', close: 2520 },
        { tradeDate: '2026-06-01', close: 2580 },
      ],
    },
    sector: { name: 'Technology', sectorStrength: 55, sectorMomentum: 'Steady' },
    ...overrides,
  };
}

// ─── Utility Tests ────────────────────────────────────────────────

describe('Utility functions', () => {
  it('clampScore clamps to 0-100', () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-20)).toBe(0);
    expect(clampScore(73.4)).toBe(73);
  });

  it('weightedAverage computes correctly', () => {
    expect(weightedAverage([{ score: 100, weight: 1 }, { score: 0, weight: 1 }])).toBe(50);
    expect(weightedAverage([{ score: 80, weight: 3 }, { score: 40, weight: 1 }])).toBe(70);
    expect(weightedAverage([])).toBe(50);
  });
});

// ─── Sector Adapter Tests ─────────────────────────────────────────

describe('SectorAdapter', () => {
  it('lists all 6 known sector profiles', () => {
    const profiles = listSectorProfiles();
    expect(profiles).toContain('Banking');
    expect(profiles).toContain('Insurance');
    expect(profiles).toContain('Technology');
    expect(profiles).toContain('FMCG');
    expect(profiles).toContain('Pharma');
    expect(profiles).toContain('Utilities');
  });

  it('returns Banking profile for bank sectors', () => {
    const profile = getSectorProfile('Banking');
    expect(profile.primaryMetric).toBe('pb');
    expect(profile.useGrossMargin).toBe(false);
    expect(profile.skipEvEbitda).toBe(true);
    expect(profile.deLow).toBe(5.0); // banks naturally have high D/E
  });

  it('returns Technology profile for IT sector', () => {
    const alias = getSectorProfile('IT');
    expect(alias.primaryMetric).toBe('pe');
    expect(alias.peCheap).toBe(15); // tech PE thresholds are higher
    expect(alias.peExtreme).toBe(50);
  });

  it('falls back to General for unknown sectors', () => {
    const profile = getSectorProfile('Aerospace');
    expect(profile.name).toBe('General');
    expect(profile.primaryMetric).toBe('pe');
  });

  it('FMCG has appropriately high PE thresholds', () => {
    const fmcg = getSectorProfile('FMCG');
    expect(fmcg.peFair).toBe(35);
    expect(fmcg.peExpensive).toBe(50);
  });
});

// ─── Engine 1: Growth Engine ──────────────────────────────────────

describe('GrowthEngine', () => {
  const engine = new GrowthEngine();

  it('scores strong growth highly', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, revenueGrowth: 0.20, epsGrowth: 0.25, fcfGrowth: 0.18, profitGrowth: 0.22 },
    }));
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('scores weak growth low', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, revenueGrowth: -0.05, epsGrowth: -0.10, fcfGrowth: -0.05, profitGrowth: -0.08 },
    }));
    expect(result.score).toBeLessThan(40);
  });

  it('factor adjustment does not double-count (applied once at composite)', () => {
    const highFactor = makeInputs({
      factors: { ...makeInputs().factors, growthFactor: 80 },
    });
    const lowFactor = makeInputs({
      factors: { ...makeInputs().factors, growthFactor: 50 },
    });
    const delta = engine.evaluate(highFactor).score - engine.evaluate(lowFactor).score;
    // Factor adjustment should be roughly (30 * 0.3) = 9 points max, not per-sub-score
    expect(Math.abs(delta)).toBeLessThanOrEqual(12);
  });
});

// ─── Engine 2: Quality Engine ─────────────────────────────────────

describe('QualityEngine', () => {
  const engine = new QualityEngine();

  it('scores premium quality highly in General sector', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, roe: 0.28, roic: 0.22, grossMargin: 0.65, operatingMargin: 0.30 },
    }));
    expect(result.score).toBeGreaterThanOrEqual(65);
  });

  it('uses sector-aware thresholds for Technology', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, grossMargin: 0.58, operatingMargin: 0.22, roe: 0.20 },
      sector: { name: 'Technology', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    // Tech: gm 0.58 = high (not premium), om 0.22 = high, roe 0.20 = high
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('gives banks a fair quality score without gross margin', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, grossMargin: 0.05, operatingMargin: 0.30, roe: 0.14 },
      sector: { name: 'Banking', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    // Bank: gm not used, om 0.30 = premium (bank omPremium = 0.45) wait — 0.30 is between omHigh(0.35) and omFair(0.25)
    // Actually bank om thresholds: omLow=0.15, omFair=0.25, omHigh=0.35, omPremium=0.45
    // So om=0.30 → between fair and high → score 65-80 range
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(85);
  });
});

// ─── Engine 3: Stability Engine ───────────────────────────────────

describe('StabilityEngine', () => {
  const engine = new StabilityEngine();

  it('scores low-debt high-liquidity highly', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 0.1, currentRatio: 3.5, operatingMargin: 0.25 },
    }));
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('uses sector-aware D/E for banks', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 6.0, currentRatio: 1.1, operatingMargin: 0.20 },
      sector: { name: 'Banking', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    // Bank deLow = 5.0, deModerate = 8.0 — so 6.0 is between low and moderate → debtScore ~75
    expect(result.score).toBeGreaterThanOrEqual(40); // not crushed to single digits
  });

  it('interest coverage proxy works correctly', () => {
    const good = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 0.3, operatingMargin: 0.25 },
    }));
    const bad = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 2.5, operatingMargin: 0.03 },
    }));
    expect(good.score).toBeGreaterThan(bad.score);
  });
});

// ─── Engine 4: Momentum Engine ────────────────────────────────────

describe('MomentumEngine', () => {
  const engine = new MomentumEngine();

  it('scores bullish momentum highly', () => {
    const result = engine.evaluate(makeInputs({
      features: { ...makeInputs().features, rsi: 60, macd: 3.5, macdSignal: 2.0, macdHistogram: 1.5, adx: 35, trendStrength: 0.06 },
    }));
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('does not expose raw RSI, MACD, ADX, ATR', () => {
    const result = engine.evaluate(makeInputs());
    expect(result).toHaveProperty('momentumScore');
    expect(result).toHaveProperty('trendScore');
    expect(result).toHaveProperty('volatilityScore');
    expect(result).not.toHaveProperty('rsi');
    expect(result).not.toHaveProperty('macd');
    expect(result).not.toHaveProperty('adx');
    expect(result).not.toHaveProperty('atr');
  });
});

// ─── Engine 5: Valuation Engine ───────────────────────────────────

describe('ValuationEngine', () => {
  const engine = new ValuationEngine();

  it('scores cheap valuation highly in General sector', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, peRatio: 8, pbRatio: 1.2, evEbitda: 6, fcfYield: 0.09 },
    }));
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('does not penalise FMCG for normal-FMCG PE', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, peRatio: 35, pbRatio: 6.0, evEbitda: 20, fcfYield: 0.04 },
      sector: { name: 'FMCG', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    // FMCG: peFair=35, pbFair=6.0, evFair=20 — all at fair → score ~50-60
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(75);
  });

  it('skips EV/EBITDA for banks', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, peRatio: 12, pbRatio: 1.2 },
      sector: { name: 'Banking', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    expect(result.evEbitdaScore).toBeGreaterThanOrEqual(49);
    expect(result.evEbitdaScore).toBeLessThanOrEqual(55); // near-neutral, factor adjust may add ±5
  });
});

// ─── Engine 6: Risk Engine ────────────────────────────────────────

describe('RiskEngine', () => {
  const engine = new RiskEngine();

  it('flags high-risk profiles', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, peRatio: -5, fcfYield: -0.08, operatingMargin: -0.02 },
      features: { ...makeInputs().features, volatility: 0.65 },
    }));
    expect(result.score).toBeGreaterThanOrEqual(65);
  });

  it('debt stress is no longer computed (stub value)', () => {
    const result = engine.evaluate(makeInputs());
    expect(result.debtStressScore).toBe(50); // stub — debt lives in StabilityEngine
  });

  it('does not flag gross margin outliers as anomalies', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, grossMargin: 0.85 },
    }));
    // High gross margin no longer triggers anomaly
    expect(result.redFlagCount).toBe(0);
  });
});

// ─── Accounting Engine ────────────────────────────────────────────

describe('AccountingEngine', () => {
  const engine = new AccountingEngine();

  it('scores strong cash conversion highly', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, fcfYield: 0.08, revenueGrowth: 0.12, epsGrowth: 0.14 },
    }));
    expect(result.score).toBeGreaterThanOrEqual(65);
  });

  it('flags EPS-revenue divergence as accrual concern', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, revenueGrowth: 0.03, epsGrowth: 0.30, fcfYield: -0.01 },
    }));
    expect(result.accrualQualityScore).toBeLessThanOrEqual(35);
  });

  it('flags growing revenue with negative FCF as receivable risk', () => {
    const result = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, revenueGrowth: 0.15, fcfYield: -0.02 },
    }));
    expect(result.receivableRiskScore).toBeLessThanOrEqual(35);
  });
});

// ─── Engine 7: Confidence Engine ──────────────────────────────────

describe('ConfidenceEngine', () => {
  const engine = new ConfidenceEngine();

  it('outputs one of four confidence levels', () => {
    const result = engine.evaluate(makeInputs(), {
      growth: 75, quality: 72, stability: 78, momentum: 70, valuation: 68, risk: 30,
    });
    expect(['Very High', 'High', 'Medium', 'Low']).toContain(result.level);
  });

  it('caps confidence at Medium when 2+ critical fields missing', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        roe: null, roic: null,       // 2 critical missing
        debtToEquity: 0.5, fcfYield: 0.04,
      },
    });
    const result = engine.evaluate(inputs, {
      growth: 75, quality: 70, stability: 72, momentum: 74, valuation: 68, risk: 28,
    });
    expect(['Medium', 'Low']).toContain(result.level);
  });

  it('caps confidence at Low when 3+ critical fields missing', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        roe: null, roic: null, debtToEquity: null, fcfYield: null,
      },
    });
    const result = engine.evaluate(inputs, {
      growth: 50, quality: 52, stability: 48, momentum: 50, valuation: 50, risk: 45,
    });
    expect(result.level).toBe('Low');
  });
});

// ─── StockStory Orchestrator ──────────────────────────────────────

describe('StockStoryEngine (orchestrator)', () => {
  const engine = new StockStoryEngine();

  it('produces a complete output contract', () => {
    const result = engine.evaluate(makeInputs());
    expect(result).toHaveProperty('healthScore');
    expect(result).toHaveProperty('classification');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('narrative');
    expect(result).toHaveProperty('engineDetails');
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(['Excellent', 'Healthy', 'Stable', 'Weakening', 'At Risk']).toContain(result.classification);
    expect(['Very High', 'High', 'Medium', 'Low']).toContain(result.confidence);
  });

  it('classifies an excellent company correctly', () => {
    const result = engine.evaluate(makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: 0.25, epsGrowth: 0.30, fcfGrowth: 0.25, profitGrowth: 0.28,
        roe: 0.30, roic: 0.25, grossMargin: 0.65, operatingMargin: 0.35,
        debtToEquity: 0.05, currentRatio: 4.0,
        peRatio: 12, pbRatio: 2.5, evEbitda: 8, fcfYield: 0.07,
      },
      features: { ...makeInputs().features, rsi: 58, trendStrength: 0.06, volatility: 0.10, adx: 32 },
    }));
    expect(result.classification).toBe('Excellent');
    expect(result.healthScore).toBeGreaterThanOrEqual(75);
  });

  it('classifies an at-risk company correctly', () => {
    const result = engine.evaluate(makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: -0.10, epsGrowth: -0.15, fcfGrowth: -0.12, profitGrowth: -0.20,
        roe: -0.05, roic: -0.03, grossMargin: 0.05, operatingMargin: -0.02,
        debtToEquity: 4.0, currentRatio: 0.3,
        peRatio: -8, pbRatio: 0.5, evEbitda: -5, fcfYield: -0.10,
      },
      features: { ...makeInputs().features, rsi: 22, trendStrength: -0.08, volatility: 0.70, adx: 10 },
    }));
    expect(result.classification).toBe('At Risk');
  });

  it('handles minimal data gracefully', () => {
    const inputs: EngineInputs = {
      symbol: 'MINIMAL', tradeDate: '2026-06-05',
      features: { rsi: null, macd: null, macdSignal: null, macdHistogram: null, adx: null, atr: null, bollingerWidth: null, momentum: null, volatility: null, relativeStrength: null, movingAverageDistance: null, trendStrength: null },
      factors: { qualityFactor: 50, valueFactor: 50, growthFactor: 50, momentumFactor: 50, riskFactor: 50, sectorStrengthFactor: 50, factorScore: 50 },
      financials: { peRatio: null, pbRatio: null, eps: null, dividendYield: null, beta: null, marketCap: null, freeFloat: null, fcfYield: null, evEbitda: null, roa: null, roe: null, roic: null, debtToEquity: null, currentRatio: null, revenueGrowth: null, profitGrowth: null, epsGrowth: null, fcfGrowth: null, grossMargin: null, operatingMargin: null },
    };
    const result = engine.evaluate(inputs);
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.confidence).toBe('Low'); // 4 critical fields missing
  });

  // ─── Sector-specific tests ──────────────────────────────────────

  it('Banking: bank with typical metrics gets reasonable scores', () => {
    const result = engine.evaluate(makeInputs({
      symbol: 'HDFCBANK',
      financials: {
        ...makeInputs().financials,
        peRatio: 18, pbRatio: 2.8, roe: 0.15, roic: 0.12,
        debtToEquity: 8.0, currentRatio: 1.05,
        grossMargin: 0.02, operatingMargin: 0.28,
        revenueGrowth: 0.15, epsGrowth: 0.18, fcfYield: 0.03,
      },
      sector: { name: 'Banking', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    // Bank should not be crushed — sector-aware thresholds should give reasonable scores
    expect(result.stability).toBeGreaterThan(30);
    expect(result.quality).toBeGreaterThan(30);
  });

  it('FMCG: typical FMCG metrics get fair valuation scores', () => {
    const result = engine.evaluate(makeInputs({
      symbol: 'HINDUNILVR',
      financials: {
        ...makeInputs().financials,
        peRatio: 55, pbRatio: 12, evEbitda: 35,
        roe: 0.30, grossMargin: 0.55, operatingMargin: 0.25,
        debtToEquity: 0.05, currentRatio: 2.5,
        revenueGrowth: 0.10, epsGrowth: 0.15, fcfYield: 0.025,
      },
      sector: { name: 'FMCG', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    // FMCG PE 55 → FMCG peExtreme = 65, so PE=55 is between expensive (50) and extreme (65)
    // PB 12 → FMCG pbExtreme = 15, so PB=12 is between expensive (10) and extreme (15)
    // Valuation should be in reasonable range, not single digits
    expect(result.valuation).toBeGreaterThan(20);
  });

  it('Technology: typical tech metrics score well on quality', () => {
    const result = engine.evaluate(makeInputs({
      symbol: 'INFY',
      financials: {
        ...makeInputs().financials,
        peRatio: 22, pbRatio: 5.0, evEbitda: 16,
        grossMargin: 0.65, operatingMargin: 0.25, roe: 0.25,
        debtToEquity: 0.1, currentRatio: 3.0,
        revenueGrowth: 0.12, epsGrowth: 0.10, fcfYield: 0.05,
      },
      sector: { name: 'Technology', sectorStrength: 55, sectorMomentum: 'Steady' },
    }));
    expect(result.quality).toBeGreaterThanOrEqual(55);
    expect(result.growth).toBeGreaterThanOrEqual(40);
  });

  // ─── Narrative compliance tests ─────────────────────────────────

  it('narrative does not contain advisory language', () => {
    const result = engine.evaluate(makeInputs());
    const narrative = result.narrative.toLowerCase();
    // Must NOT contain recommendation-style phrases
    expect(narrative).not.toContain('compelling case');
    expect(narrative).not.toContain('recommend');
    expect(narrative).not.toContain('should buy');
    expect(narrative).not.toContain('should sell');
    expect(narrative).not.toContain('strong buy');
    expect(narrative).not.toContain('strong sell');
  });

  it('narrative uses descriptive language', () => {
    const result = engine.evaluate(makeInputs());
    const narrative = result.narrative;
    // Should contain descriptive terms
    const hasDescriptive =
      narrative.includes('registers') ||
      narrative.includes('presents') ||
      narrative.includes('maintains') ||
      narrative.includes('shows');
    expect(hasDescriptive).toBe(true);
  });

  // ─── Missing critical fields test ───────────────────────────────

  it('missing critical fields caps confidence at Medium', () => {
    const result = engine.evaluate(makeInputs({
      financials: {
        ...makeInputs().financials,
        roe: null, roic: null, // 2 critical missing
      },
    }));
    expect(['Medium', 'Low']).toContain(result.confidence);
  });

  // ─── Risk dampening test ────────────────────────────────────────

  it('strong risk dampening reduces health score significantly for high risk', () => {
    const safeResult = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 0.1, fcfYield: 0.06 },
      features: { ...makeInputs().features, volatility: 0.12 },
    }));
    const riskyResult = engine.evaluate(makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 3.0, fcfYield: -0.08, operatingMargin: -0.05 },
      features: { ...makeInputs().features, volatility: 0.75 },
    }));
    // Risk dampening should create meaningful difference
    expect(safeResult.healthScore - riskyResult.healthScore).toBeGreaterThan(10);
  });
});
