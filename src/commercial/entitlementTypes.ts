/**
 * commercial/entitlementTypes — Runtime types for the entitlement system.
 *
 * An entitlement represents a user's current subscription state.
 * The EntitlementService checks whether a user can access a feature,
 * and the EntitlementStore caches the resolved state on the frontend.
 */

import type { FeatureKey, PlanTier } from './plans';

// ─── User Subscription State ────────────────────────────────────────

export interface UserSubscription {
  /** Firebase UID */
  userId: string;
  /** Plan identifier (e.g. "plan_free", "plan_pro_299") */
  planId: string;
  tier: PlanTier;
  /** Current status */
  status: 'active' | 'trial' | 'cancelled' | 'expired' | 'past_due';
  /** Epoch ms */
  startedAt: number;
  /** Epoch ms, null if never expires (free) */
  expiresAt: number | null;
  autoRenew: boolean;
  /** Payment provider subscription ID, if any */
  providerSubId?: string;
  /** Provider name: 'razorpay' | 'stripe' | null */
  provider?: string;
}

// ─── Resolved Entitlements ──────────────────────────────────────────

export interface ResolvedEntitlements {
  tier: PlanTier;
  planId: string;
  features: FeatureKey[];
  /** Per-feature overrides / limits */
  limits: {
    maxWatchlists: number;
    maxAlerts: number;
    maxPortfolioEntries: number;
    searchDepthDays: number;
  };
  /** Whether the subscription is in good standing */
  isActive: boolean;
  /** Epoch ms */
  expiresAt: number | null;
}

// ─── Entitlement Check Result ───────────────────────────────────────

export interface EntitlementCheck {
  granted: boolean;
  feature: FeatureKey;
  planTier: PlanTier;
  /** If denied, the tier that would unlock this feature */
  requiredTier?: PlanTier;
  /** Human-readable reason */
  reason: string;
}

// ─── Frontend Store State ───────────────────────────────────────────

export interface EntitlementStoreState {
  loaded: boolean;
  loading: boolean;
  subscription: UserSubscription | null;
  entitlements: ResolvedEntitlements | null;
  error: string | null;
}
