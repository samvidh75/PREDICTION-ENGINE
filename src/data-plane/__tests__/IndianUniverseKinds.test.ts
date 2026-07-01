import { describe, it, expect } from 'vitest';
import { UNIVERSE_REGISTRY, buildUniverse, getUniverseInfo } from '../universe/IndianUniverseKinds';
import type { IndianSymbolMasterStore } from '../symbols/IndianSymbolMasterStore';
import type { IndianEquitySymbol } from '../symbols/IndianEquitySymbol';
import { buildSymbolMasterFixture } from '../fixtures/symbol-master';

// ---------------------------------------------------------------------------
// Mock store that returns fixture data
// ---------------------------------------------------------------------------

function mockStore(symbols: IndianEquitySymbol[]): IndianSymbolMasterStore {
  return {
    listActive: () => Promise.resolve(symbols.filter(s => s.listingStatus === 'active')),
  } as IndianSymbolMasterStore;
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
    // Only active symbols (fixture has 21 active + 3 inactive)
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

  it('nifty_50 resolves to large cap proxy', async () => {
    const result = await buildUniverse('nifty_50', undefined, store);
    expect(result.length).toBeGreaterThanOrEqual(1);
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
    const info = getUniverseInfo('nifty_50');
    expect(info).toBeDefined();
    expect(info.kind).toBe('nifty_50');
    expect(info.label).toBe('NIFTY 50');
  });

  it('throws for unknown universe', () => {
    expect(() => getUniverseInfo('nonexistent' as any)).toThrow('Unknown universe kind');
  });
});
