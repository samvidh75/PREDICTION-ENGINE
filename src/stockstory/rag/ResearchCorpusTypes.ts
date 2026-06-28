/**
 * Research Corpus Types
 *
 * Types for storing and retrieving research corpus entries
 * including document chunks, filing summaries, result summaries,
 * annual report notes, and other derived content.
 */

export type CorpusEntityKind =
  | 'document_chunk'
  | 'filing_summary'
  | 'result_summary'
  | 'annual_report_note'
  | 'investor_presentation_note'
  | 'transcript_note'
  | 'news_event_summary'
  | 'company_profile_fact'
  | 'sector_fact'
  | 'methodology_knowledge';

export interface CorpusDocument {
  id: string;
  symbol: string | null;
  kind: CorpusEntityKind;
  title: string;
  sourceId: string;
  documentId: string | null;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface CorpusChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embeddingAvailable: boolean;
}

export interface CorpusEntry {
  document: CorpusDocument;
  chunks: CorpusChunk[];
}

export interface CorpusSearchResult {
  document: CorpusDocument;
  chunk: CorpusChunk;
  score: number;
}

export interface CorpusQuery {
  text: string;
  symbol?: string;
  kinds?: CorpusEntityKind[];
  limit?: number;
}
