import { describe, expect, it } from 'vitest';
import { inferIndianApiExchange, sourceTimestampFromIndianApi } from './IndianMarketProvider';

describe('IndianMarketProvider trust helpers', () => {
  it('uses explicit symbol suffixes when supplied', () => {
    expect(inferIndianApiExchange('RELIANCE.NS', { NSE: 100, BSE: 101 })).toBe('NSE');
    expect(inferIndianApiExchange('RELIANCE.NSE', { NSE: 100, BSE: 101 })).toBe('NSE');
    expect(inferIndianApiExchange('RELIANCE.BO', { NSE: 100, BSE: 101 })).toBe('BSE');
    expect(inferIndianApiExchange('RELIANCE.BSE', { NSE: 100, BSE: 101 })).toBe('BSE');
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
