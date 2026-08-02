/**
 * Tests for StockUniverseAdapter
 *
 * Verifies loading from the bundled stock-universe.json,
 * symbol lookups, market cap categorization, and error handling.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { StockUniverseAdapter } from './StockUniverseAdapter';

describe('StockUniverseAdapter', () => {
  let adapter: StockUniverseAdapter;

  beforeAll(() => {
    adapter = new StockUniverseAdapter();
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  it('loads successfully from the bundled stock-universe.json', () => {
    expect(adapter.ready).toBe(true);
    expect(adapter.size).toBeGreaterThan(0);
  });

  // ── Known symbols ──────────────────────────────────────────────────────────

  it('returns company master data for a known PSE symbol', async () => {
    const result = await adapter.getCompanyMaster('BDO');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('BDO');
      expect(result.data.companyName).toBeTruthy();
      expect(result.data.exchange).toBe('PSE');
      expect(result.data.sector).toBeTruthy();
      expect(result.data.industry).toBeTruthy();
    }
  });

  it('returns company master data for another known PSE symbol', async () => {
    const result = await adapter.getCompanyMaster('JFC');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('JFC');
      expect(result.data.companyName).toBeTruthy();
    }
  });

  it('maps zero marketCap to Micro Cap', async () => {
    const result = await adapter.getCompanyMaster('BDO');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.marketCapCategory).toBe('Micro Cap');
  });

  // ── Normalization ──────────────────────────────────────────────────────────

  it('normalises symbols with exchange prefixes', async () => {
    const result = await adapter.getCompanyMaster('PSE:BDO');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('BDO');
    }
  });

  it('normalises symbols with .PS suffix', async () => {
    const result = await adapter.getCompanyMaster('BDO.PS');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('BDO');
    }
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('returns INVALID_SYMBOL for malformed symbols', async () => {
    const result = await adapter.getCompanyMaster('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('INVALID_SYMBOL');
  });

  it('returns EMPTY_RESPOPSE for unknown symbols', async () => {
    const result = await adapter.getCompanyMaster('ZZZZZZZZ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('EMPTY_RESPOPSE');
  });

  // ── Adapter wiring ─────────────────────────────────────────────────────────

  it('can be wired into the default adapter registry', async () => {
    // Dynamically import to avoid affecting other tests
    const { createDataAdapterRegistry } = await import('../dataAdapterRegistry');
    const registry = createDataAdapterRegistry({
      companyMaster: adapter,
    });
    const result = await registry.companyMaster.getCompanyMaster('JFC');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbol).toBe('JFC');
    }
  });
});
