/**
 * TRACK-95R — Symbol Normalizer
 * 
 * Normalizes all symbol representations to a single canonical form.
 * Eliminates .NS, .BO, NSE:/BSE: prefixes.
 * 
 * Examples:
 *   INFY.NS → INFY
 *   HDFCBANK.NS → HDFCBANK
 *   NSE:RELIANCE → RELIANCE
 *   BSE:TCS → TCS
 *   tcs.ns → TCS
 */
export function normalize(symbol: string): string {
  if (!symbol || typeof symbol !== "string") return "";

  let normalized = symbol.trim().toUpperCase();

  // Strip NSE:/BSE: prefixes
  normalized = normalized.replace(/^(NSE|BSE):/i, "");

  // Strip exchange suffixes
  normalized = normalized.replace(/\.(NS|BO|NSE|BSE)$/i, "");

  return normalized;
}

/**
 * Detect if a symbol is already in normalized form.
 */
export function isNormalized(symbol: string): boolean {
  return symbol === normalize(symbol);
}

/**
 * Get all possible variants of a symbol (for migration lookups).
 */
export function getVariants(symbol: string): string[] {
  const base = normalize(symbol);
  return [base, `${base}.NS`, `${base}.BO`, `NSE:${base}`, `BSE:${base}`];
}

/**
 * Batch normalize an array of symbols, deduplicating.
 */
export function normalizeBatch(symbols: string[]): string[] {
  return [...new Set(symbols.map(normalize).filter(Boolean))].sort();
}
