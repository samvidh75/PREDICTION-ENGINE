import type { PremiumEntitlement, PremiumTier } from "./premiumEntitlementStore";

export type PremiumFeatureKey =
  | "healthometer_category_lens"
  | "institutional_activity_layer"
  | "premium_advanced_intelligence_feed"
  | "healthometer_advanced_breakdowns"
  | "company_superpage_deep_analytics"
  | "advanced_comparison_workspace"
  | "premium_dashboard_intelligence_modules"
  | "historical_analytics_timeline_expansion"
  | "advanced_discovery_sector_exploration";

type FeatureGate = {
  requiredTier: PremiumTier;
};

const FEATURE_GATES: Record<PremiumFeatureKey, FeatureGate> = {
  // Existing gates
  healthometer_category_lens: { requiredTier: "premium" },
  institutional_activity_layer: { requiredTier: "institutional" },
  premium_advanced_intelligence_feed: { requiredTier: "premium" },

  // New gates (depth surfaces)
  healthometer_advanced_breakdowns: { requiredTier: "premium" },
  company_superpage_deep_analytics: { requiredTier: "premium" },
  advanced_comparison_workspace: { requiredTier: "premium" },
  premium_dashboard_intelligence_modules: { requiredTier: "premium" },
  historical_analytics_timeline_expansion: { requiredTier: "premium" },
  advanced_discovery_sector_exploration: { requiredTier: "premium" },
};

export function getPremiumFeatureRequiredTier(featureKey: PremiumFeatureKey): PremiumTier {
  return FEATURE_GATES[featureKey]!.requiredTier;
}

export function canAccessPremiumFeature(entitlement: PremiumEntitlement, featureKey: PremiumFeatureKey): boolean {
  const requiredTier = getPremiumFeatureRequiredTier(featureKey);

  if (requiredTier === "free") return true;
  if (requiredTier === "premium") return entitlement.hasPremium;
  return entitlement.hasInstitutional;
}
