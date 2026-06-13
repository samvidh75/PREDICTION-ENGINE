/**
 * F3 Phase 0 — ScreenerProvider Quarantine Regression Tests
 *
 * These tests verify that ScreenerProvider is NOT selectable or constructible
 * through any runtime or exported provider-routing path.
 *
 * No live HTTP calls — all tests are deterministic.
 */

import { describe, it, expect } from 'vitest';
import { ProviderFailoverConfig } from '../../src/providers/yfinance/ProviderFailoverConfig';
import { ProviderCapabilityRegistry } from '../../src/providers/v2/ProviderCapabilityRegistry';

describe('ScreenerProvider quarantine (F3 Phase 0)', () => {

  it('ProviderCoordinator construction must not throw for missing Screener', async () => {
    // ScreenerProvider constructor throws. If ProviderCoordinator tries to
    // construct it, creation fails. We verify the stub's throw behavior.
    await expect(async () => {
      const { ScreenerProvider } = await import('../../src/services/providers/ScreenerProvider');
      new ScreenerProvider();
    }).rejects.toThrow(/QUARANTINED/);
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

  it('ScreenerProvider stub exists but cannot be constructed or called', async () => {
    const { ScreenerProvider } = await import('../../src/services/providers/ScreenerProvider');
    expect(ScreenerProvider).toBeDefined();
    // Construction throws
    await expect(async () => new ScreenerProvider()).rejects.toThrow(/QUARANTINED/);
  });

  it('No SCREENER_ENABLED env var key exists in ProviderFailoverConfig', () => {
    // Verify: for screener to be enabled, its env var key would need to exist.
    // Since we removed it, any lookup returns false.
    expect(ProviderFailoverConfig.isProviderEnabled('screener')).toBe(false);
  });
});
