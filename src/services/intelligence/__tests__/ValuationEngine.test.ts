/**
 * Valuation Engine Tests
 *
 * Verifies that the 5-module valuation aggregator scores stocks correctly
 * across PE, PB, EV/EBITDA, FCF yield, and dividend yield.
 */
import { describe, it, expect } from 'vitest';
import { ValuationEngine } from '../engines/ValuationEngine/index';
import type { ValuationMetrics } from '../types';

const engine = new ValuationEngine();

function makeMetrics(overrides: Partial<ValuationMetrics> = {}): ValuationMetrics {
  return {
    peRatio: 15,          // Reasonable PE
    pbRatio: 2.5,         // Fair PB
    evEbitda: 12,         // Reasonable EV/EBITDA
    fcfYield: 0.04,       // 4% FCF yield
    dividendYield: 0.02,  // 2% dividend
    lastUpdated: new Date(),
    ...overrides,
  };
}

describe('ValuationEngine', () => {
  it('scores a fairly-valued stock at moderate level', async () => {
    const result = await engine.analyze(
      makeMetrics({ peRatio: 18, pbRatio: 3.0, evEbitda: 14, fcfYield: 0.03, dividendYield: 0.015 })
    );
    expect(result.overall).toBeGreaterThanOrEqual(35);
    expect(result.overall).toBeLessThanOrEqual(75);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('scores a deep-value stock high', async () => {
    const result = await engine.analyze(
      makeMetrics({ peRatio: 8, pbRatio: 0.8, evEbitda: 6, fcfYield: 0.08, dividendYield: 0.04 })
    );
    expect(result.overall).toBeGreaterThanOrEqual(65);
    expect(result.valuation).toBe('undervalued');
  });

  it('scores an expensive stock low', async () => {
    const result = await engine.analyze(
      makeMetrics({ peRatio: 35, pbRatio: 8, evEbitda: 30, fcfYield: 0.01, dividendYield: 0.005 })
    );
    expect(result.overall).toBeLessThanOrEqual(50);
    expect(result.valuation).toBe('expensive');
  });

  it('handles missing data gracefully', async () => {
    const result = await engine.analyze(
      makeMetrics({ peRatio: null, pbRatio: null, evEbitda: null, fcfYield: null, dividendYield: null })
    );
    expect(result.overall).toBe(46); // All modules use their default scores
    expect(result.dataCompleteness).toBe(0);
  });

  it('handles negative PE (unprofitable)', async () => {
    const result = await engine.analyze(
      makeMetrics({ peRatio: -5, pbRatio: 2, evEbitda: 20, fcfYield: 0.02, dividendYield: 0.01 })
    );
    expect(result.details.pe.score).toBeLessThanOrEqual(5);
    expect(result.overall).toBeLessThanOrEqual(60);
  });

  it('adjusts confidence based on module alignment', async () => {
    // Well-aligned: all metrics signal deep value
    const aligned = await engine.analyze(
      makeMetrics({ peRatio: 7, pbRatio: 0.7, evEbitda: 5, fcfYield: 0.09, dividendYield: 0.05 })
    );
    // Misaligned: some cheap, some expensive
    const misaligned = await engine.analyze(
      makeMetrics({ peRatio: 8, pbRatio: 7, evEbitda: 30, fcfYield: 0.01, dividendYield: 0.12 })
    );
    expect(aligned.confidence).toBeGreaterThan(misaligned.confidence);
  });

  it('returns valid output keys', async () => {
    const result = await engine.analyze(makeMetrics());
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('valuation');
    expect(result).toHaveProperty('peScore');
    expect(result).toHaveProperty('pbScore');
    expect(result).toHaveProperty('evEbitdaScore');
    expect(result).toHaveProperty('fcfYieldScore');
    expect(result).toHaveProperty('dividendYieldScore');
    expect(result.details).toHaveProperty('pe');
    expect(result.details).toHaveProperty('pb');
    expect(result.details).toHaveProperty('evEbitda');
    expect(result.details).toHaveProperty('fcfYield');
    expect(result.details).toHaveProperty('dividend');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasoning');
    expect(['undervalued', 'fair_value', 'premium', 'expensive']).toContain(result.valuation);
  });
});
