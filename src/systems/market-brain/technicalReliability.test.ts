// src/systems/market-brain/technicalReliability.test.ts

import { describe, expect, it } from 'vitest';
import { reviewTechnicalReliability } from './technicalReliability';

const unsafePattern = /buy|sell|hold|strong buy|sure shot|guaranteed|multibagger|provider|api|backend|diagnostic|coverage|freshness|lineage|migration|backfill/i;

function reviewText(review: ReturnType<typeof reviewTechnicalReliability>): string {
  return [
    ...review.available,
    ...review.partial,
    ...review.missing,
    ...review.rejected,
    ...review.warnings,
  ].join(' ');
}

describe('reviewTechnicalReliability', () => {
  it('accepts a complete usable technical snapshot', () => {
    const review = reviewTechnicalReliability({
      rsi: 55,
      macd: 1.2,
      macdSignal: 1,
      macdHistogram: 0.2,
      adx: 24,
      atr: 10,
      momentum: 4,
      volatility: 1.5,
      volumeMultiple: 2.1,
      relativeStrength: 0.8,
    });

    expect(review.usable).toBe(true);
    expect(review.available).toContain('rsi');
    expect(review.available).toContain('volumeMultiple');
    expect(review.rejected).toEqual([]);
  });

  it('marks a partial snapshot as usable but incomplete', () => {
    const review = reviewTechnicalReliability({ rsi: 48, macd: 0.2, atr: 3 });

    expect(review.usable).toBe(true);
    expect(review.available).toEqual(expect.arrayContaining(['rsi', 'macd', 'atr']));
    expect(review.partial.length).toBeGreaterThan(0);
    expect(review.warnings).toContain('Technical review is incomplete.');
  });

  it('treats all missing values as not usable', () => {
    const review = reviewTechnicalReliability({});

    expect(review.usable).toBe(false);
    expect(review.available).toEqual([]);
    expect(review.missing).toContain('rsi');
  });

  it('rejects NaN and Infinity', () => {
    const review = reviewTechnicalReliability({ rsi: Number.NaN, adx: Infinity, atr: -Infinity });

    expect(review.usable).toBe(false);
    expect(review.rejected).toEqual(expect.arrayContaining(['rsi', 'adx', 'atr']));
  });

  it('rejects invalid RSI and ADX ranges', () => {
    const review = reviewTechnicalReliability({ rsi: 120, adx: -1 });

    expect(review.rejected).toEqual(expect.arrayContaining(['rsi', 'adx']));
  });

  it('rejects negative ATR, volatility, and volumeMultiple', () => {
    const review = reviewTechnicalReliability({ atr: -1, volatility: -0.5, volumeMultiple: -2 });

    expect(review.rejected).toEqual(expect.arrayContaining(['atr', 'volatility', 'volumeMultiple']));
  });

  it('returns fresh arrays on every call', () => {
    const first = reviewTechnicalReliability({ rsi: 50 });
    const second = reviewTechnicalReliability({ rsi: 50 });

    expect(first.available).not.toBe(second.available);
    first.available.push('mutated');
    expect(second.available).not.toContain('mutated');
  });

  it('does not emit unsafe public copy', () => {
    const review = reviewTechnicalReliability({ rsi: 50, volumeMultiple: 2 });
    expect(reviewText(review)).not.toMatch(unsafePattern);
  });
});
