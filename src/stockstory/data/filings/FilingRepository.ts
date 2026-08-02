/**
 * Filing Repository
 *
 * Stores and queries exchange filings.
 * Supports filtering by symbol, type, date range, exchange, and tags.
 */

import type {
  ExchangeFiling,
  FilingType,
  FilingExchange,
  FilingFilter,
  FilingBatch,
} from './FilingTypes';

export class FilingRepository {
  private filings: Map<string, ExchangeFiling> = new Map();
  private bySymbol: Map<string, Set<string>> = new Map();
  private byType: Map<FilingType, Set<string>> = new Map();
  private byExchange: Map<FilingExchange, Set<string>> = new Map();
  private byDate: Map<string, Set<string>> = new Map();
  private byTag: Map<string, Set<string>> = new Map();
  private batches: Map<string, FilingBatch> = new Map();

  add(filing: ExchangeFiling): void {
    this.filings.set(filing.id, filing);
    this.index(filing);
  }

  addMany(filings: ExchangeFiling[]): void {
    for (const f of filings) {
      this.filings.set(f.id, f);
      this.index(f);
    }
  }

  private index(filing: ExchangeFiling): void {
    this.addToIndex(this.bySymbol, filing.symbol.toUpperCase(), filing.id);
    this.addToIndex(this.byType, filing.filingType, filing.id);
    this.addToIndex(this.byExchange, filing.exchange, filing.id);

    const dateKey = filing.filingDate.slice(0, 10);
    this.addToIndex(this.byDate, dateKey, filing.id);

    for (const tag of filing.tags) {
      this.addToIndex(this.byTag, tag.toLowerCase(), filing.id);
    }
  }

  private addToIndex(map: Map<string, Set<string>>, key: string, id: string): void {
    const set = map.get(key) ?? new Set();
    set.add(id);
    map.set(key, set);
  }

  query(filter: FilingFilter = {}): ExchangeFiling[] {
    let candidateIds: Set<string> | null = null;

    // Intersect symbol filter
    if (filter.symbols && filter.symbols.length > 0) {
      const ids = new Set<string>();
      for (const sym of filter.symbols) {
        const symIds = this.bySymbol.get(sym.toUpperCase());
        if (symIds) for (const id of symIds) ids.add(id);
      }
      candidateIds = candidateIds ? this.intersect(candidateIds, ids) : ids;
    }

    // Filing types
    if (filter.filingTypes && filter.filingTypes.length > 0) {
      const ids = new Set<string>();
      for (const ft of filter.filingTypes) {
        const typeIds = this.byType.get(ft);
        if (typeIds) for (const id of typeIds) ids.add(id);
      }
      candidateIds = candidateIds ? this.intersect(candidateIds, ids) : ids;
    }

    // Exchanges
    if (filter.exchanges && filter.exchanges.length > 0) {
      const ids = new Set<string>();
      for (const ex of filter.exchanges) {
        const exIds = this.byExchange.get(ex);
        if (exIds) for (const id of exIds) ids.add(id);
      }
      candidateIds = candidateIds ? this.intersect(candidateIds, ids) : ids;
    }

    // Tags
    if (filter.tags && filter.tags.length > 0) {
      const ids = new Set<string>();
      for (const tag of filter.tags) {
        const tagIds = this.byTag.get(tag.toLowerCase());
        if (tagIds) for (const id of tagIds) ids.add(id);
      }
      candidateIds = candidateIds ? this.intersect(candidateIds, ids) : ids;
    }

    const allIds = candidateIds ?? new Set(this.filings.keys());
    let results = Array.from(allIds).map(id => this.filings.get(id)!).filter(Boolean);

    // Date range filter
    if (filter.fromDate) {
      results = results.filter(f => f.filingDate >= filter.fromDate!);
    }
    if (filter.toDate) {
      results = results.filter(f => f.filingDate <= filter.toDate!);
    }

    results.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  private intersect(a: Set<string>, b: Set<string>): Set<string> {
    const result = new Set<string>();
    const smaller = a.size < b.size ? a : b;
    const larger = a.size < b.size ? b : a;
    for (const id of smaller) {
      if (larger.has(id)) result.add(id);
    }
    return result;
  }

  getById(id: string): ExchangeFiling | undefined {
    return this.filings.get(id);
  }

  getBySymbol(symbol: string): ExchangeFiling[] {
    return this.query({ symbols: [symbol] });
  }

  createBatch(exchange: FilingExchange, date: string): FilingBatch {
    const id = `batch_${exchange}_${date}`;
    const batch: FilingBatch = {
      id,
      date,
      exchange,
      totalFilings: 0,
      processedFilings: 0,
      status: 'pending',
      errors: [],
    };
    this.batches.set(id, batch);
    return batch;
  }

  updateBatch(id: string, update: Partial<FilingBatch>): void {
    const existing = this.batches.get(id);
    if (existing) {
      Object.assign(existing, update);
    }
  }

  getStats(): {
    totalFilings: number;
    byType: Partial<Record<FilingType, number>>;
    byExchange: Partial<Record<FilingExchange, number>>;
    symbolsCovered: number;
    withPdf: number;
    withXbrl: number;
  } {
    const byType: Partial<Record<FilingType, number>> = {};
    const byExchange: Partial<Record<FilingExchange, number>> = {};
    let withPdf = 0;
    let withXbrl = 0;

    for (const f of this.filings.values()) {
      byType[f.filingType] = (byType[f.filingType] ?? 0) + 1;
      byExchange[f.exchange] = (byExchange[f.exchange] ?? 0) + 1;
      if (f.pdfUrl) withPdf++;
      if (f.xbrlUrl) withXbrl++;
    }

    return {
      totalFilings: this.filings.size,
      byType,
      byExchange,
      symbolsCovered: this.bySymbol.size,
      withPdf,
      withXbrl,
    };
  }
}

export const filingRepository = new FilingRepository();
