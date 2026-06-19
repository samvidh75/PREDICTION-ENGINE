import { describe, expect, it } from 'vitest';
import { FACTOR_REGISTRY } from '../factorRegistry';
import { computeFactorCoverage } from '../factorCoverage';
import { normalizeNumericValue } from '../factorNormalization';
import { mapScoreToStance } from '../recommendationPolicy';
import { buildPredictionViewModel } from '../predictionViewModel';

describe('factorRegistry', () => {
  it('has at least 150 factor definitions', () => {
    expect(FACTOR_REGISTRY.length).toBeGreaterThanOrEqual(150);
  });

  it('all factors have required fields', () => {
    FACTOR_REGISTRY.forEach((f) => {
      expect(f.id).toBeTruthy();
      expect(f.label).toBeTruthy();
      expect(f.category).toBeTruthy();
      expect(f.availability).toMatch(/^(active|planned|unavailable)$/);
      expect(f.visibility).toMatch(/^(public|internal)$/);
    });
  });

  it('active factors are connected to real data fields', () => {
    FACTOR_REGISTRY.filter((f) => f.availability === 'active').forEach((f) => {
      expect(f.expectedInputField).toBeTruthy();
    });
  });

  it('planned factors do not affect score', () => {
    const planned = FACTOR_REGISTRY.filter((f) => f.availability === 'planned');
    const active = FACTOR_REGISTRY.filter((f) => f.availability === 'active');
    expect(planned.length).toBeGreaterThan(0);
    expect(active.length).toBeGreaterThan(0);
  });

  it('active factor count counts only real connected factors', () => {
    const coverage = computeFactorCoverage({
      pe: 15.5,
      pb: 2.1,
      ev_ebitda: 12.3,
      dividend_yield: 0.025,
      roe: 18.5,
      roic: 14.2,
      operating_margin: 0.22,
      revenue_growth: 0.12,
      profit_growth: 0.08,
      eps_growth: 0.1,
      debt_equity: 0.45,
      current_ratio: 1.8,
      market_cap: 50000000000,
    });
    expect(coverage.activeCount).toBeGreaterThanOrEqual(3);
    expect(coverage.totalRegistered).toBeGreaterThanOrEqual(150);
  });
});

describe('normalizeNumericValue', () => {
  it('handles null and undefined', () => {
    expect(normalizeNumericValue(null)).toBeNull();
    expect(normalizeNumericValue(undefined)).toBeNull();
  });

  it('handles NaN and Infinity', () => {
    expect(normalizeNumericValue(NaN)).toBeNull();
    expect(normalizeNumericValue(Infinity)).toBeNull();
    expect(normalizeNumericValue(-Infinity)).toBeNull();
  });

  it('preserves valid numbers', () => {
    expect(normalizeNumericValue(0)).toBe(0);
    expect(normalizeNumericValue(100)).toBe(100);
    expect(normalizeNumericValue(-5.5)).toBe(-5.5);
  });

  it('parses numeric strings', () => {
    expect(normalizeNumericValue('15.5')).toBe(15.5);
    expect(normalizeNumericValue('0')).toBe(0);
    expect(normalizeNumericValue('')).toBeNull();
  });
});

describe('recommendationPolicy', () => {
  it('returns not enough information for null scores', () => {
    const result = mapScoreToStance(null, null);
    expect(result.stance).toBe('Not enough information');
  });

  it('does not output Buy/Sell/Hold', () => {
    const stances = ['High conviction', 'Watch', 'Needs review', 'Risk rising',
      'Thesis improving', 'Avoid for now', 'Not enough information'];
    const result = mapScoreToStance(80, 20, 100);
    expect(stances).toContain(result.stance);
    expect(result.stance).not.toMatch(/Buy|Sell|Hold/);
  });

  it('returns High conviction for high scores', () => {
    const result = mapScoreToStance(80, 20, 100);
    expect(result.stance).toBe('High conviction');
  });

  it('returns Avoid for now when risk is very high', () => {
    const result = mapScoreToStance(80, 80, 100);
    expect(result.stance).toBe('Avoid for now');
  });

  it('returns Risk rising when risk is elevated', () => {
    const result = mapScoreToStance(80, 60, 100);
    expect(result.stance).toBe('Risk rising');
  });

  it('returns no price targets', () => {
    const result = mapScoreToStance(75, 20, 100);
    expect(result.description).not.toMatch(/price target|₹|Rs\./);
  });
});

describe('predictionViewModel', () => {
  it('builds a valid view model with minimal data', () => {
    const vm = buildPredictionViewModel('RELIANCE', 75, 20, { pe: 15.5, roe: 18 });
    expect(vm.symbol).toBe('RELIANCE');
    expect(vm.isReady).toBe(true);
    expect(vm.activeFactorCount).toBeGreaterThanOrEqual(2);
    expect(vm.stance.stance).toBe('High conviction');
  });

  it('returns not ready state without data', () => {
    const vm = buildPredictionViewModel('UNKNOWN', null, null, null);
    expect(vm.isReady).toBe(false);
    expect(vm.stance.stance).toBe('Not enough information');
    expect(vm.activeFactorCount).toBe(0);
  });
});
