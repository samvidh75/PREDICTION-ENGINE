/**
 * Tests for StockUniverseAdapter
 *
 * Verifies loading from the bundled stock-universe.json,
 * symbol lookups, market cap categorization, and error handling.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { StockUniverseAdapter } from './StockUniverseAdapter';

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('StockUniverseAdapter', () => {
  let adapter: StockUniverseAdapter;

  beforeAll(() => {
    adapter = new StockUniverseAdapter();
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  it('loads successfully from the bundled stock-universe.json', () => {
    expect(adapter.ready).toBe(true);
    expect(adapter.size).toBeGreaterThan(0);
    expect(adapter.dataGeneratedAt).toMatch(ISO_PATTERN);
  });

  // ── Known symbols ──────────────────────────────────────────────────────────

  it('returns company master data for a known PSE symbol', async () => {
    const result = await adapter.getCompanyMaster('RELIANCE');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('RELIANCE');
      expect(result.data.companyName).toBeTruthy();
      expect(result.data.exchange).toBe('NSE');
      expect(result.data.sector).toBeTruthy();
      expect(result.data.industry).toBeTruthy();
      expect(result.data.marketCapCategory).toBeDefined();
    }
    expect(result.asOf).toMatch(ISO_PATTERN);
  });

  it('returns company master data for a known PSE symbol', async () => {
    // Symbols with numeric values are BSE-listed
    const result = await adapter.getCompanyMaster('TCS');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('TCS');
      expect(result.data.companyName).toBeTruthy();
    }
  });

  it('maps marketCap to Large Cap for large-cap entries (>= 20000 cr)', async () => {
    // RELIANCE has marketCap ~1,600,864 cr -> Large Cap
    const result = await adapter.getCompanyMaster('RELIANCE');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.marketCapCategory).toBe('Large Cap');
  });

  it('maps marketCap to Mid Cap for mid-cap entries (>= 5000 cr)', async () => {
    // ABSLAMC has marketCap ~5,539 cr -> Mid Cap
    const result = await adapter.getCompanyMaster('ABSLAMC');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.marketCapCategory).toBe('Mid Cap');
  });

  it('maps marketCap to Small Cap for small-cap entries (>= 500 cr)', async () => {
    // CALSOFT has marketCap ~3,559 cr -> Small Cap
    const result = await adapter.getCompanyMaster('CALSOFT');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.marketCapCategory).toBe('Small Cap');
  });

  // ── Normalization ──────────────────────────────────────────────────────────

  it('normalises symbols with exchange prefixes', async () => {
    const result = await adapter.getCompanyMaster('NSE:RELIANCE');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('RELIANCE');
    }
  });

  it('normalises symbols with .NS suffix', async () => {
    const result = await adapter.getCompanyMaster('RELIANCE.NS');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('RELIANCE');
    }
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('returns INVALID_SYMBOL for malformed symbols', async () => {
    const result = await adapter.getCompanyMaster('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('INVALID_SYMBOL');
  });

  it('returns EMPTY_RESPONSE for unknown symbols', async () => {
    const result = await adapter.getCompanyMaster('ZZZZZZZZ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('EMPTY_RESPONSE');
  });

  // ── Adapter wiring ─────────────────────────────────────────────────────────

  it('can be wired into the default adapter registry', async () => {
    // Dynamically import to avoid affecting other tests
    const { createDataAdapterRegistry } = await import('../dataAdapterRegistry');
    const registry = createDataAdapterRegistry({
      companyMaster: adapter,
    });
    const result = await registry.companyMaster.getCompanyMaster('TCS');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('TCS');
    }
  });
});
