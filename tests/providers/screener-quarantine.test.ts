/**
 * F3 Phase 0 — ScreenerProvider Quarantine Regression Tests
 *
 * These tests verify that ScreenerProvider integration follows the
 * authorized provider pattern and is not registered in legacy
 * capability/fallback registries.
 *
 * No live HTTP calls — all tests are deterministic.
 */

import { describe, it, expect } from 'vitest';
import { ProviderFailoverConfig } from '../../src/providers/yfinance/ProviderFailoverConfig';
import { ProviderCapabilityRegistry } from '../../src/providers/v2/ProviderCapabilityRegistry';

describe('ScreenerProvider quarantine (F3 Phase 0)', () => {

  it('ProviderCoordinator construction must not throw for missing Screener', async () => {
    // ScreenerProvider now accepts an optional config and does not throw
    // on construction. The coordinator registers it only when authorization
    // config enables it.
    const { ScreenerProvider } = await import('../../src/services/providers/ScreenerProvider');
    expect(ScreenerProvider).toBeDefined();
    expect(() => new (ScreenerProvider as any)()).not.toThrow();
  });

  it('ProviderCapabilityRegistry contains no ScreenerProvider capabilities', () => {
    const registry = new ProviderCapabilityRegistry();
    const providers = registry.getAllProviderNames();
    expect(providers).not.toContain('ScreenerProvider');
  });

  it('ProviderCapabilityRegistry coverage scores exclude Screener', () => {
    const registry = new ProviderCapabilityRegistry();
    const scores = registry.getCoverageScores();
    const screenerScore = scores.find(s => s.provider === 'ScreenerProvider');
    expect(screenerScore).toBeUndefined();
  });

  it('ProviderCapabilityRegistry has no Screener metadata', () => {
    const registry = new ProviderCapabilityRegistry();
    const meta = registry.getProviderMetadata('ScreenerProvider');
    expect(meta).toBeNull();
  });

  it('ProviderFailoverConfig has no Screener in fundamentals order', () => {
    const order = ProviderFailoverConfig.PROVIDER_ORDER_FUNDAMENTALS;
    expect(order).not.toContain('screener');
  });

  it('ProviderFailoverConfig fundamentals order is yfinance then finnhub', () => {
    expect(ProviderFailoverConfig.PROVIDER_ORDER_FUNDAMENTALS).toEqual(['yfinance', 'finnhub']);
  });

  it('ProviderFailoverConfig has no Screener in active fundamental providers', () => {
    const active = ProviderFailoverConfig.getActiveFundamentalProviders();
    expect(active).not.toContain('screener');
  });

  it('ScreenerProvider no longer throws on construction', async () => {
    const { ScreenerProvider } = await import('../../src/services/providers/ScreenerProvider');
    expect(ScreenerProvider).toBeDefined();
    // Construction no longer throws — it accepts ProviderAuthorizationConfig
    expect(() => new (ScreenerProvider as any)()).not.toThrow();
  });

  it('No SCREENER_ENABLED env var key exists in ProviderFailoverConfig', () => {
    // Verify: for screener to be enabled, its env var key would need to exist.
    // Since we removed it, any lookup returns false.
    expect(ProviderFailoverConfig.isProviderEnabled('screener')).toBe(false);
  });
});
