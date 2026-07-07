// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Philippine symbol resolver
//
// Resolves any ticker-like input to a canonical PSESymbol entry
// using the symbol master store.  This is the server-side lookup layer.
// ─────────────────────────────────────────────────────────────────────────────

import type { PSESymbol } from './PSESymbol';
import { normalizeTicker } from './IndianSymbolNormalizer';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface SymbolResolutionResult {
  /** The resolved symbol entry, or `null` when no match found. */
  symbol: PSESymbol | null;

  /** Human-readable status message. */
  status: 'exact' | 'alias' | 'normalized' | 'not_found';

  /** The lookup key that was actually matched (e.g. 'RELIANCE'). */
  matchedKey: string;
}

// ---------------------------------------------------------------------------
// Resolver interface
// ---------------------------------------------------------------------------

/**
 * Contract for any Philippine symbol resolver implementation.
 *
 * The canonical implementation uses `IndianSymbolMasterStore`, but this
 * interface allows alternative backends (e.g. in-memory cache, test stub).
 */
export interface IndianSymbolResolver {
  /**
   * Resolve a raw ticker/alias to a canonical PSESymbol.
   *
   * Resolution priority:
   * 1. Exact match by canonicalSymbol
   * 2. Exact match by alias (including `.NS`/`.BO`/`-EQ` variants)
   * 3. Normalized lookup (strip suffix → retry 1 & 2)
   * 4. ISIN exact match
   * 5. PSE code exact match
   */
  resolve(raw: string): Promise<SymbolResolutionResult>;

  /**
   * Resolve by ISIN.  Returns `null` when no symbol has that ISIN.
   */
  resolveByIsin(isin: string): Promise<PSESymbol | null>;

  /**
   * Resolve by PSE scrip code (numeric string).
   */
  resolveByBseCode(code: string): Promise<PSESymbol | null>;

  /**
   * List all active symbols (listingStatus = 'active').
   */
  listActive(): Promise<PSESymbol[]>;
}

// ---------------------------------------------------------------------------
// Store-backed resolver
// ---------------------------------------------------------------------------

/**
 * Resolver backed by an `IndianSymbolMasterStore` instance.
 */
export class StoreBackedSymbolResolver implements IndianSymbolResolver {
  constructor(private readonly store: IndianSymbolMasterStoreLike) {}

  async resolve(raw: string): Promise<SymbolResolutionResult> {
    const trimmed = raw.trim();

    // 1. Exact match by canonicalSymbol
    const direct = await this.store.findBySymbol(trimmed);
    if (direct) return { symbol: direct, status: 'exact', matchedKey: trimmed };

    // 2. Exact match by alias
    const byAlias = await this.store.findByAlias(trimmed);
    if (byAlias) return { symbol: byAlias, status: 'alias', matchedKey: trimmed };

    // 3. Normalized lookup
    const normalized = normalizeTicker(trimmed);
    if (normalized !== trimmed) {
      const byNormalizedSymbol = await this.store.findBySymbol(normalized);
      if (byNormalizedSymbol) return { symbol: byNormalizedSymbol, status: 'normalized', matchedKey: normalized };

      const byNormalizedAlias = await this.store.findByAlias(normalized);
      if (byNormalizedAlias) return { symbol: byNormalizedAlias, status: 'normalized', matchedKey: normalized };
    }

    // 4. ISIN match
    if (/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(trimmed)) {
      const byIsin = await this.store.findByIsin(trimmed);
      if (byIsin) return { symbol: byIsin, status: 'alias', matchedKey: trimmed };
    }

    // 5. PSE code match
    if (/^\d{4,8}$/.test(trimmed)) {
      const byBse = await this.store.findByBseCode(trimmed);
      if (byBse) return { symbol: byBse, status: 'alias', matchedKey: trimmed };
    }

    return { symbol: null, status: 'not_found', matchedKey: normalized };
  }

  async resolveByIsin(isin: string): Promise<PSESymbol | null> {
    return this.store.findByIsin(isin);
  }

  async resolveByBseCode(code: string): Promise<PSESymbol | null> {
    return this.store.findByBseCode(code);
  }

  async listActive(): Promise<PSESymbol[]> {
    return this.store.listActive();
  }
}

/**
 * Minimal store interface that the resolver depends on.
 * Decouples resolver from the actual store implementation.
 */
export interface IndianSymbolMasterStoreLike {
  findBySymbol(symbol: string): Promise<PSESymbol | null>;
  findByAlias(alias: string): Promise<PSESymbol | null>;
  findByIsin(isin: string): Promise<PSESymbol | null>;
  findByBseCode(code: string): Promise<PSESymbol | null>;
  listActive(): Promise<PSESymbol[]>;
}
