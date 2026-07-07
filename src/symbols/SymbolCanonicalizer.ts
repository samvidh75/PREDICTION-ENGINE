/**
 * TRACK-95R — Symbol Canonicalisation
 * One company = one symbol. Eliminates .NS / .BSE / exchange suffix fragmentation.
 * Used by ALL intelligence engines for both read and write paths.
 */

/**
 * Canonicalize any symbol to its base ticker form.
 * Rules:
 * - Trim whitespace
 * - Uppercase
 * - Strip .NS, .BSE, .NSE, .BO exchange suffixes
 * - Keep the base NSE ticker
 */
export function canonicalizeSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') return '';
  return symbol
    .trim()
    .toUpperCase()
    .replace(/\.(NS|BSE|NSE)$/i, '');
}

/**
 * Check if two symbols refer to the same canonical company.
 */
export function areSameSymbol(a: string, b: string): boolean {
  return canonicalizeSymbol(a) === canonicalizeSymbol(b);
}

/**
 * Deduplicate an array of symbols, keeping canonical form only.
 */
export function deduplicateSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of symbols) {
    const canonical = canonicalizeSymbol(s);
    if (!seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}

/**
 * Map from canonical to all variants found.
 */
export function groupByCanonical(symbols: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const s of symbols) {
    const canonical = canonicalizeSymbol(s);
    const existing = map.get(canonical) || [];
    existing.push(s);
    map.set(canonical, existing);
  }
  return map;
}

export default canonicalizeSymbol;
