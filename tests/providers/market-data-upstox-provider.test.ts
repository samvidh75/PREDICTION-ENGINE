import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpstoxProvider } from '../../src/providers/marketData/upstoxProvider';
import * as instrumentMap from '../../src/providers/instruments/instrumentMap';

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
  vi.restoreAllMocks();
});

describe('UpstoxProvider', () => {
  describe('config', () => {
    it('reports missing_optional when no token set', async () => {
      delete process.env.UPSTOX_ACCESS_TOKEN;
      const provider = new UpstoxProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('missing_optional');
      expect(health.provider).toBe('upstox');
    });

    it('returns expired status for expired token', async () => {
      process.env.UPSTOX_ACCESS_TOKEN = 'expired-token';
      global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false } as any);
      const provider = new UpstoxProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('expired_or_unauthorized');
    });

    it('returns missing_optional when token env is empty string', async () => {
      process.env.UPSTOX_ACCESS_TOKEN = '   ';
      const provider = new UpstoxProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('missing_optional');
    });
  });

  describe('quote normalization', () => {
    it('returns symbol_mapping_missing when symbol has no Upstox mapping', async () => {
      vi.spyOn(instrumentMap, 'getUpstoxInstrumentKey').mockReturnValue(null);
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      const provider = new UpstoxProvider();
      await expect(provider.getQuote('UNKNOWN')).rejects.toThrow('No Upstox instrument key');
    });

    it('normalizes quote fields correctly', async () => {
      vi.spyOn(instrumentMap, 'getUpstoxInstrumentKey').mockReturnValue('NSE_EQ|INE002A01018');
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      const provider = new UpstoxProvider();
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            'NSE_EQ|INE002A01018': {
              instrument_token: 'NSE_EQ|INE002A01018',
              symbol: 'RELIANCE',
              last_price: 2850.50,
              ohlc: { open: 2840, high: 2860, low: 2830, close: 2845 },
              volume: 5000000,
            },
          },
        }),
      } as any);
      const quote = await provider.getQuote('RELIANCE');
      expect(quote.symbol).toBe('RELIANCE');
      expect(quote.lastPrice).toBe(2850.50);
      expect(quote.previousClose).toBe(2845);
      expect(quote.open).toBe(2840);
      expect(quote.high).toBe(2860);
      expect(quote.low).toBe(2830);
      expect(quote.volume).toBe(5000000);
      expect(quote.provider).toBe('upstox');
      expect(quote.sourceQuality).toBe('live');
      expect(quote.exchange).toBe('NSE');
    });

    it('rejects NaN prices', async () => {
      vi.spyOn(instrumentMap, 'getUpstoxInstrumentKey').mockReturnValue('NSE_EQ|INE002A01018');
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      const provider = new UpstoxProvider();
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            'NSE_EQ|INE002A01018': {
              instrument_token: 'NSE_EQ|INE002A01018',
              symbol: 'RELIANCE',
              last_price: 'NaN',
              ohlc: { open: 0, high: 0, low: 0, close: 0 },
              volume: 0,
            },
          },
        }),
      } as any);
      await expect(provider.getQuote('RELIANCE')).rejects.toThrow('Invalid price');
    });
  });

  describe('historical normalization', () => {
    it('returns symbol_mapping_missing when no mapping', async () => {
      vi.spyOn(instrumentMap, 'getUpstoxInstrumentKey').mockReturnValue(null);
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      const provider = new UpstoxProvider();
      await expect(provider.getHistoricalDaily('UNKNOWN', '2024-01-01', '2024-01-05')).rejects.toThrow('No Upstox instrument key');
    });

    it('normalizes candle dates and filters NaN', async () => {
      vi.spyOn(instrumentMap, 'getUpstoxInstrumentKey').mockReturnValue('NSE_EQ|INE002A01018');
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      const provider = new UpstoxProvider();
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            candles: [
              ['2024-01-02T00:00:00+05:30', 100, 105, 99, 103, 10000, 0],
              ['2024-01-03T00:00:00+05:30', 103, 108, 102, 107, 12000, 0],
              ['2024-01-04T00:00:00+05:30', 107, 110, 106, 109, 15000, 0],
            ],
          },
        }),
      } as any);
      const candles = await provider.getHistoricalDaily('RELIANCE', '2024-01-01', '2024-01-05');
      expect(candles).toHaveLength(3);
      expect(candles[0].date).toBe('2024-01-02');
      expect(candles[0].provider).toBe('upstox');
      expect(candles[0].sourceQuality).toBe('exchange');
    });

    it('filters out rows with NaN values', async () => {
      vi.spyOn(instrumentMap, 'getUpstoxInstrumentKey').mockReturnValue('NSE_EQ|INE002A01018');
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      const provider = new UpstoxProvider();
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            candles: [
              ['2024-01-02T00:00:00+05:30', 100, 105, 99, 103, 10000, 0],
              ['2024-01-03T00:00:00+05:30', NaN, 108, 102, 107, 12000, 0],
              ['2024-01-04T00:00:00+05:30', null, 110, 106, 109, 15000, 0],
            ],
          },
        }),
      } as any);
      const candles = await provider.getHistoricalDaily('RELIANCE', '2024-01-01', '2024-01-05');
      expect(candles).toHaveLength(1);
    });
  });

  describe('health check', () => {
    it('handles network errors', async () => {
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const provider = new UpstoxProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('provider_unreachable');
    });

    it('detects 403 as expired_or_unauthorized', async () => {
      process.env.UPSTOX_ACCESS_TOKEN = 'test';
      global.fetch = vi.fn().mockResolvedValue({ status: 403, ok: false } as any);
      const provider = new UpstoxProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('expired_or_unauthorized');
    });
  });

  describe('no trading methods exposed', () => {
    it('does not expose order/trade/portfolio methods', () => {
      const provider = new UpstoxProvider();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(provider));
      expect(methods).not.toContain('placeOrder');
      expect(methods).not.toContain('modifyOrder');
      expect(methods).not.toContain('cancelOrder');
      expect(methods).not.toContain('getOrders');
      expect(methods).not.toContain('getHoldings');
      expect(methods).not.toContain('getPositions');
    });
  });

  describe('expired optional behavior', () => {
    it('does not block app when token is expired', async () => {
      process.env.UPSTOX_ACCESS_TOKEN = 'expired';
      global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false } as any);
      const provider = new UpstoxProvider();
      await expect(provider.getQuote('RELIANCE')).rejects.toThrow();
    });

    it('skips health check when token is missing', async () => {
      delete process.env.UPSTOX_ACCESS_TOKEN;
      const provider = new UpstoxProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('missing_optional');
    });
  });
});
