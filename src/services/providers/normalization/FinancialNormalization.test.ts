import { describe, expect, it } from 'vitest';
import {
  finiteNumberOrNull,
  parseIndianNumber,
  parsePercentageFraction,
  parseCurrencyToInr,
  parseDateOrNull,
  normalizeSymbol,
  normalizeExchange,
  calculateDerivedRatios,
  calculateGrowthRate,
  sanitizeProviderDiagnostic,
} from './FinancialNormalization';

describe('finiteNumberOrNull', () => {
  it.each([
    { input: null, expected: null },
    { input: undefined, expected: null },
    { input: NaN, expected: null },
    { input: Infinity, expected: null },
    { input: -Infinity, expected: null },
    { input: 'some', expected: null },
    { input: '', expected: null },
    { input: '   ', expected: null },
    { input: 42, expected: 42 },
    { input: 0, expected: 0 },
    { input: -1, expected: -1 },
    { input: '42', expected: 42 },
    { input: '0', expected: 0 },
  ])('returns $expected for $input', ({ input, expected }) => {
    expect(finiteNumberOrNull(input)).toBe(expected);
  });
});

describe('parseIndianNumber', () => {
  it.each([
    { input: '1,23,456', expected: 123456 },
    { input: '12,34,567', expected: 1234567 },
    { input: '1,23,45,678', expected: 12345678 },
    { input: '₹ 1,234 Cr', expected: 12340000000 },
    { input: '₹ 1,23,456 Cr', expected: 1234560000000 },
    { input: '₹500 Cr', expected: 5000000000 },
    { input: '2.5 Cr', expected: 25000000 },
    { input: '2.5 crore', expected: 25000000 },
    { input: '1.25 lakh', expected: 125000 },
    { input: '1.25 Lac', expected: 125000 },
    { input: '12.4%', expected: 12.4 },
    { input: '—', expected: null },
    { input: '–', expected: null },
    { input: '-', expected: null },
    { input: 'NA', expected: null },
    { input: 'N/A', expected: null },
    { input: 'N.A.', expected: null },
    { input: '', expected: null },
    { input: '   ', expected: null },
    { input: '(1,234)', expected: -1234 },
    { input: '(₹ 100 Cr)', expected: -1000000000 },
    { input: '-500', expected: -500 },
    { input: '₹ 0 Cr', expected: 0 },
  ])('returns $expected for "$input"', ({ input, expected }) => {
    expect(parseIndianNumber(input)).toBe(expected);
  });
});

describe('parsePercentageFraction', () => {
  it.each([
    { input: '12.4%', expected: 0.124 },
    { input: '-5.2%', expected: -0.052, closeTo: true },
    { input: '0%', expected: 0 },
    { input: '100%', expected: 1 },
    { input: '—', expected: null },
    { input: 'N/A', expected: null },
    { input: 'NA', expected: null },
    { input: '', expected: null },
    { input: null as unknown as string, expected: null },
  ])('returns $expected for "$input"', ({ input, expected, closeTo }) => {
    if (closeTo) {
      expect(parsePercentageFraction(input)).toBeCloseTo(expected as number, 10);
    } else {
      expect(parsePercentageFraction(input)).toBe(expected);
    }
  });
});

describe('parseCurrencyToInr', () => {
  it.each([
    { input: '₹ 1,234 Cr', expected: 12340000000 },
    { input: '₹ 500 Cr', expected: 5000000000 },
    { input: '(₹ 100 Cr)', expected: -1000000000 },
    { input: '1,23,456', expected: 123456 },
    { input: '—', expected: null },
    { input: '', expected: null },
  ])('returns $expected for "$input"', ({ input, expected }) => {
    expect(parseCurrencyToInr(input)).toBe(expected);
  });
});

describe('parseDateOrNull', () => {
  it.each([
    { input: '2024-03-31', expected: '2024-03-31' },
    { input: '31 Mar 2024', expected: '2024-03-31' },
    { input: '01 Jan 2023', expected: '2023-01-01' },
    { input: '15-Aug-2024', expected: '2024-08-15' },
    { input: 'invalid', expected: null },
    { input: '', expected: null },
    { input: null as unknown as string, expected: null },
  ])('returns $expected for "$input"', ({ input, expected }) => {
    expect(parseDateOrNull(input)).toBe(expected);
  });
});

describe('normalizeSymbol', () => {
  it.each([
    { input: 'RELIANCE.NS', expected: 'RELIANCE' },
    { input: 'TCS.BO', expected: 'TCS' },
    { input: 'INFY.PSE', expected: 'INFY' },
    { input: 'HDFC.PSE', expected: 'HDFC' },
    { input: 'hdfcbank', expected: 'HDFCBANK' },
    { input: '  tata motors.NS  ', expected: 'TATA MOTORS' },
  ])('returns $expected for "$input"', ({ input, expected }) => {
    expect(normalizeSymbol(input)).toBe(expected);
  });
});

describe('normalizeExchange', () => {
  it.each([
    { input: 'PSE', expected: 'PSE' },
    { input: 'PSE', expected: 'PSE' },
    { input: 'Philippine Stock Exchange', expected: 'PSE' },
    { input: 'bombay stock exchange', expected: 'PSE' },
    { input: 'BOMBAY STOCK EXCHANGE', expected: 'PSE' },
    { input: 'NYSE', expected: 'NYSE' },
    { input: '  PSE  ', expected: 'PSE' },
  ])('returns $expected for "$input"', ({ input, expected }) => {
    expect(normalizeExchange(input)).toBe(expected);
  });
});

describe('calculateDerivedRatios', () => {
  it('computes ratios from non-null values', () => {
    const result = calculateDerivedRatios({
      netProfit: 1000,
      totalAssets: 10000,
      equity: 5000,
      revenue: 20000,
      operatingProfit: 3000,
      totalDebt: 2000,
      ebitda: 4000,
      marketCap: 50000,
      freeCashFlow: 800,
      currentAssets: 6000,
      currentLiabilities: 3000,
    });
    expect(result.roa).toBe(0.1);
    expect(result.roe).toBe(0.2);
    expect(result.grossMargin).toBeNull();
    expect(result.operatingMargin).toBe(0.15);
    expect(result.netMargin).toBe(0.05);
    expect(result.debtToEquity).toBe(0.4);
    expect(result.currentRatio).toBe(2);
    expect(result.evEbitda).toBe(12.5);
    expect(result.fcfYield).toBe(0.016);
  });

  it('returns null for division by zero', () => {
    const result = calculateDerivedRatios({
      netProfit: 1000,
      totalAssets: 0,
      equity: 0,
      revenue: 20000,
      operatingProfit: 3000,
      totalDebt: 2000,
      ebitda: 4000,
      marketCap: 50000,
      freeCashFlow: 800,
      currentAssets: 6000,
      currentLiabilities: 0,
    });
    expect(result.roa).toBeNull();
    expect(result.roe).toBeNull();
    expect(result.currentRatio).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    const result = calculateDerivedRatios({});
    expect(result.roa).toBeNull();
    expect(result.roe).toBeNull();
    expect(result.operatingMargin).toBeNull();
    expect(result.netMargin).toBeNull();
    expect(result.debtToEquity).toBeNull();
    expect(result.currentRatio).toBeNull();
    expect(result.evEbitda).toBeNull();
    expect(result.fcfYield).toBeNull();
  });

  it('treats explicit null same as missing', () => {
    const result = calculateDerivedRatios({
      netProfit: null,
      totalAssets: null,
      equity: null,
      revenue: null,
      operatingProfit: null,
      totalDebt: null,
      ebitda: null,
      marketCap: null,
      freeCashFlow: null,
      currentAssets: null,
      currentLiabilities: null,
    });
    expect(result.roa).toBeNull();
    expect(result.roe).toBeNull();
  });
});

describe('calculateGrowthRate', () => {
  it.each([
    { current: 120, previous: 100, expected: 0.2 },
    { current: 80, previous: 100, expected: -0.2 },
    { current: 0, previous: 100, expected: -1 },
    { current: 200, previous: 50, expected: 3 },
    { current: 100, previous: 0, expected: null },
    { current: null, previous: 100, expected: null },
    { current: 100, previous: null, expected: null },
    { current: null, previous: null, expected: null },
  ])('returns $expected for current=$current previous=$previous', ({ current, previous, expected }) => {
    expect(calculateGrowthRate(current, previous)).toBe(expected);
  });

  it('clamps extremely large growth rates', () => {
    expect(calculateGrowthRate(1000000, 1)).toBe(100);
    expect(calculateGrowthRate(-1000, 0.01)).toBe(-100);
  });
});

describe('sanitizeProviderDiagnostic', () => {
  it('replaces URLs with placeholder', () => {
    const result = sanitizeProviderDiagnostic('Error: GET https://api.example.com/data failed with 401');
    expect(result).toContain('[URL]');
    expect(result).not.toContain('api.example.com');
  });

  it('replaces long tokens with placeholder', () => {
    const longToken = 'a'.repeat(32);
    const result = sanitizeProviderDiagnostic(`Invalid key: ${longToken}`);
    expect(result).toContain('[TOKEN]');
    expect(result).not.toContain(longToken);
  });

  it('replaces long alphanumeric keys with placeholder', () => {
    const longKey = 'abcdefghijklmnopqrst'.repeat(1);
    const result = sanitizeProviderDiagnostic(`Key: ${longKey}`);
    expect(result).not.toContain(longKey);
  });

  it('keeps the error class name', () => {
    const result = sanitizeProviderDiagnostic('TypeError: Cannot read property "x" of undefined');
    expect(result).toContain('TypeError');
  });

  it('handles empty string', () => {
    expect(sanitizeProviderDiagnostic('')).toBe('');
  });

  it('handles multiple URLs and tokens', () => {
    const result = sanitizeProviderDiagnostic(
      'FetchError: GET https://first.com and https://second.org with token abcdefghijklmnopqrst1234567890abcdef'
    );
    expect(result).toContain('[URL]');
    expect(result).toContain('[TOKEN]');
    expect(result).not.toContain('first.com');
    expect(result).not.toContain('second.org');
    expect(result).toContain('FetchError');
  });
});
