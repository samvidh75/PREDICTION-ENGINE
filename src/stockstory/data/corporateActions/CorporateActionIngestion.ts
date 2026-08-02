/**
 * Corporate Action Ingestion
 *
 * Ingests corporate actions from registered data sources,
 * normalizes them into CorporateAction records, and stores them
 * for downstream event mapping and watchlist alerts.
 */

import type { RawCorporateAction, CorporateAction, CorporateActionDetails, CorporateActionKind } from './CorporateActionTypes';

/**
 * Simple deterministic hash for generating stable evidence IDs.
 * No dependencies on Node.js crypto — works in all JS runtimes.
 */
function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export class CorporateActionIngestion {
  private actions: Map<string, CorporateAction> = new Map();
  private bySymbol: Map<string, Set<string>> = new Map();
  private byKind: Map<CorporateActionKind, Set<string>> = new Map();

  /** Generate a stable evidence ID for a corporate action */
  private generateId(raw: RawCorporateAction): string {
    const hash = stableHash(`${raw.symbol}:${raw.kind}:${raw.announcementDate}:${raw.sourceId}`).slice(0, 12);
    return `ca_${raw.symbol.toLowerCase()}_${hash}`.replace(/[^a-z0-9_]/g, '_');
  }

  /** Normalize details into a safe CorporateActionDetails object */
  private normalizeDetails(raw: RawCorporateAction): CorporateActionDetails | null {
    if (!raw.details || Object.keys(raw.details).length === 0) return null;
    const details: CorporateActionDetails = {};
    if (typeof raw.details.amount === 'number') details.amount = raw.details.amount;
    if (typeof raw.details.percentage === 'number') details.percentage = raw.details.percentage;
    if (typeof raw.details.ratio === 'string') details.ratio = raw.details.ratio;
    if (typeof raw.details.price === 'number') details.price = raw.details.price;
    if (typeof raw.details.size === 'number') details.size = raw.details.size;
    if (typeof raw.details.type === 'string') details.type = raw.details.type;
    if (typeof raw.details.description === 'string') details.description = raw.details.description;
    return Object.keys(details).length > 0 ? details : null;
  }

  /** Ingest a raw corporate action, returns the normalized CorporateAction */
  ingest(raw: RawCorporateAction): CorporateAction {
    const id = this.generateId(raw);
    const normalized: CorporateAction = {
      id,
      symbol: raw.symbol.toUpperCase(),
      companyName: raw.companyName,
      kind: raw.kind,
      subKind: raw.subKind,
      announcementDate: raw.announcementDate,
      exDate: raw.exDate ?? null,
      recordDate: raw.recordDate ?? null,
      effectiveDate: raw.effectiveDate ?? null,
      details: this.normalizeDetails(raw),
      sourceIds: [raw.sourceId],
      verified: false,
      createdAt: new Date().toISOString(),
    };

    this.actions.set(id, normalized);

    const symSet = this.bySymbol.get(normalized.symbol) ?? new Set();
    symSet.add(id);
    this.bySymbol.set(normalized.symbol, symSet);

    const kindSet = this.byKind.get(normalized.kind) ?? new Set();
    kindSet.add(id);
    this.byKind.set(normalized.kind, kindSet);

    return normalized;
  }

  /** Ingest multiple raw actions */
  ingestMany(raw: RawCorporateAction[]): CorporateAction[] {
    return raw.map(r => this.ingest(r));
  }

  /** Get a corporate action by ID */
  getById(id: string): CorporateAction | undefined {
    return this.actions.get(id);
  }

  /** Get all corporate actions for a symbol, sorted by announcement date descending */
  getBySymbol(symbol: string): CorporateAction[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.actions.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.announcementDate.localeCompare(a.announcementDate));
  }

  /** Get corporate actions by kind */
  getByKind(kind: CorporateActionKind): CorporateAction[] {
    const ids = this.byKind.get(kind);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.actions.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.announcementDate.localeCompare(a.announcementDate));
  }

  /** Get the latest action of a given kind for a symbol */
  getLatest(symbol: string, kind?: CorporateActionKind): CorporateAction | undefined {
    const actions = this.getBySymbol(symbol);
    if (kind) return actions.find(a => a.kind === kind);
    return actions[0];
  }

  /** Get all actions between two dates */
  getByDateRange(fromDate: string, toDate: string): CorporateAction[] {
    const results: CorporateAction[] = [];
    for (const action of this.actions.values()) {
      if (action.announcementDate >= fromDate && action.announcementDate <= toDate) {
        results.push(action);
      }
    }
    return results.sort((a, b) => b.announcementDate.localeCompare(a.announcementDate));
  }

  /** Get upcoming ex-date actions within the next N days */
  getUpcomingExDates(daysAhead: number = 7): CorporateAction[] {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    return Array.from(this.actions.values()).filter(a => {
      if (!a.exDate) return false;
      const ex = new Date(a.exDate);
      return ex >= now && ex <= future;
    }).sort((a, b) => a.exDate!.localeCompare(b.exDate!));
  }

  /** Get stats about ingested actions */
  getStats(): {
    total: number;
    byKind: Partial<Record<CorporateActionKind, number>>;
    symbolsCovered: number;
    upcomingExDates: number;
  } {
    const byKind: Partial<Record<CorporateActionKind, number>> = {};
    for (const [kind, ids] of this.byKind.entries()) {
      byKind[kind] = ids.size;
    }
    return {
      total: this.actions.size,
      byKind,
      symbolsCovered: this.bySymbol.size,
      upcomingExDates: this.getUpcomingExDates(30).length,
    };
  }
}

export const corporateActionIngestion = new CorporateActionIngestion();
