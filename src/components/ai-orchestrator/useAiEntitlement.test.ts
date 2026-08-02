/**
 * useAiEntitlement.test — Tests for the AI entitlement hook.
 * =========================================================================
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAiEntitlement } from './useAiEntitlement';

/* Mock the commercial hook and device detection */
vi.mock('../../commercial/useEntitlements', () => ({
  useEntitlements: vi.fn(),
}));

vi.mock('./deviceAiCapability', () => ({
  detectDeviceAiCapability: vi.fn(),
}));

import { useEntitlements } from '../../commercial/useEntitlements';
import { detectDeviceAiCapability } from './deviceAiCapability';

describe('useAiEntitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('free tier + capable device → standard_only, cannot access enhanced', () => {
    (useEntitlements as any).mockReturnValue({
      entitlements: null,
      loaded: true,
    });
    (detectDeviceAiCapability as any).mockReturnValue({
      canUseBrowserLocalAi: true,
      canUseWorker: true,
      reason: 'supported',
    });

    const { result } = renderHook(() => useAiEntitlement());
    expect(result.current.level).toBe('standard_only');
    expect(result.current.canAccessEnhanced).toBe(false);
    expect(result.current.deviceCapable).toBe(true);
    expect(result.current.tier).toBe('free');
    expect(result.current.loaded).toBe(true);
  });

  it('pro tier + capable device → enhanced_allowed, can access enhanced', () => {
    (useEntitlements as any).mockReturnValue({
      entitlements: {
        tier: 'pro',
        planId: 'plan_pro_299',
        features: [
          'stock_health_basic', 'factor_breakdown', 'narrative',
          'advanced_search', 'unlimited_watchlists', 'watchlist_alerts',
          'daily_digest_email', 'prediction_accuracy_history',
          'expected_returns', 'peer_comparison', 'csv_export',
          'portfolio_tracking', 'api_access', 'priority_support',
          'ai_research_chat',
        ],
        limits: { maxWatchlists: Infinity, maxAlerts: Infinity, maxPortfolioEntries: Infinity, searchDepthDays: 1095 },
        isActive: true,
        expiresAt: null,
      },
      loaded: true,
    });
    (detectDeviceAiCapability as any).mockReturnValue({
      canUseBrowserLocalAi: true,
      canUseWorker: true,
      reason: 'supported',
    });

    const { result } = renderHook(() => useAiEntitlement());
    expect(result.current.level).toBe('enhanced_allowed');
    expect(result.current.canAccessEnhanced).toBe(true);
    expect(result.current.tier).toBe('pro');
  });

  it('pro tier + unsupported device → enhanced_allowed but cannot access (device limit)', () => {
    (useEntitlements as any).mockReturnValue({
      entitlements: {
        tier: 'pro',
        planId: 'plan_pro_299',
        features: ['ai_research_chat'] as any,
        limits: { maxWatchlists: Infinity, maxAlerts: Infinity, maxPortfolioEntries: Infinity, searchDepthDays: 1095 },
        isActive: true,
        expiresAt: null,
      },
      loaded: true,
    });
    (detectDeviceAiCapability as any).mockReturnValue({
      canUseBrowserLocalAi: false,
      canUseWorker: false,
      reason: 'no_webgpu',
    });

    const { result } = renderHook(() => useAiEntitlement());
    expect(result.current.level).toBe('enhanced_allowed');
    expect(result.current.canAccessEnhanced).toBe(false);
    expect(result.current.deviceCapable).toBe(false);
  });

  it('not loaded yet → returns defaults', () => {
    (useEntitlements as any).mockReturnValue({
      entitlements: null,
      loaded: false,
    });
    (detectDeviceAiCapability as any).mockReturnValue({
      canUseBrowserLocalAi: true,
      canUseWorker: true,
      reason: 'supported',
    });

    const { result } = renderHook(() => useAiEntitlement());
    expect(result.current.loaded).toBe(false);
    expect(result.current.canAccessEnhanced).toBe(false);
  });
});
