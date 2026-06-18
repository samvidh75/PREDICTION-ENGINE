import { afterEach, describe, expect, it, vi } from 'vitest';
import { YahooFallbackProvider } from '../../src/providers/marketData/yahooFallbackProvider';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('YahooFallbackProvider', () => {
  describe('provider identity', () => {
    it('has providerId yahoo', () => {
      const provider = new YahooFallbackProvider();
      expect(provider.providerId).toBe('yahoo');
    });
  });

  describe('health check', () => {
    it('handles fetch error gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
      const provider = new YahooFallbackProvider();
      const health = await provider.checkHealth();
      expect(['provider_unreachable', 'provider_error']).toContain(health.status);
    });

    it('reports healthy on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          chart: { result: [{ meta: { regularMarketPrice: 100 } }] },
        }),
      } as any);
      const provider = new YahooFallbackProvider();
      const health = await provider.checkHealth();
      expect(health.status).toBe('healthy');
    });
  });

  describe('no trading methods', () => {
    it('does not expose trade/order methods', () => {
      const provider = new YahooFallbackProvider();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(provider));
      expect(methods).not.toContain('placeOrder');
      expect(methods).not.toContain('getOrders');
      expect(methods).not.toContain('getHoldings');
    });
  });
});
