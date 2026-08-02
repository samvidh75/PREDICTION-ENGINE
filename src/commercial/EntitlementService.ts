/**
 * EntitlementService — Runtime feature gating for Lensory.
 *
 * Checks whether a given user (by their resolved subscription) may
 * access a FeatureKey.  This is the single source of truth for all
 * feature gates in the app.
 *
 * Usage:
 *   const svc = new EntitlementService();
 *   const check = svc.check(userEntitlements, 'peer_comparison');
 *   if (!check.granted) → show UpgradePrompt
 */

import type { FeatureKey, Plan, PlanTier } from './plans';
import { getAllPlans, getDefaultPlan } from './plans';
import type {
  ResolvedEntitlements,
  UserSubscription,
  EntitlementCheck,
} from './entitlementTypes';

// ─── Upgrade Map ───────────────────────────────────────────────────
// For each feature, which tier is the minimum required?

function buildUpgradeMap(): Map<FeatureKey, PlanTier> {
  const map = new Map<FeatureKey, PlanTier>();
  const allPlans = getAllPlans();

  for (const feature of allKnownFeatures()) {
    let requiredTier: PlanTier = 'free';

    for (const plan of allPlans) {
      if (plan.features.includes(feature)) {
        requiredTier = plan.tier;
        break;
      }
    }

    // Non-free → record the first (cheapest) tier that grants it
    map.set(feature, requiredTier);
  }

  return map;
}

/** Gather every FeatureKey across all plans. */
function allKnownFeatures(): FeatureKey[] {
  const seen = new Set<FeatureKey>();
  for (const plan of getAllPlans()) {
    for (const f of plan.features) {
      seen.add(f);
    }
  }
  return Array.from(seen);
}

const upgradeMap = buildUpgradeMap();

// ─── Service ────────────────────────────────────────────────────────

export class EntitlementService {
  /**
   * Check whether the resolved entitlements grant access to `feature`.
   */
  check(
    entitlements: ResolvedEntitlements | null,
    feature: FeatureKey,
  ): EntitlementCheck {
    // No entitlements → only free-tier features
    const effective = entitlements ?? this.resolve(null);
    const granted = effective.features.includes(feature);
    const requiredTier = upgradeMap.get(feature);

    return {
      granted,
      feature,
      planTier: effective.tier,
      requiredTier: !granted ? requiredTier : undefined,
      reason: granted
        ? `Feature ${feature} is available on ${effective.tier} plan.`
        : `Feature ${feature} requires ${requiredTier ?? 'a paid'} plan.`,
    };
  }

  /**
   * Resolve user subscription data into ResolvedEntitlements.
   * If `sub` is null the user is treated as free tier.
   */
  resolve(sub: UserSubscription | null): ResolvedEntitlements {
    if (!sub || sub.status === 'expired') {
      const def = getDefaultPlan();
      return {
        tier: 'free',
        planId: def.id,
        features: [...def.features],
        limits: { ...def.limits },
        isActive: true,
        expiresAt: null,
      };
    }

    const plan = getAllPlans().find((p) => p.id === sub.planId) ?? getDefaultPlan();

    const isActive = sub.status === 'active' || sub.status === 'trial';

    return {
      tier: plan.tier,
      planId: plan.id,
      features: isActive ? [...plan.features] : [...getDefaultPlan().features],
      limits: isActive ? { ...plan.limits } : { ...getDefaultPlan().limits },
      isActive,
      expiresAt: sub.expiresAt,
    };
  }

  /**
   * Return true if the user is within their plan's limit for a resource.
   */
  withinLimit(
    entitlements: ResolvedEntitlements | null,
    resource: 'watchlists' | 'alerts' | 'portfolio_entries',
    current: number,
  ): boolean {
    const lim = (entitlements ?? this.resolve(null)).limits;
    switch (resource) {
      case 'watchlists':
        return current < lim.maxWatchlists;
      case 'alerts':
        return current < lim.maxAlerts;
      case 'portfolio_entries':
        return current < lim.maxPortfolioEntries;
    }
  }
}

/** Singleton for convenience */
export const entitlementService = new EntitlementService();
