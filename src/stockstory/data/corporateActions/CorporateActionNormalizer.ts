/**
 * Corporate Action Normalizer
 *
 * Normalizes raw corporate action data from various sources
 * into the standard CorporateAction type. Handles source-specific
 * quirks and date format normalization.
 */

import type { RawCorporateAction, CorporateAction, CorporateActionKind, CorporateActionSubKind } from './CorporateActionTypes';
import { corporateActionIngestion } from './CorporateActionIngestion';

export class CorporateActionNormalizer {
  /** Normalize a date string to ISO date (YYYY-MM-DD) */
  private normalizeDate(dateStr: string | undefined | null): string | null {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }

  /** Infer CorporateActionKind from a sub-kind or raw category string */
  inferKind(category: string): CorporateActionKind {
    const lower = category.toLowerCase();
    if (lower.includes('dividend')) return 'dividend';
    if (lower.includes('bonus')) return 'bonus';
    if (lower.includes('split')) return 'split';
    if (lower.includes('rights')) return 'rights';
    if (lower.includes('buyback')) return 'buyback';
    if (lower.includes('merger') || lower.includes('amalgamation')) return 'merger';
    if (lower.includes('demerger')) return 'demerger';
    if (lower.includes('delist')) return 'delisting';
    if (lower.includes('suspen')) return 'suspension';
    if (lower.includes('name change')) return 'name_change';
    if (lower.includes('symbol')) return 'symbol_change';
    if (lower.includes('face value') || lower.includes('fv')) return 'face_value_change';
    if (lower.includes('board')) return 'board_meeting';
    if (lower.includes('agm') || lower.includes('egm')) return 'agm_egm';
    return 'dividend';
  }

  /** Normalize a raw corporate action from any source into standard RawCorporateAction */
  normalize(raw: {
    symbol: string;
    companyName?: string;
    category?: string;
    kind?: CorporateActionKind;
    subKind?: CorporateActionSubKind;
    announcementDate: string;
    exDate?: string;
    recordDate?: string;
    effectiveDate?: string;
    details?: Record<string, unknown>;
    sourceId: string;
  }): RawCorporateAction {
    const kind = raw.kind ?? (raw.category ? this.inferKind(raw.category) : 'dividend');

    return {
      symbol: raw.symbol.toUpperCase(),
      companyName: raw.companyName ?? raw.symbol,
      kind,
      subKind: raw.subKind,
      announcementDate: this.normalizeDate(raw.announcementDate) ?? raw.announcementDate,
      exDate: this.normalizeDate(raw.exDate) ?? undefined,
      recordDate: this.normalizeDate(raw.recordDate) ?? undefined,
      effectiveDate: this.normalizeDate(raw.effectiveDate) ?? undefined,
      details: raw.details ?? {},
      sourceId: raw.sourceId,
    };
  }

  /** Normalize and ingest a corporate action in one step */
  normalizeAndIngest(raw: Parameters<CorporateActionNormalizer['normalize']>[0]): CorporateAction {
    const normalized = this.normalize(raw);
    return corporateActionIngestion.ingest(normalized);
  }

  /** Normalize and ingest multiple actions */
  normalizeAndIngestMany(raws: Parameters<CorporateActionNormalizer['normalize']>[0][]): CorporateAction[] {
    return raws.map(r => this.normalizeAndIngest(r));
  }
}

export const corporateActionNormalizer = new CorporateActionNormalizer();
