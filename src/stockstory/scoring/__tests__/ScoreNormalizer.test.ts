import { describe, it, expect } from 'vitest';
import { normalize, getBand, normalizeScore, weightedAverage } from '../ScoreNormalizer';

describe('normalize', () => {
  it('clamps values above 100 to 100', () => {
    expect(normalize(150)).toBe(100);
    expect(normalize(100.1)).toBe(100);
  });

  it('clamps values below 0 to 0', () => {
    expect(normalize(-10)).toBe(0);
    expect(normalize(-0.1)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(normalize(50.4)).toBe(50);
    expect(normalize(50.5)).toBe(51);
    expect(normalize(99.9)).toBe(100);
  });

  it('passes through valid values unchanged', () => {
    expect(normalize(0)).toBe(0);
    expect(normalize(50)).toBe(50);
    expect(normalize(100)).toBe(100);
  });

  it('returns NaN for NaN input (Math.round(NaN) = NaN)', () => {
    expect(Number.isNaN(normalize(NaN))).toBe(true);
  });

  it('handles Infinity by clamping to 100', () => {
    expect(normalize(Infinity)).toBe(100);
    expect(normalize(-Infinity)).toBe(0);
  });
});

describe('getBand', () => {
  it('returns Exceptional for 90-100', () => {
    expect(getBand(90)).toBe('Exceptional');
    expect(getBand(95)).toBe('Exceptional');
    expect(getBand(100)).toBe('Exceptional');
  });

  it('returns Strong for 75-89', () => {
    expect(getBand(75)).toBe('Strong');
    expect(getBand(80)).toBe('Strong');
    expect(getBand(89)).toBe('Strong');
  });

  it('returns Average for 60-74', () => {
    expect(getBand(60)).toBe('Average');
    expect(getBand(67)).toBe('Average');
    expect(getBand(74)).toBe('Average');
  });

  it('returns Weak for 45-59', () => {
    expect(getBand(45)).toBe('Weak');
    expect(getBand(50)).toBe('Weak');
    expect(getBand(59)).toBe('Weak');
  });

  it('returns Poor for 0-44', () => {
    expect(getBand(0)).toBe('Poor');
    expect(getBand(30)).toBe('Poor');
    expect(getBand(44)).toBe('Poor');
  });

  it('handles boundary values at each threshold', () => {
    expect(getBand(90)).toBe('Exceptional');
    expect(getBand(89)).toBe('Strong');
    expect(getBand(75)).toBe('Strong');
    expect(getBand(74)).toBe('Average');
    expect(getBand(60)).toBe('Average');
    expect(getBand(59)).toBe('Weak');
    expect(getBand(45)).toBe('Weak');
    expect(getBand(44)).toBe('Poor');
  });

  it('does not throw for values outside 0-100 range (returns band)', () => {
    expect(getBand(-1)).toBe('Poor');
    expect(getBand(101)).toBe('Exceptional');
  });
});

describe('normalizeScore', () => {
  it('returns NormalizedScore with normalized value and band', () => {
    const result = normalizeScore(85.7);
    expect(result.value).toBe(86);
    expect(result.band).toBe('Strong');
  });

  it('clamps and bands correctly for high value', () => {
    const result = normalizeScore(150);
    expect(result.value).toBe(100);
    expect(result.band).toBe('Exceptional');
  });

  it('clamps and bands correctly for low value', () => {
    const result = normalizeScore(-10);
    expect(result.value).toBe(0);
    expect(result.band).toBe('Poor');
  });

  it('rounds before banding', () => {
    const result = normalizeScore(89.6);
    expect(result.value).toBe(90);
    expect(result.band).toBe('Exceptional');
  });
});

describe('weightedAverage', () => {
  it('calculates weighted average correctly', () => {
    const result = weightedAverage([
      { score: 80, weight: 2 },
      { score: 50, weight: 1 },
    ]);
    expect(result).toBe(70);
  });

  it('returns normalized result', () => {
    const result = weightedAverage([
      { score: 150, weight: 1 },
    ]);
    expect(result).toBe(100);
  });

  it('returns 50 for zero total weight', () => {
    const result = weightedAverage([
      { score: 100, weight: 0 },
      { score: 50, weight: 0 },
    ]);
    expect(result).toBe(50);
  });

  it('returns 50 for empty array', () => {
    const result = weightedAverage([]);
    expect(result).toBe(50);
  });

  it('handles single component', () => {
    const result = weightedAverage([{ score: 42, weight: 3 }]);
    expect(result).toBe(42);
  });

  it('handles equal weights correctly', () => {
    const result = weightedAverage([
      { score: 100, weight: 1 },
      { score: 0, weight: 1 },
    ]);
    expect(result).toBe(50);
  });

  it('handles fractional weights', () => {
    const result = weightedAverage([
      { score: 60, weight: 0.5 },
      { score: 40, weight: 0.5 },
    ]);
    expect(result).toBe(50);
  });
});
