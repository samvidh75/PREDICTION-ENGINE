import { describe, expect, it } from 'vitest';
import { AuthorizedProviderQualityGate, QUALITY_GATE_THRESHOLDS } from './AuthorizedProviderQualityGate';
import type { FinancialData } from '../FinancialProvider';

function makeValidFinancialData(): FinancialData {
  return {
    symbol: 'RELIANCE',
    periodEnd: '2025-03-31',
    peRatio: 22.5,
    pbRatio: 3.1,
    roe: 0.12,
    roic: 0.10,
    evEbitda: 15.2,
    debtToEquity: 0.45,
    marketCap: 18_000_000_000,
    eps: 68.5,
    dividendYield: 0.035,
    beta: 1.2,
    revenueGrowth: 0.08,
    profitGrowth: 0.12,
    epsGrowth: 0.10,
    fcfGrowth: 0.05,
    grossMargin: 0.35,
    operatingMargin: 0.18,
    currentRatio: 1.5,
    fcfYield: 0.04,
    roa: 0.08,
    netMargin: 0.12,
    freeFloat: 0.48,
    _sources: { peRatio: 'upstox', eps: 'finnhub' },
    _fieldConfidence: { peRatio: 0.9, eps: 0.85 },
  };
}

describe('AuthorizedProviderQualityGate', () => {
  describe('validateFinancialData', () => {
    it('passes valid FinancialData with all required fields', () => {
      const result = AuthorizedProviderQualityGate.validateFinancialData(makeValidFinancialData());
      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.fieldCompleteness).toBeGreaterThanOrEqual(0.7);
    });

    it('fails when required scoring fields are missing', () => {
      const data = makeValidFinancialData() as Record<string, unknown>;
      delete data.peRatio;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('peRatio'))).toBe(true);
    });

    it('fails when required field is null', () => {
      const data = makeValidFinancialData() as Record<string, unknown>;
      data.roe = null;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('roe'))).toBe(true);
    });

    it('fails when required field is undefined', () => {
      const data = makeValidFinancialData() as Record<string, unknown>;
      data.marketCap = undefined;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('marketCap'))).toBe(true);
    });

    it('fails when PE is negative', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).peRatio = -1;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('peRatio'))).toBe(true);
    });

    it('fails when PE is above max threshold', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).peRatio = 10001;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('peRatio'))).toBe(true);
    });

    it('fails when PB is negative', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).pbRatio = -0.01;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('pbRatio'))).toBe(true);
    });

    it('fails when marketCap is below minimum', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).marketCap = 1_000_000;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('marketCap'))).toBe(true);
    });

    it('fails when debtToEquity is negative', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).debtToEquity = -0.1;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('debtToEquity'))).toBe(true);
    });

    it('fails when EPS is NaN', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).eps = NaN;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
    });

    it('fails when EPS is Infinity', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).eps = Infinity;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
    });

    it('fails when field completeness is below 0.7', () => {
      const data = makeValidFinancialData() as Record<string, unknown>;
      const allFields = [
        'peRatio', 'pbRatio', 'roe', 'roic', 'evEbitda', 'debtToEquity',
        'marketCap', 'eps', 'dividendYield', 'beta', 'revenueGrowth',
        'profitGrowth', 'epsGrowth', 'fcfGrowth', 'grossMargin',
        'operatingMargin', 'currentRatio', 'fcfYield', 'roa', 'netMargin',
        'freeFloat',
      ];
      for (const field of allFields) {
        delete data[field];
      }
      data.peRatio = 15;
      data.marketCap = 50_000_000_000;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('completeness'))).toBe(true);
    });

    it('warns on low confidence scores', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>)._fieldConfidence = { peRatio: 0.1, eps: 0.95 };
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.warnings.some((w) => w.includes('Low confidence'))).toBe(true);
    });

    it('handles NaN values in expected fields', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).operatingMargin = NaN;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
    });

    it('handles Infinity values in expected fields', () => {
      const data = makeValidFinancialData();
      (data as Record<string, unknown>).revenueGrowth = Infinity;
      const result = AuthorizedProviderQualityGate.validateFinancialData(data);
      expect(result.passed).toBe(false);
    });
  });

  describe('crossValidate', () => {
    const makePrimary = () => ({
      symbol: 'RELIANCE',
      peRatio: 22.5,
      pbRatio: 3.1,
      eps: 68.5,
      roe: 0.12,
      revenueGrowth: 0.08,
    });

    it('passes when data matches within tolerance', () => {
      const primary = makePrimary();
      const secondary = { ...primary };
      const result = AuthorizedProviderQualityGate.crossValidate(primary, secondary, 0.1);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns when data differs beyond tolerance', () => {
      const primary = makePrimary();
      const secondary = { ...primary, peRatio: 45 };
      const result = AuthorizedProviderQualityGate.crossValidate(primary, secondary, 0.1);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('peRatio'))).toBe(true);
    });

    it('passes with empty data', () => {
      const result = AuthorizedProviderQualityGate.crossValidate({}, {}, 0.1);
      expect(result.passed).toBe(true);
    });

    it('ignores metadata fields (_sources, _raw)', () => {
      const primary = makePrimary();
      const secondary = { ...primary, _sources: { peRatio: 'upstox' }, _raw: { key: 'val' } };
      const result = AuthorizedProviderQualityGate.crossValidate(primary, secondary, 0.1);
      expect(result.passed).toBe(true);
    });

    it('warns when string fields differ', () => {
      const primary = { symbol: 'RELIANCE', sector: 'Energy' };
      const secondary = { symbol: 'RELIANCE', sector: 'Oil' };
      const result = AuthorizedProviderQualityGate.crossValidate(primary, secondary, 0.1);
      expect(result.warnings.some((w) => w.includes('sector'))).toBe(true);
    });

    it('returns accuracy of 1 when all fields match', () => {
      const primary = makePrimary();
      const secondary = { ...primary };
      const result = AuthorizedProviderQualityGate.crossValidate(primary, secondary, 0.1);
      expect(result.fieldAccuracy).toBe(1);
    });

    it('handles null values without error', () => {
      const primary = makePrimary();
      const secondary = { ...primary, peRatio: null };
      const result = AuthorizedProviderQualityGate.crossValidate(primary, secondary, 0.1);
      expect(result.passed).toBe(true);
    });
  });

  describe('QUALITY_GATE_THRESHOLDS', () => {
    it('has all required threshold values', () => {
      expect(QUALITY_GATE_THRESHOLDS.minFieldCompleteness).toBe(0.7);
      expect(QUALITY_GATE_THRESHOLDS.minFieldConfidence).toBe(0.3);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.minPE).toBe(0);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.maxPE).toBe(10000);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.minPB).toBe(0);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.maxPB).toBe(100);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.minMarketCap).toBe(10000000);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.maxDebtToEquity).toBe(100);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.minEPS).toBe(-10000);
      expect(QUALITY_GATE_THRESHOLDS.reasonable.maxEPS).toBe(100000);
    });
  });
});
