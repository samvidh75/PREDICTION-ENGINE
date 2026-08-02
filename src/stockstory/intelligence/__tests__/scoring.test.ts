/**
 * Tests: Scoring Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  clampScore,
  toScoreBand,
  weightedAverage,
  zScoreToScore,
  percentileToScore,
  confidenceWeight,
  gradeNumeric,
  linearScale,
  toFinite,
} from '../scoring';

describe('clampScore', () => {
  it('clamps values within range', () => {
    expect(clampScore(50)).toBe(50);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(150)).toBe(100);
  });

  it('handles NaN and Infinity', () => {
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(Infinity)).toBe(0);
    expect(clampScore(-Infinity)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(clampScore(74.6)).toBe(75);
    expect(clampScore(33.3)).toBe(33);
  });
});

describe('toScoreBand', () => {
  it('returns correct bands', () => {
    expect(toScoreBand(85)).toBe('excellent');
    expect(toScoreBand(65)).toBe('good');
    expect(toScoreBand(50)).toBe('fair');
    expect(toScoreBand(30)).toBe('poor');
    expect(toScoreBand(10)).toBe('critical');
  });
});

describe('weightedAverage', () => {
  it('computes weighted average correctly', () => {
    expect(weightedAverage([100, 50], [1, 1])).toBe(75);
    expect(weightedAverage([100, 0], [3, 1])).toBe(75);
  });

  it('returns 0 for empty weights', () => {
    expect(weightedAverage([50], [0])).toBe(0);
  });
});

describe('zScoreToScore', () => {
  it('converts z-scores to 0-100 scale', () => {
    expect(zScoreToScore(0)).toBe(50);
    const high = zScoreToScore(2);
    expect(high).toBeGreaterThan(95);
    const low = zScoreToScore(-2);
    expect(low).toBeLessThan(5);
  });
});

describe('percentileToScore', () => {
  it('converts percentiles', () => {
    expect(percentileToScore(0.9)).toBe(90);
    expect(percentileToScore(0.5)).toBe(50);
    expect(percentileToScore(0)).toBe(0);
    expect(percentileToScore(1)).toBe(100);
  });
});

describe('confidenceWeight', () => {
  it('calculates data completeness', () => {
    expect(confidenceWeight([10, 20, null, 40], 4)).toBe(0.75);
    expect(confidenceWeight([null, null], 2)).toBe(0);
    expect(confidenceWeight([], 0)).toBe(1);
  });

  it('treats NaN as missing', () => {
    expect(confidenceWeight([NaN, 20], 2)).toBe(0.5);
  });
});

describe('gradeNumeric', () => {
  it('grades values against thresholds', () => {
    const ranges: Array<[number, number, number]> = [
      [10, Infinity, 100],
      [5, 10, 50],
      [0, 5, 0],
    ];
    expect(gradeNumeric(15, ranges)).toBe(100);
    expect(gradeNumeric(7, ranges)).toBe(50);
    expect(gradeNumeric(2, ranges)).toBe(0);
    expect(gradeNumeric(null, ranges)).toBe(0);
  });
});

describe('linearScale', () => {
  it('maps values linearly', () => {
    expect(linearScale(50, 0, 100)).toBe(50);
    expect(linearScale(0, 0, 100)).toBe(0);
    expect(linearScale(100, 0, 100)).toBe(100);
    expect(linearScale(50, 0, 100, true)).toBe(50);
  });
});

describe('toFinite', () => {
  it('converts safely', () => {
    expect(toFinite(42)).toBe(42);
    expect(toFinite('42')).toBe(42);
    expect(toFinite(null)).toBeNull();
    expect(toFinite(undefined)).toBeNull();
    expect(toFinite('')).toBeNull();
    expect(toFinite(NaN)).toBeNull();
    expect(toFinite(Infinity)).toBeNull();
  });
});
