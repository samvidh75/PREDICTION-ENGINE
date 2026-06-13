/**
 * F3.1A — ProviderRequestKey
 *
 * Normalizes provider request parameters into a stable key for deduplication,
 * caching, and ledger recording. The key:
 *   - Is deterministic: same inputs → same hash
 *   - Excludes secrets: strips tokens, api_key, key, secret, authorization
 *   - Sorts query parameters alphabetically so ordering doesn't create duplicates
 */

import crypto from 'node:crypto';
import type { ProviderOperation, RequestKey } from './types';

/** Parameter values that are always stripped from the key. */
const SECRET_KEYS = new Set(['token', 'api_key', 'apikey', 'key', 'secret', 'authorization', 'bearer', 'apiKey', 'access_token']);

/**
 * Build a stable, normalized request key.
 * Secrets are stripped before hashing.
 */
export function buildRequestKey(
  provider: string,
  operation: ProviderOperation,
  symbol: string,
  params?: Record<string, unknown>,
): RequestKey {
  // Normalize symbol
  const normalizedSymbol = symbol.trim().toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');

  // Build parameter hash from sorted, sanitized params
  const sanitized: Record<string, unknown> = {};
  if (params) {
    const keys = Object.keys(params).sort();
    for (const key of keys) {
      if (!SECRET_KEYS.has(key.toLowerCase().replace(/-/g, '_'))) {
        sanitized[key] = params[key];
      }
    }
  }

  const paramsHash = crypto.createHash('sha256').update(JSON.stringify(sanitized)).digest('hex').slice(0, 16);

  return {
    provider,
    operation,
    symbol: normalizedSymbol,
    paramsHash,
  };
}

/**
 * Serialize a RequestKey to a single string for map lookups.
 */
export function serializeRequestKey(key: RequestKey): string {
  return `${key.provider}:${key.operation}:${key.symbol}:${key.paramsHash}`;
}

/**
 * Extract the request key hash from a key (for ledger storage).
 */
export function requestKeyHash(key: RequestKey): string {
  const input = serializeRequestKey(key);
  return crypto.createHash('sha256').update(input).digest('hex');
}
