import { describe, expect, it } from 'vitest';
import { inferExchangeFromSymbol } from './MetadataProviderCoordinator';

describe('inferExchangeFromSymbol', () => {
  it('does not infer an exchange from a bare ticker', () => {
    expect(inferExchangeFromSymbol('RELIANCE')).toBeUndefined();
    expect(inferExchangeFromSymbol('  infy  ')).toBeUndefined();
  });

  it('uses only explicit NSE suffixes', () => {
    expect(inferExchangeFromSymbol('RELIANCE.NS')).toBe('NSE');
    expect(inferExchangeFromSymbol('INFY.NSE')).toBe('NSE');
  });

  it('uses only explicit BSE suffixes', () => {
    expect(inferExchangeFromSymbol('500325.BO')).toBe('BSE');
    expect(inferExchangeFromSymbol('TCS.BSE')).toBe('BSE');
  });
});
