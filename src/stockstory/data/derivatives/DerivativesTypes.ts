/**
 * Derivatives Types
 *
 * Defines types for derivatives market context. Covers F&O eligibility,
 * open interest trends, option activity, and futures context.
 * Missing data never blocks research — all fields are optional.
 */

/** F&O eligibility status for a stock */
export interface FOEligibility {
  symbol: string;
  /** Whether the stock is currently F&O eligible */
  eligible: boolean;
  /** Segment under which it is eligible (equity, index, etc.) */
  segment?: 'equity' | 'index' | 'both';
  /** Exchange where F&O is available */
  exchange?: 'nse' | 'bse' | 'both';
  /** Date of eligibility determination */
  asOf: string;
  /** Reason if not eligible */
  reason?: string;
}

/** Open interest data point for a contract */
export interface OpenInterest {
  symbol: string;
  /** Total outstanding contracts */
  oi: number;
  /** Change from previous session in contracts */
  change: number;
  /** Percentage change from previous session */
  changePct: number;
  /** Contract type */
  type: 'futures' | 'call' | 'put';
  /** Expiry date */
  expiry: string;
  /** Strike price (only for options) */
  strike?: number;
  /** As-of date */
  asOf: string;
  /** Total traded volume for the session */
  volume?: number;
}

/** Summarised option activity for a symbol */
export interface OptionActivity {
  symbol: string;
  /** Total call OI across all strikes */
  totalCallOi: number;
  /** Total put OI across all strikes */
  totalPutOi: number;
  /** Put‑Call ratio */
  putCallRatio: number;
  /** Maximum call OI concentration strike */
  maxCallOiStrike?: number;
  /** Maximum put OI concentration strike */
  maxPutOiStrike?: number;
  /** India VIX level (if available) */
  indiaVix?: number;
  asOf: string;
}

/** Aggregated futures market context */
export interface FuturesContext {
  symbol: string;
  /** Current month futures price */
  futuresPrice?: number;
  /** Cash / spot price */
  spotPrice?: number;
  /** Premium / discount of futures to spot */
  basis?: number;
  /** Basis as percentage of spot */
  basisPct?: number;
  /** Open interest across all futures contracts */
  totalOi?: number;
  /** Change in total OI from previous session */
  oiChange?: number;
  /** Rollover percentage towards next month */
  rolloverPct?: number;
  asOf: string;
}