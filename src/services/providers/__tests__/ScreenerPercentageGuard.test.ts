import { describe, it, expect } from 'vitest';
import { parseIndianNumber } from '../normalization/FinancialNormalization';

describe('Screener percentage guard', () => {
  it('does not divide percentage values by 100', () => {
    expect(parseIndianNumber('46.30%')).toBe(46.30);
    expect(parseIndianNumber('23.50%')).toBe(23.50);
    expect(parseIndianNumber('1.20%')).toBe(1.20);
    expect(parseIndianNumber('12.5%')).toBe(12.5);
    expect(parseIndianNumber('0.5%')).toBe(0.5);
  });

  it('parses plain numbers correctly', () => {
    expect(parseIndianNumber('150')).toBe(150);
    expect(parseIndianNumber('28.5')).toBe(28.5);
    expect(parseIndianNumber('0')).toBe(0);
  });

  it('parses crore values correctly (multiplies by 10M)', () => {
    const val = parseIndianNumber('1,42,530 Cr');
    expect(val).not.toBeNull();
    expect(val! / 10_000_000).toBe(142530);
  });

  it('returns null for missing or invalid values', () => {
    expect(parseIndianNumber(null as unknown as string)).toBeNull();
    expect(parseIndianNumber('')).toBeNull();
    expect(parseIndianNumber('-')).toBeNull();
    expect(parseIndianNumber('—')).toBeNull();
  });
});
