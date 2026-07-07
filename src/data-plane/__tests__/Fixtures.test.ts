import { describe, it, expect } from 'vitest';
import { buildSymbolMasterFixture } from '../fixtures/symbol-master';

describe('Symbol master fixture integration', () => {
  it('loads without error', () => {
    expect(() => buildSymbolMasterFixture()).not.toThrow();
  });

  it('returns at least 20 symbols', () => {
    const symbols = buildSymbolMasterFixture();
    expect(symbols.length).toBeGreaterThanOrEqual(20);
  });

  it('has at least 15 PSE symbols', () => {
    const nse = buildSymbolMasterFixture().filter(s => s.exchange === 'PSE');
    expect(nse.length).toBeGreaterThanOrEqual(15);
  });

  it('has at least 1 PSE symbol', () => {
    const bse = buildSymbolMasterFixture().filter(s => s.exchange === 'PSE');
    expect(bse.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 1 SME symbol', () => {
    const sme = buildSymbolMasterFixture().filter(s => s.segment === 'SM');
    expect(sme.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 1 ETF symbol', () => {
    const etfs = buildSymbolMasterFixture().filter(s => s.segment === 'ET');
    expect(etfs.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 3 market cap categories represented', () => {
    const cats = new Set(buildSymbolMasterFixture().map(s => s.marketCapCategory));
    expect(cats.size).toBeGreaterThanOrEqual(3);
  });

  it('all ISINs are valid length', () => {
    const isins = buildSymbolMasterFixture().map(s => s.isin).filter(Boolean);
    for (const isin of isins) {
      expect(isin.length).toBe(12);
    }
  });

  it('every symbol has aliases including symbol and ticker variants', () => {
    for (const s of buildSymbolMasterFixture()) {
      expect(s.aliases.length).toBeGreaterThanOrEqual(3);
    }
  });
});
