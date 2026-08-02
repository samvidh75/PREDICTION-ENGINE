/**
 * useAiEntitlement — React hook for AI feature access from the user's perspective.
 *
 * Combines the commercial useEntitlements() with device capability detection
 * to expose a simple interface for AI features.
 *
 * Usage:
 *   const { level, canAccessEnhanced, reason, deviceCapable } = useAiEntitlement();
 *   if (canAccessEnhanced) { /* show enhanced UI *\/ }
 * =========================================================================
 */

import { useMemo } from 'react';
import { useEntitlements } from '../../commercial/useEntitlements';
import { detectDeviceAiCapability } from './deviceAiCapability';
import { resolveAiEntitlement, canAccessEnhancedAi, getAiEntitlementReason, AI_RESEARCH_CHAT } from './aiEntitlements';
import type { AiEntitlementLevel } from './aiEntitlements';
import type { FeatureKey } from '../../commercial/plans';

export interface UseAiEntitlementResult {
  /** Resolved access level */
  level: AiEntitlementLevel;
  /** Convenience boolean — true if enhanced AI can be used right now */
  canAccessEnhanced: boolean;
  /** Whether the device supports enhanced AI runtimes */
  deviceCapable: boolean;
  /** The user's current plan tier */
  tier: 'free' | 'plus' | 'pro';
  /** Human-readable reason for current AI access level */
  reason: string;
  /** Whether entitlements have finished loading */
  loaded: boolean;
}

/**
 * Hook that encapsulates AI entitlement logic.
 *
 * @param feature Optional feature key override (default AI_RESEARCH_CHAT)
 */
export function useAiEntitlement(
  feature: FeatureKey = AI_RESEARCH_CHAT,
): UseAiEntitlementResult {
  const { entitlements, loaded } = useEntitlements();
  const device = useMemo(() => detectDeviceAiCapability(), []);

  const result = useMemo(
    () => resolveAiEntitlement(entitlements, device, feature),
    [entitlements, device, feature],
  );

  const canAccess = useMemo(
    () => canAccessEnhancedAi(entitlements, device, feature),
    [entitlements, device, feature],
  );

  const reason = useMemo(
    () => getAiEntitlementReason(result.level, device.canUseBrowserLocalAi || device.canUseWorker),
    [result.level, device],
  );

  return {
    level: result.level,
    canAccessEnhanced: canAccess,
    deviceCapable: device.canUseBrowserLocalAi || device.canUseWorker,
    tier: result.tier,
    reason,
    loaded,
  };
}
