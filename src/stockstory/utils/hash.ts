/**
 * Stable hash function
 *
 * Deterministic string hashing for evidence IDs, checksums, etc.
 * No crypto dependency — safe for both Node.js and browser bundles.
 */

export function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
