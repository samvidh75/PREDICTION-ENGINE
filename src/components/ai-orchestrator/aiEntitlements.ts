/**
 * aiEntitlements — AI feature entitlement policy for StockStory India.
 *
 * Wraps/complements the commercial entitlement system (useEntitlements)
 * with AI-specific checks.  Uses FeatureGate keys from plans.ts to gate
 * enhanced AI explanations; deterministic fallback is always free.
 *
 * ─── Design decisions ───────────────────────────────────────────────
 * 1. Standard/deterministic explanations are always available → no user
 *    data or backend cost.
 * 2. "Enhanced" AI explanations (browser-edge, user-local, server-local)
 *    require the user's plan to include the ai_research feature key.
 * 3. No fake paid state, no fake subscription — resolve(null) → free.
 * 4. Device capability is a separate dimension: even if entitled, the
 *    device must support the runtime.
 * =========================================================================
 */

import type { FeatureKey, PlanTier } from '../../commercial/plans';
import type { EntitlementCheck } from '../../commercial/entitlementTypes';
import { EntitlementService } from '../../commercial/EntitlementService';
import type { DeviceAiCapability } from './deviceAiCapability';

// ─── AI Feature Keys ────────────────────────────────────────────────
// Must be added to plans.ts / FeatureKey if they aren't already there.
// If the union doesn't include these yet, use the string literal directly
// until the type is updated.

/** AI research explanation on stock / scanner / compare surfaces */
export const AI_CONTEXT_EXPLANATIONS: FeatureKey = 'ai_context_explanations' as FeatureKey;
/** AI research chat (multi-turn Q&A) */
export const AI_RESEARCH_CHAT: FeatureKey = 'ai_research_chat' as FeatureKey;

// ─── AI Entitlement Status ──────────────────────────────────────────

export type AiEntitlementLevel =
  | 'standard_only'    // Access to deterministic fallback only
  | 'enhanced_allowed' // Access to enhanced AI (if device supports it)
  ;

export interface AiEntitlement {
  /** Resolved access level for AI features */
  level: AiEntitlementLevel;
  /** The plan tier (free / plus / pro) */
  tier: PlanTier;
  /** Whether the module / device can actually run the enhanced runtime */
  deviceCapable: boolean;
  /** The raw EntitlementCheck for the specific AI feature */
  check: EntitlementCheck;
}

// ─── Service ────────────────────────────────────────────────────────

const entitlementService = new EntitlementService();

/**
 * Resolve the user's AI entitlement level.
 *
 * Always returns standard_only for free-tier users, enhanced_allowed for
 * plus / pro when the feature key is included in their plan.
 *
 * @param entitlements  Resolved entitlements (null → free)
 * @param device        Device capability state
 * @param feature       Which AI feature to check
 */
export function resolveAiEntitlement(
  entitlements: Parameters<typeof entitlementService.check>[0],
  device: DeviceAiCapability,
  feature: FeatureKey = AI_RESEARCH_CHAT,
): AiEntitlement {
  const check = entitlementService.check(entitlements, feature);

  return {
    level: check.granted ? 'enhanced_allowed' : 'standard_only',
    tier: (entitlements ?? entitlementService.resolve(null)).tier,
    deviceCapable: device.canUseBrowserLocalAi || device.canUseWorker,
    check,
  };
}

/**
 * Quick check — can the user access enhanced AI right now?
 * Combines entitlement check + device capability.
 */
export function canAccessEnhancedAi(
  entitlements: Parameters<typeof entitlementService.check>[0],
  device: DeviceAiCapability,
  feature: FeatureKey = AI_RESEARCH_CHAT,
): boolean {
  const check = entitlementService.check(entitlements, feature);
  return check.granted && (device.canUseBrowserLocalAi || device.canUseWorker);
}

/**
 * Human-readable explanation of why AI is limited.
 * Safe for public-facing UI — no recommendation language.
 */
export function getAiEntitlementReason(
  level: AiEntitlementLevel,
  deviceCapable: boolean,
): string {
  if (level === 'enhanced_allowed' && !deviceCapable) {
    return 'Enhanced AI is not supported on this device. Standard research context is always available.';
  }
  if (level === 'standard_only') {
    return 'Standard research context is always available. Upgrade your plan for enhanced AI explanations.';
  }
  return 'Enhanced AI is available on your plan.';
}
