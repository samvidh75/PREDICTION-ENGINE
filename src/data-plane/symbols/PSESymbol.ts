// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Canonical PSE equity symbol contract
//
// Single-source-of-truth interface for any PSE equity symbol in the
// prediction-engine system. All ingestion, storage, and display code
// references this contract — not multiple ad-hoc type definitions.
// ─────────────────────────────────────────────────────────────────────────────

/** Philippine Stock Exchange — the only exchange this platform covers. */
export type PSEExchange = 'PSE';

/**
 * Instrument segment for a PSE equity.
 * - `EQ` = Normal equity (most common)
 * - `SM` = Small and Medium Enterprise (SME)
 * - `ET` = Exchange Traded Fund / Index Fund
 * - `BE` = Book Building / Trade-to-Trade
 * - Defaults to `EQ` when unknown.
 */
export type PSEInstrumentSegment = 'EQ' | 'SM' | 'ET' | 'BE';

/**
 * Listing status as reported by the exchange.
 * - `active`  = Currently trading
 * - `suspended` = Trading halted (can be reinstated)
 * - `delisted` = Permanently removed
 */
export type PSEListingStatus = 'active' | 'suspended' | 'delisted';

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
   *  `.PS` suffix) for PSE-traded equities, or the PSE ticker
   *  for PSE-only equities. */
  readonly canonicalSymbol: string;

  /** The primary exchange for this equity. */
  readonly exchange: PSEExchange;

  /** Instrument segment — defaults to `EQ`. */
  readonly segment: PSEInstrumentSegment;

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
  readonly listingStatus: PSEListingStatus;

  /** Historical / alternative tickers that resolve to this symbol.
   *  Includes `.PS`-suffixed variants, PSE numeric codes as strings,
   *  previous tickers after renames, and known provider-specific aliases. */
  readonly aliases: readonly string[];

  /** PSE scrip code (numeric) if cross-listed — stored as string
   *  to preserve leading-zero codes.  `null` if not applicable. */
  readonly pseCode: string | null;

  /** PSE symbol (same as `canonicalSymbol` for PSE-primary equities). */
  readonly pseSymbol: string | null;

  /** Face value per share in PHP (if known). */
  readonly faceValue: number | null;

  /** Market capitalisation in PHP Millions (if known). */
  readonly marketCapCr: number | null;

  /** Category derived from market cap tier. */
  readonly marketCapCategory: 'large' | 'mid' | 'small' | 'micro' | null;

  /** Timestamp (Unix ms) when this symbol was first seen. */
  readonly firstSeenAt: number;

  /** Timestamp (Unix ms) when this symbol was last refreshed. */
  readonly lastSeenAt: number;
}
