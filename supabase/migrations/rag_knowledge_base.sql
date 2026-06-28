-- ============================================================
-- RAG Knowledge Base — pgvector Migration
-- PROMPT 28 — RAG Engine
--
-- Creates the vector store for institutional knowledge:
-- patterns, analyst notes, macro themes, company learnings.
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create knowledge base table
CREATE TABLE IF NOT EXISTS intelligence_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('pattern', 'note', 'macro', 'learning')),
  content TEXT,
  embedding VECTOR(1536),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Indexes for performance
-- IVFFlat index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON intelligence_knowledge_base
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- B-tree index for symbol-based lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_symbol
  ON intelligence_knowledge_base (symbol);

-- B-tree index for type filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_type
  ON intelligence_knowledge_base (type);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_knowledge_symbol_type
  ON intelligence_knowledge_base (symbol, type);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_updated_at ON intelligence_knowledge_base;
CREATE TRIGGER trg_knowledge_updated_at
  BEFORE UPDATE ON intelligence_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

-- 5. Vector similarity search function
-- Returns entries ordered by cosine distance (closest first)
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding VECTOR(1536),
  query_symbol VARCHAR(10) DEFAULT NULL,
  query_limit INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  symbol VARCHAR,
  type VARCHAR,
  content TEXT,
  embedding VECTOR(1536),
  distance DOUBLE PRECISION,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  IF query_symbol IS NOT NULL THEN
    -- Symbol-scoped search
    RETURN QUERY
    SELECT
      kb.id, kb.symbol, kb.type, kb.content, kb.embedding,
      kb.embedding <=> query_embedding AS distance,
      kb.tags, kb.metadata, kb.created_at, kb.updated_at
    FROM intelligence_knowledge_base kb
    WHERE kb.symbol = query_symbol
    ORDER BY kb.embedding <=> query_embedding
    LIMIT query_limit;
  ELSE
    -- Global search (across all symbols)
    RETURN QUERY
    SELECT
      kb.id, kb.symbol, kb.type, kb.content, kb.embedding,
      kb.embedding <=> query_embedding AS distance,
      kb.tags, kb.metadata, kb.created_at, kb.updated_at
    FROM intelligence_knowledge_base kb
    ORDER BY kb.embedding <=> query_embedding
    LIMIT query_limit;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Helper: Get knowledge stats for a symbol
CREATE OR REPLACE FUNCTION get_knowledge_stats(query_symbol VARCHAR(10))
RETURNS TABLE(
  total BIGINT,
  patterns BIGINT,
  notes BIGINT,
  macro BIGINT,
  learnings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE type = 'pattern')::BIGINT AS patterns,
    COUNT(*) FILTER (WHERE type = 'note')::BIGINT AS notes,
    COUNT(*) FILTER (WHERE type = 'macro')::BIGINT AS macro,
    COUNT(*) FILTER (WHERE type = 'learning')::BIGINT AS learnings
  FROM intelligence_knowledge_base
  WHERE symbol = query_symbol;
END;
$$ LANGUAGE plpgsql STABLE;
