import { describe, expect, it } from 'vitest';
import { normalizeMetricValue, formatCompactScore, formatINR } from '../productNumber';

describe('normalizeMetricValue', () => {
  it('returns null for null/undefined', () => {
    expect(normalizeMetricValue(null)).toBeNull();
    expect(normalizeMetricValue(undefined)).toBeNull();
  });

  it('returns null for NaN/Infinity', () => {
    expect(normalizeMetricValue(NaN)).toBeNull();
    expect(normalizeMetricValue(Infinity)).toBeNull();
  });

  it('preserves valid numbers', () => {
    expect(normalizeMetricValue(0)).toBe(0);
    expect(normalizeMetricValue(100)).toBe(100);
    expect(normalizeMetricValue(-5)).toBe(-5);
  });

  it('parses numeric strings', () => {
    expect(normalizeMetricValue('15.5')).toBe(15.5);
    expect(normalizeMetricValue('')).toBeNull();
    expect(normalizeMetricValue('-')).toBeNull();
    expect(normalizeMetricValue('--')).toBeNull();
  });
});

describe('formatCompactScore', () => {
  it('returns dash for null', () => {
    expect(formatCompactScore(null)).toBe('—');
  });

  it('rounds scores', () => {
    expect(formatCompactScore(75.8)).toBe('76');
  });
});

describe('formatINR', () => {
  it('returns null for null', () => {
    expect(formatINR(null)).toBeNull();
  });

  it('formats crores', () => {
    expect(formatINR(50000000)).toContain('Cr');
  });

  it('formats lakhs', () => {
    expect(formatINR(500000)).toContain('L');
  });
});
