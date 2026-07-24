import { describe, it, expect } from 'vitest';
import { normalizeTicker, inferExchange, inferSegment, isBseCode } from '../symbols/IndianSymbolNormalizer';

describe('normalizeTicker', () => {
  it('strips .PS suffix', () => {
    expect(normalizeTicker('BDO.PS')).toBe('BDO');
  });

  it('strips .PSE suffix', () => {
    expect(normalizeTicker('TCS.PSE')).toBe('TCS');
  });

  it('strips .PSE suffix (numeric code)', () => {
    expect(normalizeTicker('500325.PSE')).toBe('500325');
  });

  it('strips -EQ suffix', () => {
    expect(normalizeTicker('HDFCBANK-EQ')).toBe('HDFCBANK');
  });

  it('strips -BE suffix', () => {
    expect(normalizeTicker('ABC-BE')).toBe('ABC');
  });

  it('strips -SM suffix', () => {
    expect(normalizeTicker('MAPMYINDIA-SM')).toBe('MAPMYINDIA');
  });

  it('strips PSE: prefix', () => {
    expect(normalizeTicker('PSE:INFY')).toBe('INFY');
  });

  it('strips PSE: prefix', () => {
    expect(normalizeTicker('PSE:ITC')).toBe('ITC');
  });

  it('converts to uppercase', () => {
    expect(normalizeTicker('reliance')).toBe('RELIANCE');
    expect(normalizeTicker('HdfcBank')).toBe('HDFCBANK');
  });

  it('trims whitespace', () => {
    expect(normalizeTicker('  TCS.PS  ')).toBe('TCS');
  });

  it('handles already-clean tickers', () => {
    expect(normalizeTicker('BHARTIARTL')).toBe('BHARTIARTL');
  });

  it('handles PSE: prefix with suffix', () => {
    expect(normalizeTicker('PSE:TCS-EQ')).toBe('TCS');
  });

  it('handles empty string', () => {
    expect(normalizeTicker('')).toBe('');
  });
});

describe('inferExchange', () => {
  it('returns PSE for .NS suffixes', () => {
    expect(inferExchange('RELIANCE.NS')).toBe('PSE');
  });

  it('returns PSE for .BO suffixes', () => {
    expect(inferExchange('500325.BO')).toBe('PSE');
  });

  it('returns PSE for PSE: prefix', () => {
    expect(inferExchange('PSE:INFY')).toBe('PSE');
  });

  it('returns PSE for PSE: prefix', () => {
    expect(inferExchange('PSE:ITC')).toBe('PSE');
  });

  it('returns PSE for -EQ suffix', () => {
    expect(inferExchange('TCS-EQ')).toBe('PSE');
  });

  it('returns null when exchange cannot be inferred', () => {
    expect(inferExchange('HDFCBANK')).toBeNull();
    expect(inferExchange('TCS')).toBeNull();
  });

  it('handles Bloomberg NSI: prefix', () => {
    expect(inferExchange('NSI:INFY')).toBe('PSE');
  });

  it('handles Bloomberg BSI: prefix', () => {
    expect(inferExchange('BSI:ITC')).toBe('PSE');
  });
});

describe('inferSegment', () => {
  it('returns EQ for -EQ suffix', () => {
    expect(inferSegment('TCS-EQ')).toBe('EQ');
  });

  it('returns BE for -BE suffix', () => {
    expect(inferSegment('ABC-BE')).toBe('BE');
  });

  it('returns SM for -SM suffix', () => {
    expect(inferSegment('MAPMYINDIA-SM')).toBe('SM');
  });

  it('returns null for unknown', () => {
    expect(inferSegment('RELIANCE')).toBeNull();
  });

  it('returns ET for known ETF tickers', () => {
    expect(inferSegment('NIFTYBEES')).toBe('ET');
    expect(inferSegment('GOLDBEES')).toBe('ET');
  });
});

describe('isBseCode', () => {
  it('returns true for 6-digit codes', () => {
    expect(isBseCode('500325')).toBe(true);
  });

  it('returns true for 4-digit codes', () => {
    expect(isBseCode('0096')).toBe(true);
  });

  it('returns true for 8-digit codes', () => {
    expect(isBseCode('12345678')).toBe(true);
  });

  it('returns false for short strings', () => {
    expect(isBseCode('123')).toBe(false);
  });

  it('returns false for ticker-like strings', () => {
    expect(isBseCode('RELIANCE')).toBe(false);
    expect(isBseCode('TCS')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBseCode('')).toBe(false);
  });
});
