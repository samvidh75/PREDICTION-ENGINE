/**
 * VectorStore — pgvector-based knowledge storage for RAG Engine
 *
 * Stores institutional knowledge (patterns, analyst notes, macro themes,
 * company learnings) with vector embeddings for similarity search.
 *
 * PROMPT 28 — RAG Knowledge Base Engine
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    _client = createClient(url, key);
  }
  return _client;
}

export interface KnowledgeEntry {
  symbol: string;
  type: 'pattern' | 'note' | 'macro' | 'learning';
  content: string;
  embedding: number[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface StoredKnowledge {
  id: string;
  symbol: string;
  type: string;
  content: string;
  embedding: number[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SimilarEntry extends StoredKnowledge {
  distance: number;
}

export class VectorStore {
  private readonly TABLE = 'intelligence_knowledge_base';

  /**
   * Initialize pgvector — verify the table and extension exist
   */
  async initializeVectorStore(): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from(this.TABLE)
        .select('count')
        .limit(1);

      if (error) {
        console.warn(`VectorStore: ${this.TABLE} may not exist — run migration: ${error.message}`);
        return false;
      }

      return true;
    } catch (e) {
      console.error('VectorStore init error:', e);
      return false;
    }
  }

  /**
   * Store a knowledge entry with its embedding vector
   */
  async storeKnowledge(entry: KnowledgeEntry): Promise<StoredKnowledge | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from(this.TABLE)
        .insert([
          {
            symbol: entry.symbol,
            type: entry.type,
            content: entry.content,
            embedding: entry.embedding,
            tags: entry.tags,
            metadata: entry.metadata,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('VectorStore storeKnowledge error:', error.message);
        return null;
      }

      return data as StoredKnowledge;
    } catch (e) {
      console.error('VectorStore storeKnowledge exception:', e);
      return null;
    }
  }

  /**
   * Batch store multiple knowledge entries
   */
  async storeBatch(entries: KnowledgeEntry[]): Promise<number> {
    let stored = 0;
    for (const entry of entries) {
      const result = await this.storeKnowledge(entry);
      if (result) stored++;
    }
    return stored;
  }

  /**
   * Search for similar entries using vector distance (cosine via <->)
   */
  async searchSimilar(
    embedding: number[],
    symbol: string,
    limit: number = 5,
  ): Promise<SimilarEntry[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('search_knowledge', {
        query_embedding: embedding,
        query_symbol: symbol,
        query_limit: limit,
      });

      if (error) {
        console.warn('VectorStore searchSimilar RPC error (may need migration):', error.message);
        return [];
      }

      return (data || []) as SimilarEntry[];
    } catch (e) {
      console.error('VectorStore searchSimilar exception:', e);
      return [];
    }
  }

  /**
   * Get all knowledge entries for a symbol
   */
  async getSymbolKnowledge(symbol: string): Promise<StoredKnowledge[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('symbol', symbol)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('VectorStore getSymbolKnowledge error:', error.message);
        return [];
      }

      return (data || []) as StoredKnowledge[];
    } catch (e) {
      console.error('VectorStore getSymbolKnowledge exception:', e);
      return [];
    }
  }

  /**
   * Delete knowledge entries for a symbol
   */
  async deleteSymbolKnowledge(symbol: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from(this.TABLE)
        .delete()
        .eq('symbol', symbol);

      if (error) {
        console.error('VectorStore deleteSymbolKnowledge error:', error.message);
        return false;
      }

      return true;
    } catch (e) {
      console.error('VectorStore deleteSymbolKnowledge exception:', e);
      return false;
    }
  }

  /**
   * Count knowledge entries by type for a symbol
   */
  async getKnowledgeStats(symbol: string): Promise<{
    total: number;
    patterns: number;
    notes: number;
    macro: number;
    learnings: number;
  }> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('type')
        .eq('symbol', symbol);

      if (error) return { total: 0, patterns: 0, notes: 0, macro: 0, learnings: 0 };

      const rows = data || [];
      return {
        total: rows.length,
        patterns: rows.filter((r: { type: string }) => r.type === 'pattern').length,
        notes: rows.filter((r: { type: string }) => r.type === 'note').length,
        macro: rows.filter((r: { type: string }) => r.type === 'macro').length,
        learnings: rows.filter((r: { type: string }) => r.type === 'learning').length,
      };
    } catch (e) {
      console.error('VectorStore getKnowledgeStats exception:', e);
      return { total: 0, patterns: 0, notes: 0, macro: 0, learnings: 0 };
    }
  }
}

export const vectorStore = new VectorStore();
