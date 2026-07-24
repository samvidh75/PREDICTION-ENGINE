import { describe, expect, it } from 'vitest';
import { marketTimestampFromEpoch, normalizeYahooExchange } from './YahooProvider';
import { resolveYahooQuoteTicker } from './YahooFinancePriceProvider';

describe('Yahoo quote trust helpers', () => {
  it('normalizes exchange only from source labels or resolved ticker evidence', () => {
    expect(normalizeYahooExchange('PSE')).toBe('PSE');
    expect(normalizeYahooExchange('Philippine Stock Exchange of India')).toBe('PSE');
    expect(normalizeYahooExchange('PSE')).toBe('PSE');
    expect(normalizeYahooExchange('Philippine Stock Exchange')).toBe('PSE');
    expect(normalizeYahooExchange(undefined, 'BDO.PS')).toBe('PSE');
    expect(normalizeYahooExchange('NASDAQ', 'BDO')).toBeUndefined();
    expect(normalizeYahooExchange(undefined, 'BDO')).toBeUndefined();
  });

  it('converts only valid Yahoo epoch seconds into source timestamps', () => {
    expect(marketTimestampFromEpoch(0)).toBeUndefined();
    expect(marketTimestampFromEpoch('not-a-number')).toBeUndefined();
    expect(marketTimestampFromEpoch(1_700_000_000)).toBe('2023-11-14T22:13:20.000Z');
  });

  it('resolves Yahoo tickers without duplicate suffixes', () => {
    // Default suffix is .PSX (Pakistan Stock Exchange) per
    // resolveYahooQuoteTicker's actual implementation; .NS/.BO inputs are
    // passed through untouched rather than double-suffixed.
    expect(resolveYahooQuoteTicker('reliance')).toBe('RELIANCE.PSX');
    expect(resolveYahooQuoteTicker('RELIANCE.NS')).toBe('RELIANCE.NS');
    expect(resolveYahooQuoteTicker('RELIANCE.BO')).toBe('RELIANCE.BO');
  });
});
