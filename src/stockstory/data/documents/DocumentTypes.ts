/**
 * Document Store Types
 *
 * Types for the annual report, investor presentation, and
 * other document corpus used by the RAG pipeline.
 */

export type DocumentKind =
  | 'annual_report'
  | 'investor_presentation'
  | 'concall_transcript'
  | 'agm_minutes'
  | 'credit_rating_report'
  | 'research_report'
  | 'drip_report'
  | 'sec_filing'
  | 'other';

export interface DocumentMetadata {
  id: string;
  symbol: string;
  companyName: string;
  kind: DocumentKind;
  title: string;
  fiscalYear: string;
  documentDate: string;
  language: string; // 'en', 'hi', etc.
  pageCount: number | null;
  fileUrl: string | null;
  localPath: string | null;
  sourceId: string;
  tags: string[];
  chunkCount: number;
  isProcessed: boolean;
  processedAt: string | null;
  errorMessage: string | null;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  tokenCount: number;
  embeddingId: string | null; // Qdrant embedding ID
}

export interface DocumentFilter {
  symbols?: string[];
  kinds?: DocumentKind[];
  fiscalYears?: string[];
  fromDate?: string;
  toDate?: string;
  tags?: string[];
  isProcessed?: boolean;
  limit?: number;
  offset?: number;
}
