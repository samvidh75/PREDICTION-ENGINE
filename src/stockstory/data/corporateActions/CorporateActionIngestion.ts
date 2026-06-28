/**
 * CorporateActionIngestion — ingests corporate actions from registered
 * data sources, normalizes them, and provides query / alert methods.
 *
 * Rules:
 *  - Only real actions from registered sources (DataSourceRegistry).
 *  - No invented or placeholder actions.
 *  - Raw source names are never exposed to the UI.
 */

import type { RawCorporateAction } from "./CorporateActionTypes.ts";
import type { CorporateAction } from "./CorporateActionTypes.ts";
import type { CorporateActionAlert } from "./CorporateActionTypes.ts";
import { corporateActionNormalizer } from "./CorporateActionNormalizer.ts";

export class CorporateActionIngestion {
  private actions: Map<string, CorporateAction> = new Map();

  /* ------------------------------------------------------------------ */
  /*  Ingestion                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Ingest raw records from a source. Returns the count of successfully
   * normalized actions. Invalid / empty records are silently skipped.
   */
  ingest(rawRecords: RawCorporateAction[]): number {
    let count = 0;
    for (const raw of rawRecords) {
      const normalized = corporateActionNormalizer.normalize(raw);
      if (normalized) {
        this.actions.set(normalized.id, normalized);
        count++;
      }
    }
    return count;
  }

  /**
   * Ingest a single raw record. Returns the normalized action or null.
   */
  ingestOne(raw: RawCorporateAction): CorporateAction | null {
    const normalized = corporateActionNormalizer.normalize(raw);
    if (normalized) {
      this.actions.set(normalized.id, normalized);
      return normalized;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Query                                                              */
  /* ------------------------------------------------------------------ */

  /** Get all corporate actions for a symbol, sorted by effective date descending. */
  getBySymbol(symbol: string): CorporateAction[] {
    return Array.from(this.actions.values())
      .filter((a) => a.symbol.toUpperCase() === symbol.toUpperCase())
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  }

  /** Get corporate actions by kind for a symbol. */
  getByKind(symbol: string, kind: string): CorporateAction[] {
    return this.getBySymbol(symbol).filter((a) => a.kind === kind);
  }

  /** Get all actions across all symbols. */
  getAll(): CorporateAction[] {
    return Array.from(this.actions.values());
  }

  /** Count of actions registered. */
  get count(): number {
    return this.actions.size;
  }

  /* ------------------------------------------------------------------ */
  /*  Alerts                                                             */
  /* ------------------------------------------------------------------ */

  /** Generate alerts for a symbol's corporate actions. */
  getAlerts(symbol: string): CorporateActionAlert[] {
    return this.getBySymbol(symbol).map((a) => corporateActionNormalizer.toAlert(a));
  }

  /** Get all pending alerts (actions effective in the future). */
  getPendingAlerts(): CorporateActionAlert[] {
    const now = new Date().toISOString().slice(0, 10);
    return Array.from(this.actions.values())
      .filter((a) => a.effectiveDate >= now)
      .map((a) => corporateActionNormalizer.toAlert(a));
  }

  /* ------------------------------------------------------------------ */
  /*  Reset                                                              */
  /* ------------------------------------------------------------------ */

  /** Clear all ingested actions (for testing / re-ingestion). */
  reset(): void {
    this.actions.clear();
  }
}

export const corporateActionIngestion = new CorporateActionIngestion();
