import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreBackedSymbolResolver } from '../symbols/IndianSymbolResolver';
import type { IndianEquitySymbol } from '../symbols/IndianEquitySymbol';
import type { IndianSymbolMasterStoreLike } from '../symbols/IndianSymbolResolver';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSymbol(overrides: Partial<IndianEquitySymbol> & { canonicalSymbol: string }): IndianEquitySymbol {
  return {
    exchange: 'NSE',
    segment: 'EQ',
    isin: '',
    companyName: '',
    sector: null,
    industry: null,
    listingStatus: 'active',
    aliases: [overrides.canonicalSymbol],
    bseCode: null,
    nseSymbol: overrides.canonicalSymbol,
    faceValue: null,
    marketCapCr: null,
    marketCapCategory: null,
    firstSeenAt: Date.now() - 3600 * 1000,
    lastSeenAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

function createMockStore(): IndianSymbolMasterStoreLike {
  const symbols: IndianEquitySymbol[] = [
    makeSymbol({ canonicalSymbol: 'RELIANCE', aliases: ['RELIANCE', 'RELIANCE.NS', 'RELIANCE-EQ', '500325'], isin: 'IN0020200124', bseCode: '500325' }),
    makeSymbol({ canonicalSymbol: 'TCS', aliases: ['TCS', 'TCS.NS', 'TCS-EQ', '532540'], isin: 'INE467B01029', bseCode: '532540' }),
    makeSymbol({ canonicalSymbol: 'HDFCBANK', aliases: ['HDFCBANK', 'HDFCBANK.NS', 'HDFCBANK-EQ', '500180'], isin: 'INE040A01034', bseCode: '500180' }),
    makeSymbol({ canonicalSymbol: 'INFY', aliases: ['INFY', 'INFY.NS', 'INFY-EQ', '500209'], isin: 'INE009A01021', bseCode: '500209' }),
  ];

  // Build lookup maps
  const bySymbol = new Map<string, IndianEquitySymbol>();
  const byIsin = new Map<string, IndianEquitySymbol>();
  const byBse = new Map<string, IndianEquitySymbol>();
  const byAlias = new Map<string, IndianEquitySymbol>();

  for (const s of symbols) {
    bySymbol.set(s.canonicalSymbol, s);
    for (const a of s.aliases) byAlias.set(a, s);
    if (s.isin) byIsin.set(s.isin, s);
    if (s.bseCode) byBse.set(s.bseCode, s);
  }

  return {
    findBySymbol: vi.fn((sym: string) => Promise.resolve(bySymbol.get(sym) ?? null)),
    findByAlias: vi.fn((alias: string) => Promise.resolve(byAlias.get(alias) ?? null)),
    findByIsin: vi.fn((isin: string) => Promise.resolve(byIsin.get(isin) ?? null)),
    findByBseCode: vi.fn((code: string) => Promise.resolve(byBse.get(code) ?? null)),
    listActive: vi.fn(() => Promise.resolve(symbols)),
  };
}

let mockStore: IndianSymbolMasterStoreLike;
let resolver: StoreBackedSymbolResolver;

beforeEach(() => {
  mockStore = createMockStore();
  resolver = new StoreBackedSymbolResolver(mockStore);
});

describe('StoreBackedSymbolResolver', () => {
  it('resolves exact canonical symbol', async () => {
    const result = await resolver.resolve('RELIANCE');
    expect(result.status).toBe('exact');
    expect(result.symbol?.canonicalSymbol).toBe('RELIANCE');
  });

  it('resolves by alias (.NS suffix)', async () => {
    const result = await resolver.resolve('TCS.NS');
    expect(result.status).toBe('alias');
    expect(result.symbol?.canonicalSymbol).toBe('TCS');
  });

  it('resolves normalized ticker (-EQ suffix)', async () => {
    const result = await resolver.resolve('HDFCBANK-EQ');
    // HDFCBANK-EQ is stored as an exact alias in the mock fixture,
    // so step 2 (alias match) resolves it before step 3 (normalize + retry).
    expect(result.status).toBe('alias');
    expect(result.symbol?.canonicalSymbol).toBe('HDFCBANK');
  });

  it('resolves by ISIN', async () => {
    const result = await resolver.resolve('IN0020200124');
    expect(result.status).toBe('alias');
    expect(result.symbol?.canonicalSymbol).toBe('RELIANCE');
  });

  it('resolves by BSE code', async () => {
    const result = await resolver.resolve('500209');
    expect(result.status).toBe('alias');
    expect(result.symbol?.canonicalSymbol).toBe('INFY');
  });

  it('resolves by normalized alias', async () => {
    const result = await resolver.resolve('reliance.NS');
    expect(result.status).toBe('normalized');
    expect(result.symbol?.canonicalSymbol).toBe('RELIANCE');
  });

  it('returns not_found for unknown ticker', async () => {
    const result = await resolver.resolve('UNKNOWN123');
    expect(result.status).toBe('not_found');
    expect(result.symbol).toBeNull();
  });

  it('resolveByIsin works', async () => {
    const s = await resolver.resolveByIsin('INE467B01029');
    expect(s?.canonicalSymbol).toBe('TCS');
  });

  it('resolveByIsin returns null for unknown ISIN', async () => {
    const s = await resolver.resolveByIsin('IN0000000000');
    expect(s).toBeNull();
  });

  it('resolveByBseCode works', async () => {
    const s = await resolver.resolveByBseCode('500180');
    expect(s?.canonicalSymbol).toBe('HDFCBANK');
  });

  it('listActive returns all active symbols', async () => {
    const result = await resolver.listActive();
    expect(result.length).toBe(4);
  });
});
