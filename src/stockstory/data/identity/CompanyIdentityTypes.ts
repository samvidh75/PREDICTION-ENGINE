/**
 * CompanyIdentityTypes — types for company identity resolution.
 *
 * Represents the canonical identity of a listed PSX company,
 * built from real source data only. All optional fields nullable.
 */

import type { PakistanExchange, ListingStatus } from "../universe/PSEUniverseTypes.ts";

// ---------------------------------------------------------------------------
// Core identity type
// ---------------------------------------------------------------------------

export interface CompanyIdentity {
  /** Primary PSE symbol (canonical key). */
  pseSymbol: string;

  /** PSE scrip code, if available. */
  pseCode?: string | null;

  /** 12-character ISIN, if available. */
  isin?: string | null;

  /** Registered company name. */
  companyName: string;

  /** Short display name (ticker-based fallback). */
  shortName: string;

  /** Sector classification from source data. */
  sector?: string | null;

  /** Industry classification from source data. */
  industry?: string | null;

  /** Official website URL, if available. */
  websiteUrl?: string | null;

  /** Primary exchange. */
  exchange: PakistanExchange;

  /** Current listing status. */
  listingStatus: ListingStatus;

  /** Known aliases (previous symbols, alternative tickers). */
  aliases: CompanyAlias[];

  /** When this identity was last verified against a source. */
  lastVerifiedAt: string;

  /** Human-readable provenance description. */
  provenance: string;
}

// ---------------------------------------------------------------------------
// Alias type
// ---------------------------------------------------------------------------

export interface CompanyAlias {
  /** The alias value (e.g. "RELIANCE.PSX", "500325", "INE002A01018"). */
  value: string;

  /** Kind of alias. */
  kind: "pse" | "pse" | "isin" | "previous_symbol" | "short_name";

  /** Optional human-readable label. */
  label?: string;

  /** When this alias was last confirmed valid. */
  lastConfirmedAt?: string;

  /** Whether this alias may be displayed publicly. */
  isPublicSafe?: boolean;
}

// ---------------------------------------------------------------------------
// Resolution results
// ---------------------------------------------------------------------------

export interface IdentityResolution {
  /** The resolved identity, or null if unresolvable. */
  identity: CompanyIdentity | null;

  /** How confident we are (0–1). */
  confidence: number;

  /** Human-readable resolution path. */
  resolvedBy: string;

  /** Potential conflicts discovered during resolution. */
  conflicts: IdentityConflict[];
}

export interface IdentityConflict {
  field: string;
  leftValue: string | null;
  rightValue: string | null;
  severity: "info" | "warning" | "error";
  description: string;
}

// ---------------------------------------------------------------------------
// Resolution source
// ---------------------------------------------------------------------------

export type ResolutionSource =
  | { kind: "pse_symbol"; symbol: string }
  | { kind: "bse_code"; code: string }
  | { kind: "isin"; value: string }
  | { kind: "alias"; value: string }
  | { kind: "company_name"; name: string };

// ---------------------------------------------------------------------------
// Identity registry (in-memory lookup)
// ---------------------------------------------------------------------------

export interface IdentityRegistry {
  /** Map from normalised PSE symbol → CompanyIdentity. */
  bySymbol: Map<string, CompanyIdentity>;

  /** Map from alias value → canonical symbol. */
  byAlias: Map<string, string>;
}
