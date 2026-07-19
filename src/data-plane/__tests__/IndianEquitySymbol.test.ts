import { describe, it, expect } from 'vitest';
import { buildSymbolMasterFixture } from '../fixtures/symbol-master';
import type { IndianExchange, IndianInstrumentSegment, IndianListingStatus } from '../symbols/PSESymbol';

describe('PSESymbol contract', () => {
  const symbols = buildSymbolMasterFixture();

  it('all fixtures have non-empty canonicalSymbol', () => {
    for (const s of symbols) {
      expect(s.canonicalSymbol).toBeTruthy();
      expect(s.canonicalSymbol).toEqual(s.canonicalSymbol.toUpperCase());
    }
  });

  it('all fixtures have valid exchange', () => {
    const valid: IndianExchange[] = ['NSE', 'BSE'];
    for (const s of symbols) {
      expect(valid).toContain(s.exchange);
    }
  });

  it('all fixtures have valid segment', () => {
    const valid: IndianInstrumentSegment[] = ['EQ', 'SM', 'ET', 'BE'];
    for (const s of symbols) {
      expect(valid).toContain(s.segment);
    }
  });

  it('all fixtures have valid listing status', () => {
    const valid: IndianListingStatus[] = ['active', 'suspended', 'delisted'];
    for (const s of symbols) {
      expect(valid).toContain(s.listingStatus);
    }
  });

  it('ISIN is 12 chars when present', () => {
    for (const s of symbols) {
      if (s.isin) {
        expect(s.isin.length).toBe(12);
      }
    }
  });

  it('all fixtures have aliases that include the canonical symbol', () => {
    for (const s of symbols) {
      expect(s.aliases.length).toBeGreaterThanOrEqual(1);
      expect(s.aliases).toContain(s.canonicalSymbol);
    }
  });

  it('NSE symbols have nseSymbol equal to canonicalSymbol', () => {
    for (const s of symbols) {
      if (s.exchange === 'NSE') {
        expect(s.nseSymbol).toBe(s.canonicalSymbol);
      }
    }
  });

  it('NSE symbols have bseCode set', () => {
    for (const s of symbols) {
      if (s.exchange === 'NSE') {
        expect(s.bseCode).toBeTruthy();
      }
    }
  });

  it('BSE-primary symbols have nseSymbol = null', () => {
    for (const s of symbols) {
      if (s.exchange === 'BSE') {
        expect(s.nseSymbol).toBeNull();
      }
    }
  });

  it('ETF symbols have segment ET', () => {
    const etfs = symbols.filter(s => s.segment === 'ET');
    expect(etfs.length).toBeGreaterThanOrEqual(2);
    for (const etf of etfs) {
      expect(etf.listingStatus).toBe('active');
    }
  });

  it('SME symbols have segment SM', () => {
    const sme = symbols.filter(s => s.segment === 'SM');
    expect(sme.length).toBeGreaterThanOrEqual(1);
    for (const s of sme) {
      expect(s.marketCapCategory).toBe('small');
    }
  });

  it('firstSeenAt and lastSeenAt are reasonable timestamps', () => {
    const now = Date.now();
    const tenYearsMs = 10 * 365 * 24 * 3600 * 1000;
    for (const s of symbols) {
      expect(s.firstSeenAt).toBeGreaterThan(now - tenYearsMs);
      expect(s.firstSeenAt).toBeLessThanOrEqual(now);
      expect(s.lastSeenAt).toBeGreaterThanOrEqual(s.firstSeenAt);
      expect(s.lastSeenAt).toBeLessThanOrEqual(now);
    }
  });

  it('fixture count is at least 20 symbols', () => {
    expect(symbols.length).toBeGreaterThanOrEqual(20);
  });

  it('each symbol is unique by canonicalSymbol', () => {
    const symbolsSet = new Set(symbols.map(s => s.canonicalSymbol));
    expect(symbolsSet.size).toBe(symbols.length);
  });

  it('each symbol has unique ISIN', () => {
    const isins = symbols.filter(s => s.isin).map(s => s.isin);
    expect(new Set(isins).size).toBe(isins.length);
  });

  it('large cap symbols have marketCapCr > 100000', () => {
    const largeCaps = symbols.filter(s => s.marketCapCategory === 'large');
    for (const s of largeCaps) {
      expect(s.marketCapCr).toBeGreaterThan(100000);
    }
  });
});

describe('Symbol fixture reads', () => {
  it('RELIANCE is present and large cap', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'RELIANCE')!;
    expect(s).toBeDefined();
    expect(s.exchange).toBe('NSE');
    expect(s.marketCapCategory).toBe('large');
    expect(s.isin).toBe('IN0020200124');
    expect(s.bseCode).toBe('500325');
    expect(s.companyName).toContain('Reliance');
  });

  it('NIFTYBEES is an ETF', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'NIFTYBEES')!;
    expect(s).toBeDefined();
    expect(s.segment).toBe('ET');
    expect(s.sector).toBeNull();
  });

  it('GODREJIND is BSE-primary', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'GODREJIND')!;
    expect(s).toBeDefined();
    expect(s.exchange).toBe('BSE');
    expect(s.nseSymbol).toBeNull();
  });

  it('MAPMYINDIA is SME', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'MAPMYINDIA')!;
    expect(s).toBeDefined();
    expect(s.segment).toBe('SM');
    expect(s.marketCapCategory).toBe('small');
  });
});
