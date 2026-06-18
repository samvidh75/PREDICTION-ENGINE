import { afterEach, describe, expect, it, vi } from 'vitest';
import { DhanProvider } from '../../src/providers/marketData/dhanProvider';
import * as instrumentMap from '../../src/providers/instruments/instrumentMap';

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
  vi.restoreAllMocks();
});

describe('DhanProvider', () => {
  describe('config', () => {
    it('reports missing_optional when no credentials set', async () => {
      delete process.env.DHAN_CLIENT_ID;
      delete process.env.DHAN_ACCESS_TOKEN;
      const provider = new DhanProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('missing_optional');
      expect(health.provider).toBe('dhan');
    });

    it('reports missing_optional when only client_id set', async () => {
      process.env.DHAN_CLIENT_ID = 'test-client';
      delete process.env.DHAN_ACCESS_TOKEN;
      const provider = new DhanProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('missing_optional');
    });

    it('reports missing_optional when only access_token set', async () => {
      delete process.env.DHAN_CLIENT_ID;
      process.env.DHAN_ACCESS_TOKEN = 'test-token';
      const provider = new DhanProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('missing_optional');
    });
  });

  describe('quote normalization', () => {
    it('returns symbol_mapping_missing when symbol has no Dhan mapping', async () => {
      vi.spyOn(instrumentMap, 'getDhanSecurityId').mockReturnValue(null);
      process.env.DHAN_CLIENT_ID = 'test';
      process.env.DHAN_ACCESS_TOKEN = 'test';
      const provider = new DhanProvider();
      await expect(provider.getQuote('UNKNOWN')).rejects.toThrow('No Dhan security_id');
    });

    it('rejects NaN/Infinity prices', async () => {
      vi.spyOn(instrumentMap, 'getDhanSecurityId').mockReturnValue('123');
      process.env.DHAN_CLIENT_ID = 'test';
      process.env.DHAN_ACCESS_TOKEN = 'test';
      const provider = new DhanProvider();
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          status: 'success',
          data: { NSE_EQ: { '123': { last_price: null, ohlc: { open: 0, close: 0, high: 0, low: 0 } } } },
        }),
      } as any);
      await expect(provider.getQuote('RELIANCE')).rejects.toThrow('No quote data');
    });
  });

  describe('historical normalization', () => {
    it('returns symbol_mapping_missing when symbol has no Dhan mapping', async () => {
      vi.spyOn(instrumentMap, 'getDhanSecurityId').mockReturnValue(null);
      process.env.DHAN_CLIENT_ID = 'test';
      process.env.DHAN_ACCESS_TOKEN = 'test';
      const provider = new DhanProvider();
      await expect(provider.getHistoricalDaily('UNKNOWN', '2024-01-01', '2024-01-05')).rejects.toThrow('No Dhan security_id');
    });

    it('filters NaN candles', async () => {
      vi.spyOn(instrumentMap, 'getDhanSecurityId').mockReturnValue('123');
      process.env.DHAN_CLIENT_ID = 'test';
      process.env.DHAN_ACCESS_TOKEN = 'test';
      const provider = new DhanProvider();
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            open: [100, NaN, 102],
            high: [105, NaN, 107],
            low: [99, NaN, 101],
            close: [103, NaN, 105],
            volume: [10000, 0, 12000],
            timestamp: [1704067200, 1704153600, 1704240000],
          },
          open: [100, NaN, 102],
          high: [105, NaN, 107],
          low: [99, NaN, 101],
          close: [103, NaN, 105],
          volume: [10000, 0, 12000],
          timestamp: [1704067200, 1704153600, 1704240000],
        }),
      } as any);
      const candles = await provider.getHistoricalDaily('RELIANCE', '2024-01-01', '2024-01-05');
      expect(candles).toHaveLength(2);
      expect(candles.every(c => Number.isFinite(c.open))).toBe(true);
    });
  });

  describe('health check', () => {
    it('handles network errors gracefully', async () => {
      process.env.DHAN_CLIENT_ID = 'test';
      process.env.DHAN_ACCESS_TOKEN = 'test';
      global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND api.dhan.co'));
      const provider = new DhanProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('provider_unreachable');
    });

    it('detects expired token from 401', async () => {
      process.env.DHAN_CLIENT_ID = 'test';
      process.env.DHAN_ACCESS_TOKEN = 'expired-token';
      global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false } as any);
      const provider = new DhanProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('expired_or_unauthorized');
    });

    it('detects rate limiting from 429', async () => {
      process.env.DHAN_CLIENT_ID = 'test';
      process.env.DHAN_ACCESS_TOKEN = 'test';
      global.fetch = vi.fn().mockResolvedValue({ status: 429, ok: false } as any);
      const provider = new DhanProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('rate_limited');
    });
  });

  describe('no trading methods exposed', () => {
    it('does not expose order/trade methods', () => {
      const provider = new DhanProvider();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(provider));
      expect(methods).not.toContain('placeOrder');
      expect(methods).not.toContain('modifyOrder');
      expect(methods).not.toContain('cancelOrder');
      expect(methods).not.toContain('getOrders');
      expect(methods).not.toContain('getTradeBook');
    });
  });
});
