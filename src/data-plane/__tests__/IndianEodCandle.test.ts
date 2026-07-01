import { describe, it, expect } from 'vitest';
import { validateEodCandle, validateEodCandleBatch } from '../eod/IndianEodCandle';
import type { IndianEodCandle } from '../eod/IndianEodCandle';

function makeCandle(overrides?: Partial<IndianEodCandle>): IndianEodCandle {
  return {
    symbol: 'RELIANCE',
    exchange: 'NSE',
    date: '2026-06-17',
    open: 2500,
    high: 2550,
    low: 2480,
    close: 2540,
    volume: 5000000,
    deliveryPct: 45,
    unadjustedClose: 2540,
    dividend: 0,
    splitFactor: 1,
    ...overrides,
  };
}

describe('validateEodCandle', () => {
  it('passes for a valid candle', () => {
    const result = validateEodCandle(makeCandle());
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('fails for negative close price', () => {
    const result = validateEodCandle(makeCandle({ close: -100 }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'negative_price')).toBe(true);
  });

  it('fails for NaN high', () => {
    const result = validateEodCandle(makeCandle({ high: NaN }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'negative_price')).toBe(true);
  });

  it('fails when high < low', () => {
    const result = validateEodCandle(makeCandle({ high: 2400, low: 2500 }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'ohlc_mismatch')).toBe(true);
  });

  it('fails when high is not the max (high < open)', () => {
    const result = validateEodCandle(makeCandle({ high: 2400, open: 2500 }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'ohlc_mismatch')).toBe(true);
  });

  it('fails when low is not the min (low > close)', () => {
    const result = validateEodCandle(makeCandle({ low: 2550, close: 2500 }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'ohlc_mismatch')).toBe(true);
  });

  it('warns about zero volume', () => {
    const result = validateEodCandle(makeCandle({ volume: 0 }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'zero_volume_warning')).toBe(true);
  });

  it('rejects future dates', () => {
    const farFuture = '2028-01-01';
    const result = validateEodCandle(makeCandle({ date: farFuture }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'future_date')).toBe(true);
  });

  it('detects duplicates when seenKeys shared', () => {
    const seen = new Set<string>();
    const c1 = makeCandle({ symbol: 'RELIANCE', date: '2026-06-17' });
    const c2 = makeCandle({ symbol: 'RELIANCE', date: '2026-06-17' });

    const r1 = validateEodCandle(c1, seen);
    expect(r1.valid).toBe(true);

    const r2 = validateEodCandle(c2, seen);
    expect(r2.valid).toBe(false);
    expect(r2.issues.some(i => i.kind === 'duplicate')).toBe(true);
  });

  it('flags suspicious daily change', () => {
    const result = validateEodCandle(makeCandle({ open: 100, close: 200 }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'suspicious_change')).toBe(true);
  });

  it('rejects empty symbol', () => {
    const result = validateEodCandle(makeCandle({ symbol: '' }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'missing')).toBe(true);
  });

  it('rejects bad date format', () => {
    const result = validateEodCandle(makeCandle({ date: 'not-a-date' }));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.kind === 'missing')).toBe(true);
  });
});

describe('validateEodCandleBatch', () => {
  it('passes all valid candles', () => {
    const candles = [
      makeCandle({ symbol: 'RELIANCE', date: '2026-06-17' }),
      makeCandle({ symbol: 'TCS', date: '2026-06-17' }),
    ];
    const results = validateEodCandleBatch(candles);
    expect(results.every(r => r.valid)).toBe(true);
  });

  it('detects duplicates across batch', () => {
    const candles = [
      makeCandle({ symbol: 'RELIANCE', date: '2026-06-17' }),
      makeCandle({ symbol: 'RELIANCE', date: '2026-06-17' }),
    ];
    const results = validateEodCandleBatch(candles);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
    expect(results[1].issues.some(i => i.kind === 'duplicate')).toBe(true);
  });

  it('returns one result per candle', () => {
    const candles = [
      makeCandle({ symbol: 'RELIANCE', date: '2026-06-17' }),
      makeCandle({ symbol: 'RELIANCE', date: '2026-06-16' }),
      makeCandle({ symbol: 'TCS', date: '2026-06-17' }),
    ];
    const results = validateEodCandleBatch(candles);
    expect(results).toHaveLength(3);
  });

  it('scores are between 0 and 100', () => {
    const candles = [
      makeCandle({ symbol: 'RELIANCE', date: '2026-06-17' }),
      makeCandle({ symbol: '', date: 'bad' }),
      makeCandle({ symbol: 'TCS', date: '2026-06-17', open: -1 }),
      makeCandle({ symbol: 'TCS', date: '2026-06-16' }),
    ];
    const results = validateEodCandleBatch(candles);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});
