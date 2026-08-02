import { describe, it, expect } from 'vitest';
import { UNIVERSE_REGISTRY, buildUniverse, getUniverseInfo } from '../universe/PSEUniverseKinds';
import type { PSESymbolMasterStore } from '../symbols/PSESymbolMasterStore';
import type { PSESymbol } from '../symbols/PSESymbol';
import { buildSymbolMasterFixture } from '../fixtures/symbol-master';

// ---------------------------------------------------------------------------
// Mock store that returns fixture data
// ---------------------------------------------------------------------------

function mockStore(symbols: PSESymbol[]): PSESymbolMasterStore {
  return {
    listActive: () => Promise.resolve(symbols.filter(s => s.listingStatus === 'active')),
  } as PSESymbolMasterStore;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe('UNIVERSE_REGISTRY', () => {
  it('defines at least 6 universe kinds', () => {
    expect(UNIVERSE_REGISTRY.length).toBeGreaterThanOrEqual(6);
  });

  it('every universe has a unique kind', () => {
    const kinds = UNIVERSE_REGISTRY.map(u => u.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('every universe has a non-empty kind and description', () => {
    for (const u of UNIVERSE_REGISTRY) {
      expect(u.kind).toBeTruthy();
      expect(u.description).toBeTruthy();
    }
  });

  it('has all_active universe', () => {
    const u = UNIVERSE_REGISTRY.find(x => x.kind === 'all_active');
    expect(u).toBeDefined();
    expect(u!.label).toBe('All Active');
  });
});

// ---------------------------------------------------------------------------
// buildUniverse
// ---------------------------------------------------------------------------

describe('buildUniverse', () => {
  const symbols = buildSymbolMasterFixture();
  const store = mockStore(symbols);

  it('all_active includes all active symbols', async () => {
    const result = await buildUniverse('all_active', undefined, store);
    const activeCount = symbols.filter(s => s.listingStatus === 'active').length;
    expect(result.length).toBe(activeCount);
  });

  it('large_cap includes large cap symbols', async () => {
    const result = await buildUniverse('large_cap', undefined, store);
    for (const sym of result) {
      const entry = symbols.find(s => s.canonicalSymbol === sym)!;
      expect(entry.marketCapCategory).toBe('large');
    }
  });

  it('mid_cap includes mid/large cap symbols', async () => {
    const result = await buildUniverse('mid_cap', undefined, store);
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const sym of result) {
      const entry = symbols.find(s => s.canonicalSymbol === sym)!;
      expect(['mid', 'large']).toContain(entry.marketCapCategory);
    }
  });

  it('small_cap returns small/micro symbols', async () => {
    const result = await buildUniverse('small_cap', undefined, store);
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const sym of result) {
      const entry = symbols.find(s => s.canonicalSymbol === sym)!;
      expect(['small', 'micro']).toContain(entry.marketCapCategory);
    }
  });

  it('etf returns only ETF symbols', async () => {
    const result = await buildUniverse('etf', undefined, store);
    for (const sym of result) {
      const entry = symbols.find(s => s.canonicalSymbol === sym)!;
      expect(entry.segment).toBe('ET');
    }
  });

  it('psei resolves to large cap proxy', async () => {
    const result = await buildUniverse('psei', undefined, store);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('sector_financials returns only Financials-sector symbols', async () => {
    const result = await buildUniverse('sector_financials', undefined, store);
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const sym of result) {
      const entry = symbols.find(s => s.canonicalSymbol === sym)!;
      expect(entry.sector).toBe('Financials');
    }
  });

  it('returns string array of canonical symbols', async () => {
    const result = await buildUniverse('all_active', undefined, store);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// getUniverseInfo
// ---------------------------------------------------------------------------

describe('getUniverseInfo', () => {
  it('returns metadata for a known universe', () => {
    const info = getUniverseInfo('psei');
    expect(info).toBeDefined();
    expect(info.kind).toBe('psei');
    expect(info.label).toBe('PSEi Composite');
  });

  it('throws for unknown universe', () => {
    expect(() => getUniverseInfo('nonexistent' as any)).toThrow('Unknown universe kind');
  });
});
