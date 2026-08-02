/**
 * commercial/FeatureGate — Wraps children that require a specific feature.
 *
 * If the user's entitlements grant the feature, children render.
 * Otherwise, a fallback (UpgradePrompt or custom) is shown.
 *
 * Usage:
 *   <FeatureGate feature="peer_comparison">
 *     <PeerComparisonTable />
 *   </FeatureGate>
 */

import type { ReactNode } from "react";
import { useEntitlements } from "./useEntitlements";
import { UpgradePrompt } from "./UpgradePrompt";
import type { FeatureKey } from "./plans";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Override the default upgrade prompt */
  fallback?: ReactNode;
  /** Don't render anything if not granted (hide completely) */
  silent?: boolean;
}

export function FeatureGate({ feature, children, fallback, silent }: FeatureGateProps) {
  const { check, loaded } = useEntitlements();
  const result = check(feature);

  if (!loaded) return null;
  if (result.granted) return <>{children}</>;
  if (silent) return null;
  if (fallback) return <>{fallback}</>;

  return <UpgradePrompt feature={feature} requiredTier={result.requiredTier} />;
}
