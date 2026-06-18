import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderBroker } from '../../src/providers/marketData/providerBroker';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProviderBroker', () => {
  describe('fallback precedence', () => {
    it('quotePrecedence is in correct order — no broker credentials required', () => {
      const broker = new ProviderBroker();
      expect(broker.quotePrecedence).toEqual(['indianapi', 'yahoo']);
      expect(broker.quotePrecedence).not.toContain('dhan');
      expect(broker.quotePrecedence).not.toContain('upstox');
    });

    it('historicalPrecedence is in correct order — no broker credentials required', () => {
      const broker = new ProviderBroker();
      expect(broker.historicalPrecedence).toEqual(['yahoo']);
      expect(broker.historicalPrecedence).not.toContain('dhan');
      expect(broker.historicalPrecedence).not.toContain('upstox');
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
      expect(result.fallbackChain).toContain('yahoo');
      expect(result.fallbackChain).not.toContain('dhan');
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
    it('returns summary with public providers only', async () => {
      const broker = new ProviderBroker();
      const summary = await broker.getStatusSummary();
      expect(summary.yahoo).toBeDefined();
      expect(summary.indianapi).toBeDefined();
      expect(Object.keys(summary)).not.toContain('dhan');
      expect(Object.keys(summary)).not.toContain('upstox');
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
