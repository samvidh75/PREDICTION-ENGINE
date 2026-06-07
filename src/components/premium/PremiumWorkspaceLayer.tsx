import React, { useEffect } from "react";
import type { PremiumFeatureKey } from "../../services/premium/premiumFeatureGates";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";
import PremiumLockCard from "./PremiumLockCard";
import { usePremiumAccess, emitPremiumFeatureRendered } from "../../services/premium/usePremiumAccess";
import { usePremiumEntitlement } from "../../services/premium/usePremiumEntitlement";

type LockCardProps = {
  title: string;
  subtitle: string;
  previewLines: string[];
  accentGlow: string;
  ctaLabel?: string;
};

type Props = {
  featureKey: PremiumFeatureKey;
  lockWrapperClassName?: string;
  children: React.ReactNode;
  lockCard: LockCardProps;
  requiredTierOverride?: PremiumTier;
};

export default function PremiumWorkspaceLayer({
  featureKey,
  lockWrapperClassName,
  children,
  lockCard,
  requiredTierOverride,
}: Props): JSX.Element {
  const entitlement = usePremiumEntitlement();
  const { hasAccess, requiredTier } = usePremiumAccess(featureKey);

  const effectiveRequiredTier = requiredTierOverride ?? requiredTier;

  useEffect(() => {
    emitPremiumFeatureRendered(
      featureKey,
      hasAccess,
      effectiveRequiredTier,
      entitlement.tier,
    );
    // Monetisation observability:
    // - tier set/clear is emitted by PremiumTierSwitch / PremiumLockCard
    // - feature rendered/denied is emitted here
  }, [featureKey, hasAccess, effectiveRequiredTier, entitlement.tier]);

  if (hasAccess) return <>{children}</>;

  return (
    <div className={lockWrapperClassName}>
      <PremiumLockCard requiredTier={effectiveRequiredTier} {...lockCard} />
    </div>
  );
}
