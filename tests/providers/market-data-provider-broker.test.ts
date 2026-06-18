import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderBroker } from '../../src/providers/marketData/providerBroker';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProviderBroker', () => {
  describe('fallback precedence', () => {
    it('quotePrecedence is in correct order', () => {
      const broker = new ProviderBroker();
      expect(broker.quotePrecedence).toEqual(['dhan', 'upstox', 'indianapi', 'yahoo']);
    });

    it('historicalPrecedence is in correct order', () => {
      const broker = new ProviderBroker();
      expect(broker.historicalPrecedence).toEqual(['dhan', 'upstox', 'yahoo']);
    });
  });

  describe('error classification', () => {
    it('returns unavailable when all providers fail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
      const broker = new ProviderBroker();
      const result = await broker.getQuote('RELIANCE');
      expect(result.data).toBeNull();
      expect(result.provider).toBe('unavailable');
      expect(result.fallbackChain.length).toBeGreaterThan(0);
    });

    it('includes fallback chain in result', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
      const broker = new ProviderBroker();
      const result = await broker.getQuote('RELIANCE');
      expect(result.fallbackChain).toContain('dhan');
      expect(result.fallbackChain).toContain('upstox');
      expect(result.fallbackChain).toContain('yahoo');
    });

    it('returns null data when all historical providers fail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
      const broker = new ProviderBroker();
      const result = await broker.getHistoricalDaily('RELIANCE', '2024-01-01', '2024-01-05');
      expect(result.data).toBeNull();
      expect(result.provider).toBe('unavailable');
    });
  });

  describe('no fake fallback values', () => {
    it('does not fabricate quote data when providers fail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
      const broker = new ProviderBroker();
      const result = await broker.getQuote('RELIANCE');
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('does not fabricate historical data when providers fail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
      const broker = new ProviderBroker();
      const result = await broker.getHistoricalDaily('RELIANCE', '2024-01-01', '2024-01-05');
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('provider status summary', () => {
    it('returns summary with all providers', async () => {
      const broker = new ProviderBroker();
      const summary = await broker.getStatusSummary();
      expect(summary.dhan).toBeDefined();
      expect(summary.upstox).toBeDefined();
      expect(summary.yahoo).toBeDefined();
      expect(summary.indianapi).toBeDefined();
    });

    it('reports missing_optional for missing credentials', async () => {
      delete process.env.DHAN_CLIENT_ID;
      delete process.env.DHAN_ACCESS_TOKEN;
      delete process.env.UPSTOX_ACCESS_TOKEN;
      const broker = new ProviderBroker();
      const summary = await broker.getStatusSummary();
      expect(summary.dhan.status).toBe('missing_optional');
      expect(summary.upstox.status).toBe('missing_optional');
    });
  });

  describe('provider health', () => {
    it('returns null for unknown provider', async () => {
      const broker = new ProviderBroker();
      const health = await broker.getProviderHealth('indianapi' as any);
      expect(health).toBeNull();
    });

    it('returns health for registered providers', async () => {
      const broker = new ProviderBroker();
      const health = await broker.getProviderHealth('yahoo');
      expect(health).not.toBeNull();
      expect(health!.provider).toBe('yahoo');
    });
  });

  describe('no trading methods exposed', () => {
    it('does not expose trading methods on broker', () => {
      const broker = new ProviderBroker();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(broker));
      expect(methods).not.toContain('placeOrder');
      expect(methods).not.toContain('modifyOrder');
      expect(methods).not.toContain('cancelOrder');
      expect(methods).not.toContain('getHoldings');
      expect(methods).not.toContain('getPositions');
    });
  });
});
