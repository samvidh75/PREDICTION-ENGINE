/**
 * Engine Version
 *
 * Version tracking for the intelligence engine.
 * Changing any version invalidates affected cached outputs.
 * Old snapshots remain readable but are regenerated on access.
 *
 * Increment:
 * - ENGINE_VERSION: When engine scoring logic changes materially
 * - PROMPT_VERSION: When any prompt template changes
 * - SCORING_VERSION: When scoring utility functions change
 * - RESEARCH_SCHEMA_VERSION: When research output schemas change
 */

export const ENGINE_VERSION = '1.0.0';
export const PROMPT_VERSION = '1.0.0';
export const SCORING_VERSION = '1.0.0';
export const RESEARCH_SCHEMA_VERSION = '1.0.0';

/**
 * Build a cache key for research output.
 * Changing any version here invalidates the cache.
 */
export function buildResearchCacheKey(symbol: string, inputHash: string): string {
  return [
    'research',
    symbol.toUpperCase(),
    inputHash,
    ENGINE_VERSION,
    PROMPT_VERSION,
    SCORING_VERSION,
    RESEARCH_SCHEMA_VERSION,
  ].join(':');
}

/**
 * Returns true if a cached result from `cachedAt` should be considered stale
 * based on version changes. In practice, version changes mean the cache key
 * won't match, but this provides an explicit check.
 */
export function isCacheStale(
  cachedEngineVersion: string,
  cachedPromptVersion: string,
  cachedScoringVersion: string,
  cachedSchemaVersion: string,
): boolean {
  return (
    cachedEngineVersion !== ENGINE_VERSION ||
    cachedPromptVersion !== PROMPT_VERSION ||
    cachedScoringVersion !== SCORING_VERSION ||
    cachedSchemaVersion !== RESEARCH_SCHEMA_VERSION
  );
}
