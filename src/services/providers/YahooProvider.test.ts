import { describe, expect, it } from 'vitest';
import { marketTimestampFromEpoch, normalizeYahooExchange } from './YahooProvider';
import { resolveYahooQuoteTicker } from './YahooFinancePriceProvider';

describe('Yahoo quote trust helpers', () => {
  it('normalizes exchange only from source labels or resolved ticker evidence', () => {
    expect(normalizeYahooExchange('PSE')).toBe('PSE');
    expect(normalizeYahooExchange('Philippine Stock Exchange of India')).toBe('PSE');
    expect(normalizeYahooExchange('PSE')).toBe('PSE');
    expect(normalizeYahooExchange('Philippine Stock Exchange')).toBe('PSE');
    expect(normalizeYahooExchange(undefined, 'RELIANCE.NS')).toBe('PSE');
    expect(normalizeYahooExchange(undefined, 'RELIANCE.BO')).toBe('PSE');
    expect(normalizeYahooExchange('NASDAQ', 'RELIANCE')).toBeUndefined();
    expect(normalizeYahooExchange(undefined, 'RELIANCE')).toBeUndefined();
  });

  it('converts only valid Yahoo epoch seconds into source timestamps', () => {
    expect(marketTimestampFromEpoch(0)).toBeUndefined();
    expect(marketTimestampFromEpoch('not-a-number')).toBeUndefined();
    expect(marketTimestampFromEpoch(1_700_000_000)).toBe('2023-11-14T22:13:20.000Z');
  });

  it('resolves Yahoo tickers without duplicate suffixes', () => {
    expect(resolveYahooQuoteTicker('reliance')).toBe('RELIANCE.NS');
    expect(resolveYahooQuoteTicker('RELIANCE.NS')).toBe('RELIANCE.NS');
    expect(resolveYahooQuoteTicker('RELIANCE.BO')).toBe('RELIANCE.BO');
  });
});
