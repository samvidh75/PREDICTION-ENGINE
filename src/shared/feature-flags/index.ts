/**
 * feature-flags/index.ts
 *
 * Central runtime interface for all feature flags.
 * Import from here instead of reading process.env directly.
 *
 * Usage:
 *   import { isEnabled, FLAGS } from "src/shared/feature-flags";
 *
 *   if (isEnabled(FLAGS.unifiedPredictionEngine)) { ... }
 *   if (isEnabled(FLAGS.yfinance)) { ... }
 */

import type { FeatureFlagDef, FeatureFlagSource } from "./types";
export { FLAGS } from "./flags";
export type { FeatureFlagDef, FeatureFlagSource };

/**
 * Check whether a feature flag is enabled.
 *
 * @param flag - The flag definition from FLAGS
 * @param source - Optional env override (defaults to process.env)
 */
export function isEnabled(
  flag: FeatureFlagDef,
  source: FeatureFlagSource = process.env,
): boolean {
  const raw = source[flag.envVar];
  if (raw === undefined || raw === "") return flag.defaultValue;
  return raw === "true" || raw === "1";
}

/**
 * Get the raw env value of a feature flag (for debugging / logging).
 */
export function getRawValue(
  flag: FeatureFlagDef,
  source: FeatureFlagSource = process.env,
): string | undefined {
  return source[flag.envVar];
}

/**
 * Get all feature flags with their current runtime values.
 */
export function getAllFlags(
  source: FeatureFlagSource = process.env,
): Record<string, boolean> {
  const { FLAGS } = require("./flags");
  const result: Record<string, boolean> = {};
  for (const [, flag] of Object.entries(FLAGS)) {
    result[(flag as FeatureFlagDef).key] = isEnabled(flag as FeatureFlagDef, source);
  }
  return result;
}

/**
 * Create a flag checker bound to a specific source (e.g., for testing).
 */
export function createChecker(source: FeatureFlagSource) {
  return {
    isEnabled: (flag: FeatureFlagDef) => isEnabled(flag, source),
    getAll: () => getAllFlags(source),
  };
}
