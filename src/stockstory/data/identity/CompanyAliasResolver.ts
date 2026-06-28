/**
 * CompanyAliasResolver — resolves alternative identifiers to the canonical
 * NSE symbol, and manages known alias mappings.
 *
 * Rules:
 *  - Does NOT merge unrelated companies.
 *  - Alias → canonical mapping must be explicitly registered or derived from
 *    source-provided data.
 *  - Unknown aliases return null (safe failure).
 */

import { normalizeSymbol, isValidSymbol } from "../universe/SymbolNormalizer.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AliasEntry {
  /** The alias value (e.g. "RELIANCE.NS", "500325", "INE002A01018"). */
  value: string;

  /** The canonical NSE symbol this alias points to. */
  canonicalSymbol: string;

  /** What kind of alias this is. */
  kind: "nse_suffix" | "bse_code" | "isin" | "previous_symbol" | "short_name" | "custom";

  /** Source of this alias mapping. */
  source: string;

  /** When the mapping was last confirmed. */
  lastConfirmedAt: string;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export class CompanyAliasResolver {
  /** Internal mapping from alias value → canonical symbol. */
  private aliasMap = new Map<string, string>();

  /** Registered alias entries for inspection. */
  private entries: AliasEntry[] = [];

  // -------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------

  /**
   * Register a known alias.
   * Throws if the alias would merge two previously distinct symbols.
   */
  register(entry: AliasEntry): void {
    const existing = this.aliasMap.get(entry.value);
    if (existing && existing !== entry.canonicalSymbol) {
      throw new Error(
        `Alias conflict: "${entry.value}" already maps to "${existing}", cannot remap to "${entry.canonicalSymbol}"`,
      );
    }
    this.aliasMap.set(entry.value, entry.canonicalSymbol);
    this.entries.push(entry);
  }

  /**
   * Register multiple aliases at once.
   */
  registerBatch(entries: AliasEntry[]): void {
    for (const e of entries) this.register(e);
  }

  // -------------------------------------------------------------------
  // Resolution
  // -------------------------------------------------------------------

  /**
   * Resolve an alias (or raw symbol) to its canonical NSE symbol.
   * Returns null if unresolvable.
   */
  toCanonical(input: string): string | null {
    // 1. Direct alias lookup
    const direct = this.aliasMap.get(input);
    if (direct) return direct;

    // 2. Normalise as a symbol and check again
    const normalised = normalizeSymbol(input);
    if (normalised !== input) {
      const fromNormalised = this.aliasMap.get(normalised);
      if (fromNormalised) return fromNormalised;
    }

    // 3. If the normalised form itself looks like a valid NSE symbol, use it
    if (isValidSymbol(normalised)) {
      return normalised;
    }

    return null;
  }

  /**
   * List all registered aliases for a given canonical symbol.
   */
  listAliases(canonicalSymbol: string): AliasEntry[] {
    return this.entries.filter((e) => e.canonicalSymbol === canonicalSymbol);
  }

  /**
   * Number of registered alias entries.
   */
  get size(): number {
    return this.entries.length;
  }
}
