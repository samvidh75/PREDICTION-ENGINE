/**
 * Knowledge Base — RAG Document Store
 *
 * Lightweight in-memory knowledge base for contextual intelligence.
 * In production this wraps a vector database (e.g. pgvector).
 *
 * Responsibilities:
 *   - Store & index documents with metadata
 *   - Semantic retrieval (simple TF-IDF fallback)
 *   - Source tracking for compliance
 */

export interface KnowledgeDocument {
  id: string;
  content: string;
  source: string;
  symbol?: string;
  sector?: string;
  tags: string[];
  timestamp: string;
  embedding?: number[];
}

export interface KnowledgeQueryResult {
  content: string;
  score: number;
  source: string;
  document: KnowledgeDocument;
}

export class KnowledgeBase {
  private documents: KnowledgeDocument[] = [];

  /** Ingest a document into the knowledge base. */
  ingest(doc: KnowledgeDocument): void {
    this.documents.push(doc);
  }

  /** Bulk ingest. */
  ingestMany(docs: KnowledgeDocument[]): void {
    this.documents.push(...docs);
  }

  /**
   * Query the knowledge base.
   *
   * Uses simple keyword overlap scoring (TF-IDF-like) when embeddings
   * are not available. Replace with vector similarity search in prod.
   */
  query(text: string, topK: number = 5): KnowledgeQueryResult[] {
    const queryTerms = text.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const scored = this.documents.map((doc) => {
      const docText = doc.content.toLowerCase();
      const matchCount = queryTerms.filter(t => docText.includes(t)).length;
      const score = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
      return { doc, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(r => ({
      content: r.doc.content,
      score: r.score,
      source: r.doc.source,
      document: r.doc,
    }));
  }

  /** Filter documents by symbol or sector. */
  findBySymbol(symbol: string): KnowledgeDocument[] {
    return this.documents.filter(d => d.symbol === symbol);
  }

  findBySector(sector: string): KnowledgeDocument[] {
    return this.documents.filter(d => d.sector === sector);
  }

  /** Count of indexed documents. */
  get count(): number {
    return this.documents.length;
  }

  /** Clear all documents (for testing). */
  clear(): void {
    this.documents = [];
  }
}

export const globalKnowledgeBase = new KnowledgeBase();
