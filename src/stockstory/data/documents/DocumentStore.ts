/**
 * Document Store
 *
 * Manages the corpus of annual reports, investor presentations,
 * and other documents for the RAG pipeline.
 * Tracks document processing status and chunk storage.
 */

import type {
  DocumentMetadata,
  DocumentChunk,
  DocumentFilter,
  DocumentKind,
} from './DocumentTypes';

export class DocumentStore {
  private documents: Map<string, DocumentMetadata> = new Map();
  private chunks: Map<string, DocumentChunk[]> = new Map();
  private bySymbol: Map<string, Set<string>> = new Map();
  private byKind: Map<DocumentKind, Set<string>> = new Map();
  private byYear: Map<string, Set<string>> = new Map();

  addDocument(doc: DocumentMetadata): void {
    this.documents.set(doc.id, doc);

    const symSet = this.bySymbol.get(doc.symbol.toUpperCase()) ?? new Set();
    symSet.add(doc.id);
    this.bySymbol.set(doc.symbol.toUpperCase(), symSet);

    const kindSet = this.byKind.get(doc.kind) ?? new Set();
    kindSet.add(doc.id);
    this.byKind.set(doc.kind, kindSet);

    const yearSet = this.byYear.get(doc.fiscalYear) ?? new Set();
    yearSet.add(doc.id);
    this.byYear.set(doc.fiscalYear, yearSet);
    this.chunks.set(doc.id, []);
  }

  addChunks(docId: string, chunks: DocumentChunk[]): void {
    const existing = this.chunks.get(docId) ?? [];
    existing.push(...chunks);
    this.chunks.set(docId, existing);

    const doc = this.documents.get(docId);
    if (doc) {
      doc.chunkCount = existing.length;
      doc.isProcessed = chunks.length > 0;
      doc.processedAt = new Date().toISOString();
    }
  }

  getDocument(docId: string): DocumentMetadata | undefined {
    return this.documents.get(docId);
  }

  getChunks(docId: string): DocumentChunk[] {
    return this.chunks.get(docId) ?? [];
  }

  getChunk(chunkId: string): DocumentChunk | undefined {
    for (const chunks of this.chunks.values()) {
      const found = chunks.find(c => c.id === chunkId);
      if (found) return found;
    }
    return undefined;
  }

  getBySymbol(symbol: string, kind?: DocumentKind): DocumentMetadata[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];

    const docs = Array.from(ids).map(id => this.documents.get(id)!).filter(Boolean);

    if (kind) return docs.filter(d => d.kind === kind);
    return docs.sort((a, b) => b.documentDate.localeCompare(a.documentDate));
  }

  getLatestAnnualReport(symbol: string): DocumentMetadata | undefined {
    const docs = this.getBySymbol(symbol, 'annual_report');
    return docs[0];
  }

  getUnprocessedDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).filter(d => !d.isProcessed);
  }

  query(filter: DocumentFilter = {}): DocumentMetadata[] {
    let candidateIds: Set<string> | null = null;

    if (filter.symbols && filter.symbols.length > 0) {
      const ids = new Set<string>();
      for (const sym of filter.symbols) {
        const symIds = this.bySymbol.get(sym.toUpperCase());
        if (symIds) for (const id of symIds) ids.add(id);
      }
      candidateIds = ids;
    }

    if (filter.kinds && filter.kinds.length > 0) {
      const ids = new Set<string>();
      for (const k of filter.kinds) {
        const kindIds = this.byKind.get(k);
        if (kindIds) for (const id of kindIds) ids.add(id);
      }
      candidateIds = candidateIds ? this.intersect(candidateIds, ids) : ids;
    }

    if (filter.fiscalYears && filter.fiscalYears.length > 0) {
      const ids = new Set<string>();
      for (const fy of filter.fiscalYears) {
        const fyIds = this.byYear.get(fy);
        if (fyIds) for (const id of fyIds) ids.add(id);
      }
      candidateIds = candidateIds ? this.intersect(candidateIds, ids) : ids;
    }

    const allIds = candidateIds ?? new Set(this.documents.keys());
    let results = Array.from(allIds).map(id => this.documents.get(id)!).filter(Boolean);

    if (filter.fromDate) results = results.filter(d => d.documentDate >= filter.fromDate!);
    if (filter.toDate) results = results.filter(d => d.documentDate <= filter.toDate!);
    if (filter.isProcessed !== undefined) results = results.filter(d => d.isProcessed === filter.isProcessed);
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(d => filter.tags!.some(t => d.tags.includes(t)));
    }

    results.sort((a, b) => b.documentDate.localeCompare(a.documentDate));

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  private intersect(a: Set<string>, b: Set<string>): Set<string> {
    const result = new Set<string>();
    for (const id of a) {
      if (b.has(id)) result.add(id);
    }
    return result;
  }

  getStats(): {
    totalDocuments: number;
    byKind: Partial<Record<DocumentKind, number>>;
    totalChunks: number;
    processedDocuments: number;
    symbolsCovered: number;
    fiscalYearsCovered: number;
  } {
    const byKind: Partial<Record<DocumentKind, number>> = {};
    let totalChunks = 0;
    let processed = 0;

    for (const doc of this.documents.values()) {
      byKind[doc.kind] = (byKind[doc.kind] ?? 0) + 1;
      if (doc.isProcessed) processed++;
    }

    for (const chunks of this.chunks.values()) {
      totalChunks += chunks.length;
    }

    return {
      totalDocuments: this.documents.size,
      byKind,
      totalChunks,
      processedDocuments: processed,
      symbolsCovered: this.bySymbol.size,
      fiscalYearsCovered: this.byYear.size,
    };
  }
}

export const documentStore = new DocumentStore();
