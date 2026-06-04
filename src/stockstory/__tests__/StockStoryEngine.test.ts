/**
 * StockStory Engine Tests
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
import {
  EngineInputs,
  clampScore,
  weightedAverage,
} from '../types';

// ─── Test Fixture Factory ─────────────────────────────────────────

function makeInputs(overrides: Partial<EngineInputs> = {}): EngineInputs {
  return {
    symbol: 'TEST',
    tradeDate: '2026-06-05',
    features: {
      rsi: 55,
      macd: 2.5,
      macdSignal: 1.8,
      macdHistogram: 0.7,
      adx: 28,
      atr: 15.5,
      bollingerWidth: 0.08,
      momentum: 0.03,
      volatility: 0.22,
      relativeStrength: 0.01,
      movingAverageDistance: 0.02,
      trendStrength: 0.03,
    },
    factors: {
      qualityFactor: 65,
      valueFactor: 55,
      growthFactor: 58,
      momentumFactor: 60,
      riskFactor: 45,
      sectorStrengthFactor: 55,
      factorScore: 56,
    },
    financials: {
      peRatio: 18,
      pbRatio: 3.2,
      eps: 120,
      dividendYield: 1.8,
      beta: 1.1,
      marketCap: 500000,
      freeFloat: 45,
      fcfYield: 0.04,
      evEbitda: 12,
      roe: 0.18,
      roic: 0.14,
      debtToEquity: 0.5,
      currentRatio: 2.0,
      revenueGrowth: 0.12,
      profitGrowth: 0.15,
      epsGrowth: 0.14,
      fcfGrowth: 0.08,
      grossMargin: 0.45,
      operatingMargin: 0.22,
    },
    historical: {
      featureHistory: Array.from({ length: 15 }, (_, i) => ({
        tradeDate: `2026-05-${String(20 + i).padStart(2, '0')}`,
        rsi: 50 + i * 0.3,
        macdHistogram: 0.5 + i * 0.02,
        adx: 25 + i * 0.2,
        volatility: 0.22 - i * 0.002,
      })),
      factorHistory: Array.from({ length: 10 }, (_, i) => ({
        tradeDate: `2026-05-${String(25 + i).padStart(2, '0')}`,
        factorScore: 54 + i * 0.3,
        qualityFactor: 63 + i * 0.2,
        riskFactor: 46 - i * 0.1,
        growthFactor: 56 + i * 0.2,
      })),
      priceHistory: [
        { tradeDate: '2026-05-01', close: 2450 },
        { tradeDate: '2026-05-15', close: 2520 },
        { tradeDate: '2026-06-01', close: 2580 },
      ],
    },
    sector: {
      name: 'Technology',
      sectorStrength: 55,
      sectorMomentum: 'Steady',
    },
    ...overrides,
  };
}

// ─── Utility Tests ────────────────────────────────────────────────

describe('Utility functions', () => {
  it('clampScore clamps to 0-100', () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-20)).toBe(0);
    expect(clampScore(73.4)).toBe(73);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });

  it('weightedAverage computes correctly', () => {
    const result = weightedAverage([
      { score: 100, weight: 1 },
      { score: 0, weight: 1 },
    ]);
    expect(result).toBe(50);

    const result2 = weightedAverage([
      { score: 80, weight: 3 },
      { score: 40, weight: 1 },
    ]);
    expect(result2).toBe(70);
  });

  it('weightedAverage returns 50 for zero weights', () => {
    const result = weightedAverage([]);
    expect(result).toBe(50);
  });
});

// ─── Engine 1: Growth Engine ──────────────────────────────────────

describe('GrowthEngine', () => {
  const engine = new GrowthEngine();

  it('scores strong growth highly', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: 0.20,
        epsGrowth: 0.25,
        fcfGrowth: 0.18,
        profitGrowth: 0.22,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.revenueGrowth).toBe(0.20);
  });

  it('scores weak growth low', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: -0.05,
        epsGrowth: -0.10,
        fcfGrowth: -0.05,
        profitGrowth: -0.08,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeLessThan(40);
  });

  it('handles null growth data gracefully', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: null,
        epsGrowth: null,
        fcfGrowth: null,
        profitGrowth: null,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ─── Engine 2: Quality Engine ─────────────────────────────────────

describe('QualityEngine', () => {
  const engine = new QualityEngine();

  it('scores premium quality highly', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        roe: 0.28,
        roic: 0.22,
        grossMargin: 0.65,
        operatingMargin: 0.30,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('scores weak quality low', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        roe: 0.03,
        roic: 0.02,
        grossMargin: 0.08,
        operatingMargin: 0.03,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeLessThan(40);
  });
});

// ─── Engine 3: Stability Engine ───────────────────────────────────

describe('StabilityEngine', () => {
  const engine = new StabilityEngine();

  it('scores low-debt high-liquidity highly', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        debtToEquity: 0.1,
        currentRatio: 3.5,
        operatingMargin: 0.25,
      },
      features: {
        ...makeInputs().features,
        volatility: 0.12,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('flags high leverage as risky', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        debtToEquity: 2.5,
        currentRatio: 0.4,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeLessThan(45);
  });
});

// ─── Engine 4: Momentum Engine ────────────────────────────────────

describe('MomentumEngine', () => {
  const engine = new MomentumEngine();

  it('scores bullish momentum highly', () => {
    const inputs = makeInputs({
      features: {
        ...makeInputs().features,
        rsi: 60,
        macd: 3.5,
        macdSignal: 2.0,
        macdHistogram: 1.5,
        adx: 35,
        trendStrength: 0.06,
        atr: 10,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('scores bearish momentum low', () => {
    const inputs = makeInputs({
      features: {
        ...makeInputs().features,
        rsi: 25,
        macd: -3.0,
        macdSignal: -1.0,
        macdHistogram: -2.0,
        adx: 15,
        trendStrength: -0.06,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeLessThan(40);
  });

  it('does not expose raw RSI directly', () => {
    const inputs = makeInputs();
    const result = engine.evaluate(inputs);
    // Check the output shape — only sub-scores, no raw values
    expect(result).toHaveProperty('rsiScore');
    expect(result).toHaveProperty('macdScore');
    expect(result).toHaveProperty('adxScore');
    expect(result).toHaveProperty('trendStrengthScore');
    expect(result).not.toHaveProperty('rsi');
    expect(result).not.toHaveProperty('macd');
    expect(result).not.toHaveProperty('adx');
    expect(result).not.toHaveProperty('atr');
  });
});

// ─── Engine 5: Valuation Engine ───────────────────────────────────

describe('ValuationEngine', () => {
  const engine = new ValuationEngine();

  it('scores cheap valuation highly', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        peRatio: 8,
        pbRatio: 1.2,
        evEbitda: 6,
        fcfYield: 0.09,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('scores expensive valuation low', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        peRatio: 55,
        pbRatio: 8,
        evEbitda: 35,
        fcfYield: 0.005,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeLessThan(35);
  });
});

// ─── Engine 6: Risk Engine ────────────────────────────────────────

describe('RiskEngine', () => {
  const engine = new RiskEngine();

  it('flags high-risk profiles', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        peRatio: -5,
        pbRatio: 15,
        debtToEquity: 3.5,
        fcfYield: -0.08,
        currentRatio: 0.3,
      },
      features: {
        ...makeInputs().features,
        volatility: 0.65,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.redFlagCount).toBeGreaterThan(0);
  });

  it('scores low-risk profiles low', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        debtToEquity: 0.2,
        fcfYield: 0.06,
        currentRatio: 3.0,
        revenueGrowth: 0.12,
        epsGrowth: 0.10,
      },
      features: {
        ...makeInputs().features,
        volatility: 0.12,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.score).toBeLessThan(40);
    expect(result.redFlagCount).toBe(0);
  });

  it('detects revenue-EPS divergence as anomaly', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: 0.05,
        epsGrowth: 0.40, // huge divergence
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.redFlagCount).toBeGreaterThanOrEqual(1);
  });
});

// ─── Engine 7: Confidence Engine ──────────────────────────────────

describe('ConfidenceEngine', () => {
  const engine = new ConfidenceEngine();

  it('outputs one of four confidence levels', () => {
    const inputs = makeInputs();
    const crossScores = {
      growth: 75,
      quality: 72,
      stability: 78,
      momentum: 70,
      valuation: 68,
      risk: 30,
    };
    const result = engine.evaluate(inputs, crossScores);
    expect(['Very High', 'High', 'Medium', 'Low']).toContain(result.level);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('gives high confidence when signals agree', () => {
    const inputs = makeInputs();
    const crossScores = {
      growth: 75,
      quality: 76,
      stability: 74,
      momentum: 75,
      valuation: 73,
      risk: 28,
    };
    const result = engine.evaluate(inputs, crossScores);
    expect(result.level).toBe('Very High');
    expect(result.signalAgreement).toBeGreaterThanOrEqual(80);
  });

  it('gives low confidence with sparse data', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        peRatio: null,
        pbRatio: null,
        fcfYield: null,
        evEbitda: null,
        roe: null,
        roic: null,
        debtToEquity: null,
        revenueGrowth: null,
        epsGrowth: null,
      },
      historical: undefined,
    });
    const crossScores = {
      growth: 30,
      quality: 70,
      stability: 25,
      momentum: 80,
      valuation: 20,
      risk: 75,
    };
    const result = engine.evaluate(inputs, crossScores);
    expect(['Medium', 'Low']).toContain(result.level);
  });
});

// ─── StockStory Orchestrator ──────────────────────────────────────

describe('StockStoryEngine (orchestrator)', () => {
  const engine = new StockStoryEngine();

  it('produces a complete output contract', () => {
    const inputs = makeInputs();
    const result = engine.evaluate(inputs);

    // Shape check
    expect(result).toHaveProperty('healthScore');
    expect(result).toHaveProperty('classification');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('growth');
    expect(result).toHaveProperty('quality');
    expect(result).toHaveProperty('stability');
    expect(result).toHaveProperty('valuation');
    expect(result).toHaveProperty('momentum');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('narrative');
    expect(result).toHaveProperty('engineDetails');
    expect(result).toHaveProperty('generatedAt');
    expect(result).toHaveProperty('dataFreshness');

    // Range checks
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.growth).toBeGreaterThanOrEqual(0);
    expect(result.growth).toBeLessThanOrEqual(100);
    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(result.quality).toBeLessThanOrEqual(100);
    expect(result.stability).toBeGreaterThanOrEqual(0);
    expect(result.stability).toBeLessThanOrEqual(100);
    expect(result.momentum).toBeGreaterThanOrEqual(0);
    expect(result.momentum).toBeLessThanOrEqual(100);
    expect(result.valuation).toBeGreaterThanOrEqual(0);
    expect(result.valuation).toBeLessThanOrEqual(100);
    expect(result.risk).toBeGreaterThanOrEqual(0);
    expect(result.risk).toBeLessThanOrEqual(100);

    // Classification check
    expect([
      'Excellent',
      'Healthy',
      'Stable',
      'Weakening',
      'At Risk',
    ]).toContain(result.classification);

    // Confidence level check
    expect(['Very High', 'High', 'Medium', 'Low']).toContain(
      result.confidence
    );

    // Narrative is non-empty
    expect(result.narrative.length).toBeGreaterThan(50);

    // Engine details are fully populated
    expect(result.engineDetails.growth.commentary.length).toBeGreaterThan(0);
    expect(result.engineDetails.quality.commentary.length).toBeGreaterThan(0);
    expect(result.engineDetails.stability.commentary.length).toBeGreaterThan(0);
    expect(result.engineDetails.momentum.commentary.length).toBeGreaterThan(0);
    expect(result.engineDetails.valuation.commentary.length).toBeGreaterThan(0);
    expect(result.engineDetails.risk.commentary.length).toBeGreaterThan(0);
    expect(result.engineDetails.confidence.commentary.length).toBeGreaterThan(0);

    // Data freshness
    expect(['Live', 'Recent', 'Stale', 'Unavailable']).toContain(
      result.dataFreshness
    );
  });

  it('classifies an excellent company correctly', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: 0.25,
        epsGrowth: 0.30,
        fcfGrowth: 0.25,
        profitGrowth: 0.28,
        roe: 0.30,
        roic: 0.25,
        grossMargin: 0.65,
        operatingMargin: 0.35,
        debtToEquity: 0.05,
        currentRatio: 4.0,
        peRatio: 12,
        pbRatio: 2.5,
        evEbitda: 8,
        fcfYield: 0.07,
      },
      features: {
        ...makeInputs().features,
        rsi: 58,
        trendStrength: 0.06,
        volatility: 0.10,
        adx: 32,
      },
      historical: {
        featureHistory: Array.from({ length: 25 }, (_, i) => ({
          tradeDate: `2026-05-${String(10 + i).padStart(2, '0')}`,
          rsi: 55 + i * 0.1,
          macdHistogram: 0.6 + i * 0.01,
          adx: 30 + i * 0.05,
          volatility: 0.11,
        })),
        factorHistory: Array.from({ length: 15 }, (_, i) => ({
          tradeDate: `2026-05-${String(20 + i).padStart(2, '0')}`,
          factorScore: 78 + i * 0.1,
          qualityFactor: 80,
          riskFactor: 20,
          growthFactor: 78,
        })),
        priceHistory: [
          { tradeDate: '2026-01-01', close: 3000 },
          { tradeDate: '2026-06-01', close: 3800 },
        ],
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.classification).toBe('Excellent');
    expect(result.healthScore).toBeGreaterThanOrEqual(75);
    expect(result.risk).toBeLessThan(50);
    expect(['Very High', 'High']).toContain(result.confidence);
  });

  it('classifies an at-risk company correctly', () => {
    const inputs = makeInputs({
      financials: {
        ...makeInputs().financials,
        revenueGrowth: -0.10,
        epsGrowth: -0.15,
        fcfGrowth: -0.12,
        profitGrowth: -0.20,
        roe: -0.05,
        roic: -0.03,
        grossMargin: 0.05,
        operatingMargin: -0.02,
        debtToEquity: 4.0,
        currentRatio: 0.3,
        peRatio: -8,
        pbRatio: 0.5,
        evEbitda: -5,
        fcfYield: -0.10,
      },
      features: {
        ...makeInputs().features,
        rsi: 22,
        trendStrength: -0.08,
        volatility: 0.70,
        adx: 10,
      },
    });
    const result = engine.evaluate(inputs);
    expect(result.classification).toBe('At Risk');
    expect(result.healthScore).toBeLessThan(35);
    expect(result.risk).toBeGreaterThan(50);
  });

  it('handles minimal data gracefully', () => {
    const inputs: EngineInputs = {
      symbol: 'MINIMAL',
      tradeDate: '2026-06-05',
      features: {
        rsi: null,
        macd: null,
        macdSignal: null,
        macdHistogram: null,
        adx: null,
        atr: null,
        bollingerWidth: null,
        momentum: null,
        volatility: null,
        relativeStrength: null,
        movingAverageDistance: null,
        trendStrength: null,
      },
      factors: {
        qualityFactor: 50,
        valueFactor: 50,
        growthFactor: 50,
        momentumFactor: 50,
        riskFactor: 50,
        sectorStrengthFactor: 50,
        factorScore: 50,
      },
      financials: {
        peRatio: null,
        pbRatio: null,
        eps: null,
        dividendYield: null,
        beta: null,
        marketCap: null,
        freeFloat: null,
        fcfYield: null,
        evEbitda: null,
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
      },
    };
    const result = engine.evaluate(inputs);
    // Should not throw, and should produce a valid output
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.classification).toBeDefined();
    expect(result.confidence).toBeDefined();
  });

  it('risk dampening reduces health score for risky companies', () => {
    const safeInputs = makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 0.1, fcfYield: 0.06 },
      features: { ...makeInputs().features, volatility: 0.12 },
    });
    const safeResult = engine.evaluate(safeInputs);

    const riskyInputs = makeInputs({
      financials: { ...makeInputs().financials, debtToEquity: 3.0, fcfYield: -0.08 },
      features: { ...makeInputs().features, volatility: 0.65 },
    });
    const riskyResult = engine.evaluate(riskyInputs);

    expect(riskyResult.healthScore).toBeLessThan(safeResult.healthScore);
  });
});
