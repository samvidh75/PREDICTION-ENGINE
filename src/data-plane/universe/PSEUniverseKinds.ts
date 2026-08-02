// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Universe definitions
//
// Formal universe kind definitions built from the symbol master.
// Each universe is a Deterministic, symbol-master-backed category used by
// scanner, rankings, Healthometer, watchlist thesis, and precompute jobs.
// ─────────────────────────────────────────────────────────────────────────────

import { PSESymbolMasterStore, symbolMasterStore } from '../symbols/PSESymbolMasterStore';

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
 * - `all_active`      — Every active PSE equity in the symbol master
 * - `psei`            — PSEi Composite Index (30 largest, most liquid PSE stocks)
 * - `pse_all_shares`   — PSE All Shares Index (every listed common share)
 * - `sector_financials` — PSE Financials sector sub-index
 * - `sector_industrial` — PSE Industrial sector sub-index
 * - `sector_holding_firms` — PSE Holding Firms sector sub-index
 * - `sector_property`  — PSE Property sector sub-index
 * - `sector_services`  — PSE Services sector sub-index
 * - `sector_mining_oil` — PSE Mining & Oil sector sub-index
 * - `large_cap`        — All large-cap equities (marketCapCategory = 'large')
 * - `mid_cap`          — All mid-cap equities
 * - `small_cap`        — All small-cap equities
 * - `etf`              — All ETF/index fund symbols
 */
export type PSEUniverseKind =
  | 'all_active'
  | 'psei'
  | 'pse_all_shares'
  | 'sector_financials'
  | 'sector_industrial'
  | 'sector_holding_firms'
  | 'sector_property'
  | 'sector_services'
  | 'sector_mining_oil'
  | 'large_cap'
  | 'mid_cap'
  | 'small_cap'
  | 'etf';

// Matches the official PSE 6-sector classification used by
// src/stockstory/content/sector/SectorTypes.ts — keep these two in sync.
const SECTOR_KIND_TO_LABEL: Partial<Record<PSEUniverseKind, string>> = {
  sector_financials: 'Financials',
  sector_industrial: 'Industrial',
  sector_holding_firms: 'Holding Firms',
  sector_property: 'Property',
  sector_services: 'Services',
  sector_mining_oil: 'Mining & Oil',
};

// ---------------------------------------------------------------------------
// Universe registry
// ---------------------------------------------------------------------------

export const UNIVERSE_REGISTRY: readonly PSEUniverseDefinition[] = [
  { kind: 'all_active', label: 'All Active', description: 'All active PSE-listed equities' },
  { kind: 'psei', label: 'PSEi Composite', description: 'PSEi (Philippine Stock Exchange index) constituents — proxied by large-cap tier until real index membership data is wired in' },
  { kind: 'pse_all_shares', label: 'PSE All Shares', description: 'All actively listed PSE common shares' },
  { kind: 'sector_financials', label: 'PSE Financials', description: 'PSE Financials sector constituents' },
  { kind: 'sector_industrial', label: 'PSE Industrial', description: 'PSE Industrial sector constituents' },
  { kind: 'sector_holding_firms', label: 'PSE Holding Firms', description: 'PSE Holding Firms sector constituents' },
  { kind: 'sector_property', label: 'PSE Property', description: 'PSE Property sector constituents' },
  { kind: 'sector_services', label: 'PSE Services', description: 'PSE Services sector constituents' },
  { kind: 'sector_mining_oil', label: 'PSE Mining & Oil', description: 'PSE Mining & Oil sector constituents' },
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
 *
 * PSE does not publish a machine-readable index-constituent feed the way
 * NSE/BSE do, so `psei` is proxied by the large-cap tier and the
 * `sector_*` universes filter on the symbol master's own sector field —
 * both are best-effort approximations, not verified official index
 * membership, until a real PSE index-constituent source is integrated.
 */
export async function buildUniverse(
  kind: PSEUniverseKind,
  options?: UniverseBuilderOptions,
  store?: PSESymbolMasterStore,
): Promise<string[]> {
  const master = store ?? symbolMasterStore;
  const opts = { includeSuspended: false, ...options };

  const base = await master.listActive();

  let symbols = base;

  switch (kind) {
    case 'all_active':
    case 'pse_all_shares':
      // No additional filter — every actively-listed symbol.
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
    case 'psei':
      // Best-effort proxy: no real index-constituent feed wired in yet.
      symbols = symbols.filter(s => s.marketCapCategory === 'large');
      break;
    case 'sector_financials':
    case 'sector_industrial':
    case 'sector_holding_firms':
    case 'sector_property':
    case 'sector_services':
    case 'sector_mining_oil':
      symbols = symbols.filter(s => s.sector === SECTOR_KIND_TO_LABEL[kind]);
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
