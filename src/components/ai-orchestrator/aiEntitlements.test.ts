/**
 * aiEntitlements.test — Unit tests for the AI entitlement policy layer.
 * =========================================================================
 */

import { describe, it, expect } from 'vitest';
import { resolveAiEntitlement, canAccessEnhancedAi, getAiEntitlementReason } from './aiEntitlements';
import type { ResolvedEntitlements } from '../../commercial/entitlementTypes';
import type { DeviceAiCapability } from './deviceAiCapability';

/* ── Helpers ──────────────────────────────────────────────────── */

const FREE_ENTITLEMENTS: ResolvedEntitlements = {
  tier: 'free',
  planId: 'plan_free',
  features: [
    'stock_health_basic',
    'factor_breakdown',
    'narrative',
    'basic_search',
  ],
  limits: { maxWatchlists: 1, maxAlerts: 0, maxPortfolioEntries: 0, searchDepthDays: 90 },
  isActive: true,
  expiresAt: null,
};

const PRO_ENTITLEMENTS: ResolvedEntitlements = {
  tier: 'pro',
  planId: 'plan_pro_299',
  features: [
    'stock_health_basic',
    'factor_breakdown',
    'narrative',
    'advanced_search',
    'unlimited_watchlists',
    'watchlist_alerts',
    'daily_digest_email',
    'prediction_accuracy_history',
    'expected_returns',
    'peer_comparison',
    'csv_export',
    'portfolio_tracking',
    'api_access',
    'priority_support',
    // AI features (cast — they exist at runtime via plans.ts extension)
    'ai_context_explanations' as any,
    'ai_research_chat' as any,
  ],
  limits: { maxWatchlists: Infinity, maxAlerts: Infinity, maxPortfolioEntries: Infinity, searchDepthDays: 1095 },
  isActive: true,
  expiresAt: null,
};

const CAPABLE_DEVICE: DeviceAiCapability = {
  canUseBrowserLocalAi: true,
  canUseWorker: true,
  reason: 'supported',
};

const UNSUPPORTED_DEVICE: DeviceAiCapability = {
  canUseBrowserLocalAi: false,
  canUseWorker: false,
  reason: 'no_webgpu',
};

/* ── Tests ────────────────────────────────────────────────────── */

describe('resolveAiEntitlement', () => {
  it('free tier → standard_only', () => {
    const result = resolveAiEntitlement(FREE_ENTITLEMENTS, CAPABLE_DEVICE);
    expect(result.level).toBe('standard_only');
    expect(result.tier).toBe('free');
    expect(result.check.granted).toBe(false);
  });

  it('pro tier → enhanced_allowed', () => {
    const result = resolveAiEntitlement(PRO_ENTITLEMENTS, CAPABLE_DEVICE);
    expect(result.level).toBe('enhanced_allowed');
    expect(result.tier).toBe('pro');
    expect(result.check.granted).toBe(true);
  });

  it('null entitlements → standard_only (free default)', () => {
    const result = resolveAiEntitlement(null, CAPABLE_DEVICE);
    expect(result.level).toBe('standard_only');
    expect(result.tier).toBe('free');
  });

  it('deviceCapable reflects unsupported device', () => {
    const result = resolveAiEntitlement(PRO_ENTITLEMENTS, UNSUPPORTED_DEVICE);
    expect(result.level).toBe('enhanced_allowed'); // entitled still
    expect(result.deviceCapable).toBe(false);      // but device can't
  });
});

describe('canAccessEnhancedAi', () => {
  it('free + capable device → false', () => {
    expect(canAccessEnhancedAi(FREE_ENTITLEMENTS, CAPABLE_DEVICE)).toBe(false);
  });

  it('pro + capable device → true', () => {
    expect(canAccessEnhancedAi(PRO_ENTITLEMENTS, CAPABLE_DEVICE)).toBe(true);
  });

  it('pro + unsupported device → false', () => {
    expect(canAccessEnhancedAi(PRO_ENTITLEMENTS, UNSUPPORTED_DEVICE)).toBe(false);
  });

  it('null entitlements + capable device → false', () => {
    expect(canAccessEnhancedAi(null, CAPABLE_DEVICE)).toBe(false);
  });
});

describe('getAiEntitlementReason', () => {
  it('enhanced_allowed with capable device → positive message', () => {
    const msg = getAiEntitlementReason('enhanced_allowed', true);
    expect(msg).not.toContain('not');
    expect(msg).toContain('Enhanced');
  });

  it('enhanced_allowed without capable device → device limitation', () => {
    const msg = getAiEntitlementReason('enhanced_allowed', false);
    expect(msg).toContain('not supported');
  });

  it('standard_only → upgrade message', () => {
    const msg = getAiEntitlementReason('standard_only', true);
    expect(msg).toContain('Standard');
    expect(msg).toContain('Upgrade');
  });
});
