/**
 * CorporateActionNormalizer — normalizes raw corporate action records into
 * canonical CorporateAction entries.
 *
 * Rules:
 *  - Only real actions (null/undefined values → return null).
 *  - Dividends: display "₹{value} per share".
 *  - Splits: display "{value}:{value2}" split.
 *  - Bonus: display "{value}:{value2}" bonus.
 *  - Symbol / name changes: display the new value.
 *  - Delisting / suspension: display as-is, warning severity.
 *  - No invented or assumed values.
 */

import type {
  CorporateAction,
  CorporateActionKind,
  CorporateActionAlert,
  RawCorporateAction,
} from "./CorporateActionTypes.ts";
import { dataEvidenceIdFactory } from "../evidence/DataEvidenceIdFactory.ts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatSummary(kind: CorporateActionKind, raw: RawCorporateAction): string {
  switch (kind) {
    case "dividend": {
      const amt = raw.value != null ? `₹${raw.value.toFixed(2)}` : "";
      const sub = raw.subKind ? ` (${raw.subKind})` : "";
      return amt ? `Dividend${sub}: ${amt} per share` : `Dividend declared${sub}`;
    }
    case "bonus": {
      if (raw.value != null && raw.value2 != null) {
        return `Bonus issue: ${raw.value}:${raw.value2}`;
      }
      return "Bonus issue announced";
    }
    case "split": {
      if (raw.value != null && raw.value2 != null) {
        return `Stock split: ${raw.value}:${raw.value2}`;
      }
      return "Stock split announced";
    }
    case "rights":
      return raw.value != null ? `Rights issue: ₹${raw.value}` : "Rights issue announced";
    case "buyback":
      return raw.value != null ? `Buyback: ₹${raw.value}` : "Buyback announced";
    case "merger":
      return raw.details ? `Merger: ${raw.details}` : "Merger announced";
    case "demerger":
      return raw.details ? `Demerger: ${raw.details}` : "Demerger announced";
    case "name_change":
      return raw.details ? `Name change: ${raw.details}` : "Name change";
    case "symbol_change":
      return raw.details ? `Symbol change: ${raw.details}` : "Symbol change";
    case "delisting":
      return "Delisting";
    case "suspension":
      return "Trading suspended";
    default:
      return raw.details ?? "Corporate action";
  }
}

function formatDisplayValue(kind: CorporateActionKind, raw: RawCorporateAction): string | undefined {
  switch (kind) {
    case "dividend":
      return raw.value != null ? `₹${raw.value.toFixed(2)}` : undefined;
    case "split":
      return raw.value != null && raw.value2 != null ? `${raw.value}:${raw.value2}` : undefined;
    case "bonus":
      return raw.value != null && raw.value2 != null ? `${raw.value}:${raw.value2}` : undefined;
    case "rights":
      return raw.value != null ? `₹${raw.value}` : undefined;
    case "buyback":
      return raw.value != null ? `₹${raw.value}` : undefined;
    default:
      return undefined;
  }
}

function inferSeverity(kind: CorporateActionKind): CorporateActionAlert["severity"] {
  switch (kind) {
    case "delisting":
    case "suspension":
      return "warning";
    case "merger":
    case "demerger":
    case "buyback":
      return "important";
    default:
      return "info";
  }
}

/* ------------------------------------------------------------------ */
/*  Normalizer                                                         */
/* ------------------------------------------------------------------ */

export class CorporateActionNormalizer {
  /**
   * Normalize a raw record. Returns null for invalid / empty records
   * (no invented actions).
   */
  normalize(raw: RawCorporateAction): CorporateAction | null {
    if (!raw.symbol || !raw.kind || !raw.announcementDate || !raw.effectiveDate) {
      return null;
    }

    const id = dataEvidenceIdFactory.createId({
      symbol: raw.symbol,
      field: `corp_${raw.kind}`,
      asOf: raw.effectiveDate,
      sourceCategory: raw.sourceCategory,
    });

    return {
      id,
      symbol: raw.symbol,
      kind: raw.kind,
      subKind: raw.subKind,
      announcementDate: raw.announcementDate,
      effectiveDate: raw.effectiveDate,
      paymentDate: raw.paymentDate,
      displayValue: formatDisplayValue(raw.kind, raw),
      summary: formatSummary(raw.kind, raw),
      sourceCategory: raw.sourceCategory,
      registeredAt: Date.now(),
    };
  }

  /**
   * Generate a watchlist alert from a normalized action.
   * Only called for real actions — never for null/invented ones.
   */
  toAlert(action: CorporateAction): CorporateActionAlert {
    return {
      id: `alert-${action.id}`,
      symbol: action.symbol,
      actionId: action.id,
      kind: action.kind,
      title: action.summary.length > 80 ? action.summary.slice(0, 77) + "..." : action.summary,
      detail: `Corporate action: ${action.kind.replace(/_/g, " ")} on ${action.effectiveDate}`,
      effectiveDate: action.effectiveDate,
      severity: inferSeverity(action.kind),
    };
  }
}

export const corporateActionNormalizer = new CorporateActionNormalizer();
