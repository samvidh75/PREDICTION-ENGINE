import { describe, it, expect } from 'vitest';
import { parsePhilippineNumber, parsePercentageFraction, normalizeExchange, calculateGrowthRate } from './FinancialNormalization';

describe('FinancialNormalization', () => {
  describe('parsePhilippineNumber', () => {
    it('parses basic numbers', () => {
      expect(parsePhilippineNumber('100')).toBe(100);
      expect(parsePhilippineNumber('1,000')).toBe(1000);
      expect(parsePhilippineNumber('1.5M')).toBe(1500000);
    });

    it('handles negative in parens', () => {
      expect(parsePhilippineNumber('(100)')).toBe(-100);
    });

    it('returns null for NA-like values', () => {
      expect(parsePhilippineNumber('N/A')).toBeNull();
      expect(parsePhilippineNumber('')).toBeNull();
    });
  });

  describe('parsePercentageFraction', () => {
    it('parses percentages', () => {
      expect(parsePercentageFraction('50%')).toBe(0.5);
      expect(parsePercentageFraction('100%')).toBe(1);
    });
  });

  describe('normalizeExchange', () => {
    it('maps PSE variants', () => {
      expect(normalizeExchange('PSE')).toBe('PSE');
      expect(normalizeExchange('philippine stock exchange')).toBe('PSE');
      expect(normalizeExchange('  PSE  ')).toBe('PSE');
    });

    it('passes through unknown exchanges', () => {
      expect(normalizeExchange('NYSE')).toBe('NYSE');
    });
  });

  describe('calculateGrowthRate', () => {
    it('calculates growth correctly', () => {
      expect(calculateGrowthRate(120, 100)).toBe(0.2);
      expect(calculateGrowthRate(80, 100)).toBe(-0.2);
    });

    it('returns null for zero previous', () => {
      expect(calculateGrowthRate(100, 0)).toBeNull();
    });
  });
});
