import { useMemo } from "react";
import { usePremiumEntitlement } from "./usePremiumEntitlement";
import type { PremiumEntitlement, PremiumTier } from "./premiumEntitlementStore";
import type { PremiumFeatureKey } from "./premiumFeatureGates";
import { canAccessPremiumFeature, getPremiumFeatureRequiredTier } from "./premiumFeatureGates";
import { emitMonetisationEvent } from "./monetisationObservability";

export type PremiumAccessResult = {
  hasAccess: boolean;
  requiredTier: PremiumTier;
};

export function usePremiumAccess(featureKey: PremiumFeatureKey): PremiumAccessResult {
  const entitlement = usePremiumEntitlement();

  const result = useMemo<PremiumAccessResult>(() => {
    const requiredTier = getPremiumFeatureRequiredTier(featureKey);
    const hasAccess = canAccessPremiumFeature(entitlement as PremiumEntitlement, featureKey);

    return { requiredTier, hasAccess };
  }, [entitlement, featureKey]);

  return result;
}

export function emitPremiumFeatureRendered(featureKey: PremiumFeatureKey, hasAccess: boolean, requiredTier: PremiumTier, currentTier: PremiumTier): void {
  emitMonetisationEvent({
    type: hasAccess ? "premium_feature_rendered" : "premium_feature_denied",
    ts: Date.now(),
    ctx: {
      featureKey,
      requiredTier,
      currentTier,
    },
  });
}
