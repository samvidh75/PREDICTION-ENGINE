import { describe, expect, it } from 'vitest';
import { inferIndianApiExchange, sourceTimestampFromIndianApi } from './IndianMarketProvider';

describe('PhilippineMarketProvider trust helpers', () => {
  it('uses explicit symbol suffixes when supplied', () => {
    expect(inferIndianApiExchange('RELIANCE.NS', { NSE: 100, BSE: 101 })).toBe('NSE');
    expect(inferIndianApiExchange('RELIANCE.BO', { NSE: 100, BSE: 101 })).toBe('BSE');
  });

  it('infers venue only when the payload exposes a single valid venue price', () => {
    expect(inferIndianApiExchange('RELIANCE', { NSE: 100 })).toBe('NSE');
    expect(inferIndianApiExchange('RELIANCE', { BSE: 101 })).toBe('BSE');
    expect(inferIndianApiExchange('RELIANCE', { NSE: 100, BSE: 101 })).toBeUndefined();
    expect(inferIndianApiExchange('RELIANCE', {})).toBeUndefined();
  });

  it('keeps source timestamp unavailable when IndianAPI omits or corrupts it', () => {
    expect(sourceTimestampFromIndianApi(undefined, undefined)).toBeUndefined();
    expect(sourceTimestampFromIndianApi('not-a-date', 'not-a-time')).toBeUndefined();
  });

  it('converts valid IndianAPI source timestamps without substituting retrieval time', () => {
    const timestamp = sourceTimestampFromIndianApi('2026-06-13', '10:15:00');
    expect(timestamp).toBeDefined();
    expect(Number.isNaN(new Date(timestamp as string).getTime())).toBe(false);
  });
});

describe('Volume rounding (Lakhs to units)', () => {
  it('rounds float volume to integer for bigint column compatibility', () => {
    const values = [
      { input: '20.24', expected: 2024000 },
      { input: '19.74', expected: 1974000 },
      { input: '100.50', expected: 10050000 },
      { input: '0.50', expected: 50000 },
      { input: '1.00', expected: 100000 },
    ];
    for (const { input, expected } of values) {
      const parsed = Number.parseFloat(input);
      const volume = Math.round((Number.isFinite(parsed) && parsed > 0 ? parsed : 0) * 100_000);
      expect(volume).toBe(expected);
    }
  });

  it('handles edge case values without producing float artifacts', () => {
    const fpa = (v: number) => Math.round(v * 100_000);
    expect(fpa(20.24)).toBe(2024000);
    expect(fpa(19.74)).toBe(1974000);
    expect(fpa(0)).toBe(0);
    expect(fpa(0.001)).toBe(100);
    expect(Number.isInteger(fpa(999.99))).toBe(true);
  });
});
