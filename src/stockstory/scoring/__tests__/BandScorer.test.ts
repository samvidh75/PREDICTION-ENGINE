import { describe, it, expect } from 'vitest';
import { scoreBands, scoreBandsDescending, scoreRanges } from '../BandScorer';
import type { BandConfig, RangeScore } from '../BandScorer';

describe('scoreBands (ascending - lower values score higher)', () => {
  const config: BandConfig = {
    bands: [
      { threshold: 10, score: 100 },
      { threshold: 20, score: 80 },
      { threshold: 30, score: 60 },
      { threshold: 50, score: 40 },
    ],
    belowMin: 20,
    nullScore: 50,
  };

  it('returns nullScore for null', () => {
    expect(scoreBands(null, config)).toBe(50);
  });

  it('returns nullScore for undefined', () => {
    expect(scoreBands(undefined, config)).toBe(50);
  });

  it('returns score for the band where value < threshold', () => {
    expect(scoreBands(5, config)).toBe(100);
    expect(scoreBands(10, config)).toBe(80);
    expect(scoreBands(19, config)).toBe(80);
    expect(scoreBands(25, config)).toBe(60);
    expect(scoreBands(40, config)).toBe(40);
  });

  it('returns last band score when value >= all thresholds', () => {
    expect(scoreBands(100, config)).toBe(40);
  });

  it('returns belowMin score when value is below all thresholds', () => {
    const cfg: BandConfig = { bands: [{ threshold: 5, score: 90 }], belowMin: 10, nullScore: 50 };
    expect(scoreBands(0, cfg)).toBe(90);
  });

  it('handles single band config', () => {
    const cfg: BandConfig = { bands: [{ threshold: 50, score: 100 }], belowMin: 0, nullScore: 50 };
    expect(scoreBands(25, cfg)).toBe(100);
    expect(scoreBands(75, cfg)).toBe(100);
  });

  it('handles zero value correctly', () => {
    expect(scoreBands(0, config)).toBe(100);
  });

  it('handles negative values', () => {
    expect(scoreBands(-5, config)).toBe(100);
  });

  it('works with integer and decimal thresholds', () => {
    const cfg: BandConfig = {
      bands: [{ threshold: 10.5, score: 95 }, { threshold: 20.5, score: 70 }],
      belowMin: 30,
      nullScore: 50,
    };
    expect(scoreBands(10.4, cfg)).toBe(95);
    expect(scoreBands(10.5, cfg)).toBe(70);
    expect(scoreBands(15, cfg)).toBe(70);
    expect(scoreBands(30, cfg)).toBe(70);
  });
});

describe('scoreBandsDescending (descending - higher values score higher)', () => {
  const config: BandConfig = {
    bands: [
      { threshold: 50, score: 100 },
      { threshold: 30, score: 80 },
      { threshold: 20, score: 60 },
    ],
    belowMin: 20,
    nullScore: 50,
  };

  it('returns nullScore for null', () => {
    expect(scoreBandsDescending(null, config)).toBe(50);
  });

  it('returns nullScore for undefined', () => {
    expect(scoreBandsDescending(undefined, config)).toBe(50);
  });

  it('returns score for the band where value >= threshold (first match)', () => {
    expect(scoreBandsDescending(60, config)).toBe(100);
    expect(scoreBandsDescending(50, config)).toBe(100);
    expect(scoreBandsDescending(40, config)).toBe(80);
    expect(scoreBandsDescending(25, config)).toBe(60);
  });

  it('returns belowMin when value is below all thresholds', () => {
    expect(scoreBandsDescending(10, config)).toBe(20);
    expect(scoreBandsDescending(0, config)).toBe(20);
  });

  it('returns belowMin for negative values below all thresholds', () => {
    expect(scoreBandsDescending(-5, config)).toBe(20);
  });

  it('handles single band config', () => {
    const cfg: BandConfig = { bands: [{ threshold: 50, score: 100 }], belowMin: 10, nullScore: 50 };
    expect(scoreBandsDescending(75, cfg)).toBe(100);
    expect(scoreBandsDescending(50, cfg)).toBe(100);
    expect(scoreBandsDescending(25, cfg)).toBe(10);
  });
});

describe('scoreRanges', () => {
  const ranges: RangeScore[] = [
    { min: 40, max: 60, score: 100 },
    { min: 30, max: 39, score: 80 },
    { min: 61, max: 70, score: 80 },
    { min: 20, max: 29, score: 60 },
    { min: 71, max: 85, score: 60 },
  ];

  it('returns nullScore for null', () => {
    expect(scoreRanges(null, ranges)).toBe(50);
  });

  it('returns nullScore for undefined', () => {
    expect(scoreRanges(undefined, ranges)).toBe(50);
  });

  it('returns score for matching range', () => {
    expect(scoreRanges(45, ranges)).toBe(100);
    expect(scoreRanges(35, ranges)).toBe(80);
    expect(scoreRanges(65, ranges)).toBe(80);
    expect(scoreRanges(25, ranges)).toBe(60);
    expect(scoreRanges(75, ranges)).toBe(60);
  });

  it('returns nullScore when no range matches', () => {
    expect(scoreRanges(10, ranges)).toBe(50);
    expect(scoreRanges(90, ranges)).toBe(50);
    expect(scoreRanges(100, ranges)).toBe(50);
  });

  it('returns first matching range (priority order)', () => {
    const overlapping: RangeScore[] = [
      { min: 30, max: 70, score: 100 },
      { min: 40, max: 60, score: 90 },
    ];
    expect(scoreRanges(50, overlapping)).toBe(100);
  });

  it('handles range boundaries correctly (inclusive)', () => {
    expect(scoreRanges(40, ranges)).toBe(100);
    expect(scoreRanges(60, ranges)).toBe(100);
    expect(scoreRanges(30, ranges)).toBe(80);
    expect(scoreRanges(20, ranges)).toBe(60);
  });

  it('allows custom nullScore', () => {
    expect(scoreRanges(null, ranges, 0)).toBe(0);
    expect(scoreRanges(undefined, ranges, 999)).toBe(999);
  });

  it('handles empty ranges', () => {
    expect(scoreRanges(50, [])).toBe(50);
  });

  it('handles single-value ranges', () => {
    const single: RangeScore[] = [{ min: 50, max: 50, score: 100 }];
    expect(scoreRanges(49, single)).toBe(50);
    expect(scoreRanges(50, single)).toBe(100);
    expect(scoreRanges(51, single)).toBe(50);
  });

  it('handles negative ranges', () => {
    const neg: RangeScore[] = [{ min: -20, max: -5, score: 90 }];
    expect(scoreRanges(-10, neg)).toBe(90);
    expect(scoreRanges(-30, neg)).toBe(50);
    expect(scoreRanges(0, neg)).toBe(50);
  });
});
