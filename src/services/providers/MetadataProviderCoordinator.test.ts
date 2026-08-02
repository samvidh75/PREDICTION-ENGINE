import { describe, expect, it } from 'vitest';
import { inferExchangeFromSymbol } from './MetadataProviderCoordinator';

describe('inferExchangeFromSymbol', () => {
  it('does not infer an exchange from a bare ticker', () => {
    expect(inferExchangeFromSymbol('RELIANCE')).toBeUndefined();
    expect(inferExchangeFromSymbol('  infy  ')).toBeUndefined();
  });

  it('uses only explicit PSE suffixes', () => {
    expect(inferExchangeFromSymbol('RELIANCE.NS')).toBe('PSE');
    expect(inferExchangeFromSymbol('INFY.PSE')).toBe('PSE');
  });

  it('uses only explicit PSE suffixes', () => {
    expect(inferExchangeFromSymbol('500325.BO')).toBe('PSE');
    expect(inferExchangeFromSymbol('TCS.PSE')).toBe('PSE');
  });
});
