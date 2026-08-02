// src/services/rag/ragRetrievalContract.test.ts
// Phase 8 — Tests for RAG retrieval contract.

import { describe, it, expect } from 'vitest';
import {
  emptyRetrievalResult,
  resultHasContent,
  resultDomains,
} from './ragRetrievalContract';
import type { RagDocumentChunk, RagRetrievalResult } from './ragRetrievalContract';

describe('emptyRetrievalResult', () => {
  it('returns an empty result for a symbol', () => {
    const result = emptyRetrievalResult('RELIANCE');
    expect(result.symbol).toBe('RELIANCE');
    expect(result.results).toHaveLength(0);
    expect(result.totalChunks).toBe(0);
    expect(result.domainCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(() => new Date(result.queriedAt)).not.toThrow();
  });

  it('normalizes symbol to uppercase', () => {
    expect(emptyRetrievalResult('reliance').symbol).toBe('RELIANCE');
  });
});

describe('resultHasContent', () => {
  it('returns false for empty results', () => {
    expect(resultHasContent(emptyRetrievalResult('TEST'))).toBe(false);
  });

  it('returns true for results with chunks', () => {
    const result: RagRetrievalResult = {
      symbol: 'TEST',
      queriedAt: new Date().toISOString(),
      results: [{
        id: 'c1',
        documentType: 'news_article',
        title: 'Article',
        content: 'Content',
        relevanceScore: 0.9,
        chunkIndex: 0,
      }],
      totalChunks: 1,
      domainCount: 1,
      errors: [],
    };
    expect(resultHasContent(result)).toBe(true);
  });
});

describe('resultDomains', () => {
  it('returns unique document types from results', () => {
    const result: RagRetrievalResult = {
      symbol: 'TEST',
      queriedAt: new Date().toISOString(),
      results: [
        { id: 'c1', documentType: 'news_article', title: 'A', content: 'C', relevanceScore: 0.5, chunkIndex: 0 },
        { id: 'c2', documentType: 'news_article', title: 'B', content: 'D', relevanceScore: 0.5, chunkIndex: 1 },
        { id: 'c3', documentType: 'filing', title: 'E', content: 'F', relevanceScore: 0.5, chunkIndex: 0 },
      ],
      totalChunks: 3,
      domainCount: 2,
      errors: [],
    };
    const domains = resultDomains(result);
    expect(domains).toContain('news_article');
    expect(domains).toContain('filing');
    expect(domains).toHaveLength(2);
  });

  it('returns empty for empty results', () => {
    expect(resultDomains(emptyRetrievalResult('TEST'))).toHaveLength(0);
  });
});
