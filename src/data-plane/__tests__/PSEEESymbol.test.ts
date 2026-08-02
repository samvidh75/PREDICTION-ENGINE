import { describe, it, expect } from 'vitest';
import { buildSymbolMasterFixture } from '../fixtures/symbol-master';
import type { PSEExchange, PSEInstrumentSegment, PSEListingStatus } from '../symbols/PSESymbol';

describe('PSESymbol contract', () => {
  const symbols = buildSymbolMasterFixture();

  it('all fixtures have non-empty canonicalSymbol', () => {
    for (const s of symbols) {
      expect(s.canonicalSymbol).toBeTruthy();
      expect(s.canonicalSymbol).toEqual(s.canonicalSymbol.toUpperCase());
    }
  });

  it('all fixtures have valid exchange', () => {
    const valid: PSEExchange[] = ['PSE'];
    for (const s of symbols) {
      expect(valid).toContain(s.exchange);
    }
  });

  it('all fixtures have valid segment', () => {
    const valid: PSEInstrumentSegment[] = ['EQ', 'SM', 'ET', 'BE'];
    for (const s of symbols) {
      expect(valid).toContain(s.segment);
    }
  });

  it('all fixtures have valid listing status', () => {
    const valid: PSEListingStatus[] = ['active', 'suspended', 'delisted'];
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

  it('active equities have pseSymbol equal to canonicalSymbol', () => {
    for (const s of symbols) {
      if (s.segment === 'EQ' && s.listingStatus === 'active') {
        expect(s.pseSymbol).toBe(s.canonicalSymbol);
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

  it('suspended and delisted symbols are represented', () => {
    expect(symbols.some(s => s.listingStatus === 'suspended')).toBe(true);
    expect(symbols.some(s => s.listingStatus === 'delisted')).toBe(true);
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
  it('BDO is present and large cap', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'BDO')!;
    expect(s).toBeDefined();
    expect(s.exchange).toBe('PSE');
    expect(s.marketCapCategory).toBe('large');
    expect(s.isin).toBe('PHY0967A1094');
    expect(s.companyName).toContain('BDO');
  });

  it('FMETF is an ETF', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'FMETF')!;
    expect(s).toBeDefined();
    expect(s.segment).toBe('ET');
    expect(s.sector).toBeNull();
  });

  it('ABRA is suspended', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'ABRA')!;
    expect(s).toBeDefined();
    expect(s.listingStatus).toBe('suspended');
  });

  it('AGRI is SME', () => {
    const s = buildSymbolMasterFixture().find(x => x.canonicalSymbol === 'AGRI')!;
    expect(s).toBeDefined();
    expect(s.segment).toBe('SM');
    expect(s.marketCapCategory).toBe('small');
  });
});
