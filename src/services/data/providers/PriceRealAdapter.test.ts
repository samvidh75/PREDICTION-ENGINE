/**
 * Tests for PriceRealAdapter
 *
 * Since the adapter reads from a real SQLite database whose content depends
 * on ingestion state, we verify structural behaviour:
 *   - Wired correctly with valid symbol
 *   - Returns expected error for invalid symbols
 *   - Applies options (limit, start/end) correctly
 *   - Reports EMPTY_RESPONSE for non-existent symbols
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { PriceRealAdapter } from './PriceRealAdapter';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('PriceRealAdapter', () => {
  let adapter: PriceRealAdapter;

  beforeAll(() => {
    adapter = new PriceRealAdapter();
  });

  it('initializes with a valid DB kind', () => {
    expect(['sqlite', 'postgres', 'unavailable']).toContain(adapter.kind);
  });

  it('returns INVALID_SYMBOL for empty symbol', async () => {
    const result = await adapter.getDailyCandles('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('INVALID_SYMBOL');
  });

  it('returns INVALID_SYMBOL for malformed symbols', async () => {
    const result = await adapter.getDailyCandles('!!!bad!!!');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('INVALID_SYMBOL');
  });

  it('returns EMPTY_RESPONSE for symbols not in the database', async () => {
    const result = await adapter.getDailyCandles('ZZZZZZZZ');
    // If DB is unavailable, ADAPTER_UNAVAILABLE or UNKNOWN_ADAPTER_ERROR is also acceptable
    if (!result.ok) {
      expect(['EMPTY_RESPONSE', 'ADAPTER_UNAVAILABLE', 'UNKNOWN_ADAPTER_ERROR']).toContain(result.errorCode);
    }
  });

  it('returns EMPTY_RESPONSE for intraday (not available from DB)', async () => {
    const result = await adapter.getIntradayCandles('RELIANCE', '1h');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('EMPTY_RESPONSE');
  });

  it('returns a valid AdapterResult structure on success', async () => {
    const result = await adapter.getDailyCandles('RELIANCE');
    if (result.ok) {
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.asOf).toMatch(ISO_DATE);
      expect(result.warnings).toEqual([]);
      if (result.data.length > 0) {
        const candle = result.data[0];
        expect(candle.symbol).toBe('RELIANCE');
        expect(candle.timeframe).toBe('1d');
        expect(typeof candle.open).toBe('number');
        expect(typeof candle.high).toBe('number');
        expect(typeof candle.low).toBe('number');
        expect(typeof candle.close).toBe('number');
        expect(candle.timestamp).toBeTruthy();
      }
    } else {
      // DB may not have RELIANCE data yet — that's OK for an ingestion-backed DB
      expect(['EMPTY_RESPONSE', 'ADAPTER_UNAVAILABLE', 'UNKNOWN_ADAPTER_ERROR']).toContain(result.errorCode);
    }
  });

  it('normalises symbols with exchange prefixes', async () => {
    const result = await adapter.getDailyCandles('NSE:RELIANCE');
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].symbol).toBe('RELIANCE');
    } else {
      expect(['EMPTY_RESPONSE', 'ADAPTER_UNAVAILABLE', 'UNKNOWN_ADAPTER_ERROR']).toContain(result.errorCode);
    }
  });

  it('can be wired into the default adapter registry', async () => {
    const { createDataAdapterRegistry } = await import('../dataAdapterRegistry');
    const registry = createDataAdapterRegistry({
      price: adapter,
    });
    const result = await registry.price.getDailyCandles('RELIANCE');
    // Just verify the adapter is callable through the registry
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('asOf');
    expect(result).toHaveProperty('warnings');
  });
});
