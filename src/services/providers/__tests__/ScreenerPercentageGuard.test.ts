import { describe, it, expect } from 'vitest';
import { parsePhilippineNumber } from '../normalization/FinancialNormalization';

describe('Screener percentage guard', () => {
  it('does not divide percentage values by 100', () => {
    expect(parsePhilippineNumber('46.30%')).toBe(46.30);
    expect(parsePhilippineNumber('23.50%')).toBe(23.50);
    expect(parsePhilippineNumber('1.20%')).toBe(1.20);
    expect(parsePhilippineNumber('12.5%')).toBe(12.5);
    expect(parsePhilippineNumber('0.5%')).toBe(0.5);
  });

  it('parses plain numbers correctly', () => {
    expect(parsePhilippineNumber('150')).toBe(150);
    expect(parsePhilippineNumber('28.5')).toBe(28.5);
    expect(parsePhilippineNumber('0')).toBe(0);
  });

  it('parses million-suffixed values correctly (multiplies by 1M)', () => {
    const val = parsePhilippineNumber('142.53M');
    expect(val).not.toBeNull();
    expect(val! / 1_000_000).toBe(142.53);
  });

  it('returns null for missing or invalid values', () => {
    expect(parsePhilippineNumber(null as unknown as string)).toBeNull();
    expect(parsePhilippineNumber('')).toBeNull();
    expect(parsePhilippineNumber('-')).toBeNull();
    expect(parsePhilippineNumber('—')).toBeNull();
  });
});
