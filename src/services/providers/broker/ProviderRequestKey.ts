/**
 * F3.1A — ProviderRequestKey
 *
 * Normalizes provider request parameters into a stable key for deduplication,
 * caching, and ledger recording. The key:
 *   - Is deterministic: same inputs → same hash
 *   - Excludes secrets recursively: strips tokens, api_key, key, secret, authorization
 *   - Sorts parameter keys recursively so ordering doesn't create duplicates
 */

import crypto from 'node:crypto';
import type { ProviderOperation, RequestKey } from './types';

/** Parameter values that are always stripped from the key. */
const SECRET_KEYS = new Set(['token', 'api_key', 'apikey', 'key', 'secret', 'authorization', 'bearer', 'access_token']);

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
  const canonicalKeyMaterial = buildRequestKeyDebugMaterial(provider, operation, symbol, params);
  const paramsHash = sha256(JSON.stringify(canonicalKeyMaterial)).slice(0, 16);

  return {
    provider: canonicalKeyMaterial.provider,
    operation: canonicalKeyMaterial.operation,
    symbol: canonicalKeyMaterial.symbol,
    paramsHash,
  };
}

export function buildRequestKeyDebugMaterial(
  provider: string,
  operation: ProviderOperation,
  symbol: string,
  params?: Record<string, unknown>,
): { provider: string; operation: ProviderOperation; symbol: string; params: unknown } {
  return {
    provider: provider.trim().toLowerCase(),
    operation: operation.trim().toLowerCase() as ProviderOperation,
    symbol: symbol.trim().toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, ''),
    params: canonicalize(params ?? {}),
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
  return sha256(input);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => canonicalize(item));
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    for (const key of Object.keys(source).sort()) {
      if (isSecretKey(key)) continue;
      normalized[key] = canonicalize(source[key]);
    }

    return normalized;
  }

  return value;
}

function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key.trim().toLowerCase().replace(/-/g, '_'));
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
