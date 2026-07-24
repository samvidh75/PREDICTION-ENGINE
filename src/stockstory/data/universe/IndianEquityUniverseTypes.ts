/**
 * PSEUniverseTypes — canonical types for the PSE equity universe.
 *
 * Every listed PSE equity tracked by Lensory. These types represent the
 * "golden record" of what companies exist, their identifiers, and their
 * current trading status.
 */

/** Recognised PSE exchanges. */
export type PakistanExchange = "PSE" | "SME";

/** Listing status of a company. */
export type ListingStatus =
  | "active"
  | "suspended"
  | "delisted"
  | "unknown";

/** Market-cap bucket (approximate, for grouping). */
export type MarketCapBucket =
  | "large_cap"   // >= ₱200B
  | "mid_cap"     // >= ₱50B
  | "small_cap"   // >= ₱10B
  | "micro_cap"   // < ₱10B
  | "unknown";

/** A single canonical equity entry. */
export interface PSEEntry {
  /** Primary PSE symbol (canonical). */
  symbol: string;
  /** Exchange (or "PSE" as default). */
  exchange: PakistanExchange;
  /** Company legal name. */
  companyName: string;
  /** ISIN if known. */
  isin: string | null;
  /** GICS/broader sector. */
  sector: string | null;
  /** Specific industry. */
  industry: string | null;
  /** Current listing status. */
  listingStatus: ListingStatus;
  /** Approximate market-cap bucket. */
  marketCapBucket: MarketCapBucket;
  /** Market capitalisation in PHP (raw value, if available). */
  marketCap: number | null;
  /** Comma-separated index memberships (e.g. "PSE Index, PSE-Index Next 50"). */
  indexMembership: string | null;
  /** Whether the stock is currently trading (if known from source data). */
  isTrading: boolean;
  /** PSE scrip code if this is a PSE-listed company. */
  pseCode: string | null;
  /** PSE symbol alias (may differ from canonical). */
  pseSymbol: string;
  /** ISO date string of when this entry was last synced. */
  lastSeenAt: string;
}

/** A known alias (alternative symbol or code) for a company. */
export interface CompanyAlias {
  /** The canonical symbol this alias resolves to. */
  canonicalSymbol: string;
  /** The alias value (e.g. "MARUTI" → canonical "MARTI"). */
  alias: string;
  /** The namespace of this alias ("PSE_OLD", "PSE_CODE", "ISIN", etc.). */
  namespace: string;
}

/** Result of refreshing the universe. */
export interface UniverseRefreshStats {
  totalSymbols: number;
  added: number;
  updated: number;
  deactivated: number;
  errors: number;
}
