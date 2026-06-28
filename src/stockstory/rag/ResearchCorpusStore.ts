/**
 * Research Corpus Store
 *
 * In-memory store for research corpus entries. No production
 * dependency (Qdrant is optional). Falls back to text-based search.
 */

import type {
  CorpusEntry,
  CorpusDocument,
  CorpusChunk,
  CorpusSearchResult,
  CorpusQuery,
  CorpusEntityKind,
} from './ResearchCorpusTypes';
import { stableHash } from '../utils/hash';

export class ResearchCorpusStore {
  private documents: Map<string, CorpusDocument> = new Map();
  private chunks: Map<string, CorpusChunk[]> = new Map();
  private bySymbol: Map<string, Set<string>> = new Map();
  private byKind: Map<CorpusEntityKind, Set<string>> = new Map();

  /** Add a document with its chunks to the corpus */
  add(document: CorpusDocument, chunks: CorpusChunk[] = []): void {
    // Avoid duplicates
    if (this.documents.has(document.id)) return;

    this.documents.set(document.id, document);
    this.chunks.set(document.id, chunks);

    if (document.symbol) {
      const symSet = this.bySymbol.get(document.symbol.toUpperCase()) ?? new Set();
      symSet.add(document.id);
      this.bySymbol.set(document.symbol.toUpperCase(), symSet);
    }

    const kindSet = this.byKind.get(document.kind) ?? new Set();
    kindSet.add(document.id);
    this.byKind.set(document.kind, kindSet);
  }

  /** Search the corpus by text query */
  search(query: CorpusQuery): CorpusSearchResult[] {
    const results: CorpusSearchResult[] = [];
    const queryLower = query.text.toLowerCase();
    const limit = query.limit ?? 10;

    // Get candidate document IDs
    let candidateIds: Set<string> | null = null;

    if (query.symbol) {
      const symIds = this.bySymbol.get(query.symbol.toUpperCase());
      if (symIds) candidateIds = new Set(symIds);
    }

    if (query.kinds && query.kinds.length > 0) {
      const kindIds = new Set<string>();
      for (const k of query.kinds) {
        const ids = this.byKind.get(k);
        if (ids) for (const id of ids) kindIds.add(id);
      }
      candidateIds = candidateIds
        ? this.intersect(candidateIds, kindIds)
        : kindIds;
    }

    const docIds = candidateIds ?? new Set(this.documents.keys());

    // Score documents by text match
    for (const docId of docIds) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      const docChunks = this.chunks.get(docId) ?? [];

      for (const chunk of docChunks) {
        const chunkLower = chunk.content.toLowerCase();
        let score = 0;

        if (chunkLower.includes(queryLower)) {
          // Simple scoring by position and density
          score = 0.5 + (chunkLower.indexOf(queryLower) / Math.max(chunkLower.length, 1)) * 0.3;
          // Bonus for title match
          if (doc.title.toLowerCase().includes(queryLower)) {
            score += 0.2;
          }
        }

        if (score > 0) {
          results.push({ document: doc, chunk, score: Math.round(score * 100) / 100 });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /** Get all corpus entries for a symbol */
  getBySymbol(symbol: string, kind?: CorpusEntityKind): CorpusEntry[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];

    const entries: CorpusEntry[] = [];
    for (const id of ids) {
      const doc = this.documents.get(id);
      if (!doc) continue;
      if (kind && doc.kind !== kind) continue;
      entries.push({
        document: doc,
        chunks: this.chunks.get(id) ?? [],
      });
    }

    entries.sort((a, b) => b.document.createdAt.localeCompare(a.document.createdAt));
    return entries;
  }

  /** Get corpus statistics */
  getStats(): {
    totalDocuments: number;
    totalChunks: number;
    byKind: Partial<Record<CorpusEntityKind, number>>;
    symbolsCovered: number;
  } {
    const byKind: Partial<Record<CorpusEntityKind, number>> = {};
    let totalChunks = 0;

    for (const doc of this.documents.values()) {
      byKind[doc.kind] = (byKind[doc.kind] ?? 0) + 1;
    }

    for (const chunks of this.chunks.values()) {
      totalChunks += chunks.length;
    }

    return {
      totalDocuments: this.documents.size,
      totalChunks,
      byKind,
      symbolsCovered: this.bySymbol.size,
    };
  }

  private intersect(a: Set<string>, b: Set<string>): Set<string> {
    const result = new Set<string>();
    for (const id of a) {
      if (b.has(id)) result.add(id);
    }
    return result;
  }
}

export const researchCorpusStore = new ResearchCorpusStore();
