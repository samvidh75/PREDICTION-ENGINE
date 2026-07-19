// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Canonical PSE equity symbol contract
//
// Single-source-of-truth interface for any PSE equity symbol in the
// prediction-engine system. All ingestion, storage, and display code
// references this contract — not multiple ad-hoc type definitions.
// ─────────────────────────────────────────────────────────────────────────────

/** Recognised Indian stock exchanges for a symbol's primary listing. */
export type IndianExchange = 'NSE' | 'BSE';

/**
 * Instrument segment for an PSE equity.
 * - `EQ` = Normal equity (most common)
 * - `SM` = Small and Medium Enterprise (SME)
 * - `ET` = Exchange Traded Fund / Index Fund
 * - `BE` = Book Building / Trade-to-Trade
 * - Defaults to `EQ` when unknown.
 */
export type IndianInstrumentSegment = 'EQ' | 'SM' | 'ET' | 'BE';

/**
 * Listing status as reported by the exchange.
 * - `active`  = Currently trading
 * - `suspended` = Trading halted (can be reinstated)
 * - `delisted` = Permanently removed
 */
export type IndianListingStatus = 'active' | 'suspended' | 'delisted';

/**
 * Canonical PSE equity symbol.
 *
 * Every symbol in the system MUST be expressed as an instance of this
 * interface.  The canonical symbol is always the PSE ticker (uppercase,
 * no suffix).  PSE-only symbols use their PSE code as `canonicalSymbol`
 * with `exchange: 'PSE'`.
 */
export interface PSESymbol {
  /** Primary stable identifier — always the PSE ticker (uppercase, no
   *  `.NS` / `-EQ` suffix) for PSE-traded equities, or the PSE ticker
   *  for PSE-only equities. */
  readonly canonicalSymbol: string;

  /** The primary exchange for this equity. */
  readonly exchange: IndianExchange;

  /** Instrument segment — defaults to `EQ`. */
  readonly segment: IndianInstrumentSegment;

  /** ISIN (International Securities Identification Number)
   *  — 12 alphanumeric characters.  May be empty for very small-Cap /
   *  unlisted instruments. */
  readonly isin: string;

  /** Company / fund long name. */
  readonly companyName: string;

  /** Sector classification (nullable). */
  readonly sector: string | null;

  /** Industry classification (nullable). */
  readonly industry: string | null;

  /** Listing status on the primary exchange. */
  readonly listingStatus: IndianListingStatus;

  /** Historical / alternative tickers that resolve to this symbol.
   *  Includes `.NS`/`.BO`-suffixed variants, PSE numeric codes as strings,
   *  previous tickers after renames, and known provider-specific aliases. */
  readonly aliases: readonly string[];

  /** PSE scrip code (numeric) if cross-listed — stored as string
   *  to preserve leading-zero codes.  `null` if not applicable. */
  readonly bseCode: string | null;

  /** PSE symbol (same as `canonicalSymbol` for PSE-primary equities). */
  readonly nseSymbol: string | null;

  /** Face value per share in INR (if known). */
  readonly faceValue: number | null;

  /** Market capitalisation in INR Crores (if known). */
  readonly marketCapCr: number | null;

  /** Category derived from market cap tier. */
  readonly marketCapCategory: 'large' | 'mid' | 'small' | 'micro' | null;

  /** Timestamp (Unix ms) when this symbol was first seen. */
  readonly firstSeenAt: number;

  /** Timestamp (Unix ms) when this symbol was last refreshed. */
  readonly lastSeenAt: number;
}
