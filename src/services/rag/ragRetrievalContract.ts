// src/services/rag/ragRetrievalContract.ts
// Phase 8 — RAG retrieval contract for Market Brain evidence assembly.
//
// Defines the shape of documents returned by the retrieval layer and the
// query model used to request them.  The retrieval layer is deterministic
// (no LLM, no provider calls) and operates on locally indexed documents.
//
// Terminology that MUST NOT leak into user-facing copy:
//   RAG, vector, embedding, chunk, query, retrieval, pipeline

export type RagDocumentType =
  | 'news_article'
  | 'filing'
  | 'corporate_action'
  | 'analyst_note'
  | 'earnings_transcript'
  | 'research_report'
  | 'regulatory_filing'
  | 'other';

export interface RagDocumentChunk {
  id: string;
  documentType: RagDocumentType;
  sourceUrl?: string | null;
  title: string;
  content: string;
  relevanceScore: number; // 0–1, populated by retrieval layer
  publishedAt?: string | null; // ISO date
  chunkIndex: number; // 0-based position within parent document
}

export interface RagRetrievalQuery {
  symbol: string;
  domains: string[]; // e.g. ['news_events', 'filings']
  maxResultsPerDomain: number;
  allowDomains?: string[]; // URL allowlist for source links
}

export interface RagRetrievalResult {
  symbol: string;
  queriedAt: string; // ISO timestamp
  results: RagDocumentChunk[];
  totalChunks: number;
  domainCount: number;
  errors: string[];
}

// ─── Result helpers ─────────────────────────────────────────────────────────

export function emptyRetrievalResult(symbol: string): RagRetrievalResult {
  return {
    symbol: symbol.toUpperCase(),
    queriedAt: new Date().toISOString(),
    results: [],
    totalChunks: 0,
    domainCount: 0,
    errors: [],
  };
}

export function resultHasContent(result: RagRetrievalResult): boolean {
  return result.results.length > 0;
}

export function resultDomains(result: RagRetrievalResult): string[] {
  const domains = new Set(result.results.map((c) => c.documentType));
  return [...domains];
}
