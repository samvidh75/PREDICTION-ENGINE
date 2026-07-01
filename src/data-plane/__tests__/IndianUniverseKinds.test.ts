import { describe, it, expect } from 'vitest';
import { UNIVERSE_REGISTRY, buildUniverse, getUniverseInfo } from '../universe/IndianUniverseKinds';
import { buildSymbolMasterFixture } from '../fixtures/symbol-master';

describe('UNIVERSE_REGISTRY', () => {
  it('defines at least 6 universe kinds', () => {
    expect(UNIVERSE_REGISTRY.length).toBeGreaterThanOrEqual(6);
  });

  it('every universe has a unique kind', () => {
    const kinds = UNIVERSE_REGISTRY.map(u => u.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('every universe has a non-empty name and description', () => {
    for (const u of UNIVERSE_REGISTRY) {
      expect(u.name).toBeTruthy();
      expect(u.description).toBeTruthy();
    }
  });

  it('has all_active universe', () => {
    const u = UNIVERSE_REGISTRY.find(x => x.kind === 'all_active');
    expect(u).toBeDefined();
    expect(u!.name).toBe('All Active');
  });
});

describe('buildUniverse', () => {
  const symbols = buildSymbolMasterFixture();

  it('all_active includes all active symbols', () => {
    const result = buildUniverse('all_active', symbols);
    expect(result.symbols.length).toBe(symbols.filter(s => s.listingStatus === 'active').length);
  });

  it('nse_large_cap only includes NSE large caps', () => {
    const result = buildUniverse('nse_large_cap', symbols);
    for (const s of result.symbols) {
      expect(s.exchange).toBe('NSE');
      expect(s.marketCapCategory).toBe('large');
    }
  });

  it('nse_mid_cap only includes NSE mid caps', () => {
    const result = buildUniverse('nse_mid_cap', symbols);
    expect(result.symbols.length).toBeGreaterThanOrEqual(1);
    for (const s of result.symbols) {
      expect(s.marketCapCategory).toBe('mid');
    }
  });

  it('nse_small_cap returns at least SME stocks', () => {
    const result = buildUniverse('nse_small_cap', symbols);
    expect(result.symbols.length).toBeGreaterThanOrEqual(1);
    for (const s of result.symbols) {
      expect(s.marketCapCategory).toBe('small');
    }
  });

  it('bse_primary returns only BSE-primary symbols', () => {
    const result = buildUniverse('bse_primary', symbols);
    for (const s of result.symbols) {
      expect(s.exchange).toBe('BSE');
    }
  });

  it('etf returns only ETF symbols', () => {
    const result = buildUniverse('etf', symbols);
    for (const s of result.symbols) {
      expect(s.segment).toBe('ET');
    }
  });

  it('nifty_50 sample validates', () => {
    const result = buildUniverse('nifty_50', symbols);
    // Only includes symbols in the explicit NIFTY 50 list
    expect(result.symbols.length).toBeGreaterThanOrEqual(1);
  });

  it('empty universe for unknown kind', () => {
    // @ts-expect-error — testing invalid kind
    const result = buildUniverse('nonexistent', symbols);
    expect(result.symbols).toEqual([]);
  });

  it('sets metadata on result', () => {
    const result = buildUniverse('nse_large_cap', symbols);
    expect(result.kind).toBe('nse_large_cap');
    expect(result.count).toBe(result.symbols.length);
    expect(typeof result.builtAt).toBe('number');
  });
});

describe('getUniverseInfo', () => {
  it('returns metadata for a known universe', () => {
    const info = getUniverseInfo('nifty_50');
    expect(info).toBeDefined();
    expect(info!.name).toBe('NIFTY 50');
  });

  it('returns undefined for unknown universe', () => {
    const info = getUniverseInfo('nonexistent');
    expect(info).toBeUndefined();
  });
});
