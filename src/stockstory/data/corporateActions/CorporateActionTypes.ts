/**
 * CorporateActionTypes — corporate action type definitions for the data-moat layer.
 *
 * Rules:
 *  - Only real, official data. No invented corporate actions.
 *  - Public display uses safe human-readable descriptions only.
 */

/* ------------------------------------------------------------------ */
/*  Action kind                                                        */
/* ------------------------------------------------------------------ */

export type CorporateActionKind =
  | "dividend"
  | "bonus"
  | "split"
  | "rights"
  | "buyback"
  | "merger"
  | "demerger"
  | "name_change"
  | "symbol_change"
  | "delisting"
  | "suspension";

/** Action sub-type for finer-grained category. */
export type CorporateActionSubKind = "interim" | "final" | "special" | "stock" | "cash" | string;

/* ------------------------------------------------------------------ */
/*  Raw record (from ingestion)                                        */
/* ------------------------------------------------------------------ */

export interface RawCorporateAction {
  /** Source-provided unique identifier (optional — not all sources provide one). */
  externalId?: string;
  /** NSE symbol if available, else BSE code. */
  symbol: string;
  /** BSE security code (numeric). */
  bseCode?: string;
  /** ISIN if available. */
  isin?: string;
  kind: CorporateActionKind;
  subKind?: CorporateActionSubKind;
  /** Date the action was announced. */
  announcementDate: string; // ISO-8601 date
  /** Date the action is effective (ex-date / record date). */
  effectiveDate: string; // ISO-8601 date
  /** Date the action was actually paid / distributed (optional). */
  paymentDate?: string;
  /** Human-readable details from source. */
  details?: string;
  /** Numerical value (dividend amount, split factor, bonus ratio numerator). */
  value?: number;
  /** Secondary numerical value (split denominator, bonus ratio denominator). */
  value2?: number;
  /** Currency for cash actions (default INR). */
  currency?: string;
  /** Source category from the data-moat registry. */
  sourceCategory: string;
  /** Original source name — never displayed in UI. */
  sourceName: string;
}

/* ------------------------------------------------------------------ */
/*  Normalized corporate action entry                                  */
/* ------------------------------------------------------------------ */

export interface CorporateAction {
  /** Deterministic evidence ID. */
  id: string;
  /** Canonical NSE symbol. */
  symbol: string;
  kind: CorporateActionKind;
  subKind?: CorporateActionSubKind;
  announcementDate: string;
  effectiveDate: string;
  paymentDate?: string;
  /** Parsed numerical detail for display. */
  displayValue?: string;
  /** Human-readable summary (safe for public display). */
  summary: string;
  /** Forbidden in UI — used for internal derivation only. */
  sourceCategory: string;
  /** Unix ms timestamp when registered. */
  registeredAt: number;
}

/* ------------------------------------------------------------------ */
/*  Watchlist alert (produced from real actions only)                  */
/* ------------------------------------------------------------------ */

export interface CorporateActionAlert {
  /** Alert ID. */
  id: string;
  /** Canonical NSE symbol. */
  symbol: string;
  /** Corporate action that triggered the alert. */
  actionId: string;
  kind: CorporateActionKind;
  /** Short alert title. */
  title: string;
  /** Alert detail safe for public display. */
  detail: string;
  /** When the action is effective. */
  effectiveDate: string;
  /** Severity / importance hint. */
  severity: "info" | "warning" | "important";
}

/* ------------------------------------------------------------------ */
/*  Public-safe summary                                                */
/* ------------------------------------------------------------------ */

export interface PublicCorporateActionSummary {
  actions: {
    date: string;
    kind: string;
    displayValue?: string;
    summary: string;
  }[];
}

export function toPublicCorporateActionSummary(
  actions: CorporateAction[],
): PublicCorporateActionSummary {
  return {
    actions: actions.map((a) => ({
      date: a.effectiveDate,
      kind: a.kind.replace(/_/g, " "),
      displayValue: a.displayValue,
      summary: a.summary,
    })),
  };
}
