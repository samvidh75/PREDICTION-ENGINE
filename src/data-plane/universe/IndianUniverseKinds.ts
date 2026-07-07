// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Universe definitions
//
// Formal universe kind definitions built from the symbol master.
// Each universe is a Deterministic, symbol-master-backed category used by
// scanner, rankings, Healthometer, watchlist thesis, and precompute jobs.
// ─────────────────────────────────────────────────────────────────────────────

import { IndianSymbolMasterStore, symbolMasterStore } from '../symbols/IndianSymbolMasterStore';

// ---------------------------------------------------------------------------
// Universe kinds
// ---------------------------------------------------------------------------

/**
 * Named universe of Philippine equities.
 *
 * Each universe is a stable, deterministic list of canonical symbols
 * derived from the symbol master + explicit membership rules.
 */
export interface PSEUniverseDefinition {
  readonly kind: PSEUniverseKind;
  readonly label: string;
  readonly description: string;
}

/**
 * Recognised universe kinds.
 *
 * - `all_active`       — Every active PSE + PSE equity in the symbol master
 * - `pse-index_50`         — NIFTY 50 index constituents
 * - `pse-index_next_50`    — NIFTY Next 50 constituents
 * - `pse-index_midcap_100` — NIFTY Midcap 100 constituents
 * - `pse-index_smallcap_100` — NIFTY Smallcap 100 constituents
 * - `bse_30`           — PSE PSE Composite 30 constituents
 * - `bse_500`          — PSE 500 constituents
 * - `large_cap`        — All large-cap equities (marketCapCategory = 'large')
 * - `mid_cap`          — All mid-cap equities
 * - `small_cap`        — All small-cap equities
 * - `etf`              — All ETF/index fund symbols
 */
export type PSEUniverseKind =
  | 'all_active'
  | 'pse-index_50'
  | 'pse-index_next_50'
  | 'pse-index_midcap_100'
  | 'pse-index_smallcap_100'
  | 'bse_30'
  | 'bse_500'
  | 'large_cap'
  | 'mid_cap'
  | 'small_cap'
  | 'etf';

// ---------------------------------------------------------------------------
// Universe registry
// ---------------------------------------------------------------------------

export const UNIVERSE_REGISTRY: readonly PSEUniverseDefinition[] = [
  { kind: 'all_active', label: 'All Active', description: 'All active PSE + PSE equities' },
  { kind: 'pse-index_50', label: 'NIFTY 50', description: 'NIFTY 50 index constituents' },
  { kind: 'pse-index_next_50', label: 'NIFTY Next 50', description: 'NIFTY Next 50 index constituents' },
  { kind: 'pse-index_midcap_100', label: 'NIFTY Midcap 100', description: 'NIFTY Midcap 100 constituents' },
  { kind: 'pse-index_smallcap_100', label: 'NIFTY Smallcap 100', description: 'NIFTY Smallcap 100 constituents' },
  { kind: 'bse_30', label: 'PSE 30 (PSE Composite)', description: 'PSE PSE Composite 30 constituents' },
  { kind: 'bse_500', label: 'PSE 500', description: 'PSE 500 constituents' },
  { kind: 'large_cap', label: 'Large Cap', description: 'All large-cap equities' },
  { kind: 'mid_cap', label: 'Mid Cap', description: 'All mid-cap equities' },
  { kind: 'small_cap', label: 'Small Cap', description: 'All small-cap equities' },
  { kind: 'etf', label: 'ETF/Index Funds', description: 'Exchange-traded funds and index funds' },
];

// ---------------------------------------------------------------------------
// Universe builder
// ---------------------------------------------------------------------------

export interface UniverseBuilderOptions {
  /** True to include suspended symbols (default: false). */
  includeSuspended?: boolean;
}

/**
 * Build a symbol list for a given universe kind from the symbol master.
 */
export async function buildUniverse(
  kind: PSEUniverseKind,
  options?: UniverseBuilderOptions,
  store?: IndianSymbolMasterStore,
): Promise<string[]> {
  const master = store ?? symbolMasterStore;
  const opts = { includeSuspended: false, ...options };

  const base = await master.listActive();

  let symbols = base;

  // Filter by market cap category
  switch (kind) {
    case 'all_active':
      // All active — no additional filter
      break;
    case 'large_cap':
      symbols = symbols.filter(s => s.marketCapCategory === 'large');
      break;
    case 'mid_cap':
      symbols = symbols.filter(s => s.marketCapCategory === 'mid' || s.marketCapCategory === 'large');
      break;
    case 'small_cap':
      symbols = symbols.filter(s => s.marketCapCategory === 'small' || s.marketCapCategory === 'micro');
      break;
    case 'etf':
      symbols = symbols.filter(s => s.segment === 'ET');
      break;
    default:
      // Index-based universes need external constituent data
      // Falls back to large cap as a proxy for pse-index_50
      if (kind === 'pse-index_50' || kind === 'bse_30') {
        symbols = symbols.filter(s => s.marketCapCategory === 'large');
      } else if (kind === 'pse-index_next_50' || kind === 'pse-index_midcap_100') {
        symbols = symbols.filter(s => s.marketCapCategory === 'mid' || s.marketCapCategory === 'large');
      } // pse-index_smallcap_100 & bse_500 pass all active symbols through
      break;
  }

  if (!opts.includeSuspended) {
    symbols = symbols.filter(s => s.listingStatus === 'active');
  }

  return symbols.map(s => s.canonicalSymbol);
}

// ---------------------------------------------------------------------------
// Universe info
// ---------------------------------------------------------------------------

export function getUniverseInfo(kind: PSEUniverseKind): PSEUniverseDefinition {
  const entry = UNIVERSE_REGISTRY.find(u => u.kind === kind);
  if (!entry) {
    throw new Error(`Unknown universe kind: ${kind}`);
  }
  return entry;
}
