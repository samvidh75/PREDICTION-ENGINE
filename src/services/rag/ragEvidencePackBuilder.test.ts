// src/services/rag/ragEvidencePackBuilder.test.ts
// Phase 8 — Tests for building EvidencePack from RAG results.

import { describe, it, expect } from 'vitest';
import { buildEvidencePackFromRagResult } from './ragEvidencePackBuilder';
import type { RagRetrievalResult } from './ragRetrievalContract';
import { emptyRetrievalResult } from './ragRetrievalContract';

function makeResult(overrides: Partial<RagRetrievalResult> = {}): RagRetrievalResult {
  return {
    symbol: 'RELIANCE',
    queriedAt: '2025-01-01T00:00:00Z',
    results: [],
    totalChunks: 0,
    domainCount: 0,
    errors: [],
    ...overrides,
  };
}

describe('buildEvidencePackFromRagResult', () => {
  it('returns empty pack for empty result', () => {
    const pack = buildEvidencePackFromRagResult(emptyRetrievalResult('RELIANCE'));
    expect(pack.symbol).toBe('RELIANCE');
    expect(pack.items).toHaveLength(0);
    expect(pack.needsReview).toBe(false);
  });

  it('maps news_article chunks to news_events domain', () => {
    const result = makeResult({
      results: [{
        id: 'chunk-1',
        documentType: 'news_article',
        title: 'Market Update',
        content: 'The stock market rose sharply today.',
        relevanceScore: 0.9,
        publishedAt: '2025-01-01T00:00:00Z',
        chunkIndex: 0,
      }],
      totalChunks: 1,
      domainCount: 1,
    });
    const pack = buildEvidencePackFromRagResult(result);
    expect(pack.items).toHaveLength(1);
    expect(pack.items[0].domain).toBe('news_events');
    expect(pack.items[0].strength).toBe('strong');
  });

  it('maps filing chunks to filings domain', () => {
    const result = makeResult({
      results: [{
        id: 'chunk-2',
        documentType: 'filing',
        title: 'Annual Report',
        content: 'Annual financial report content.',
        relevanceScore: 0.7,
        chunkIndex: 0,
      }],
      totalChunks: 1,
      domainCount: 1,
    });
    const pack = buildEvidencePackFromRagResult(result);
    expect(pack.items).toHaveLength(1);
    expect(pack.items[0].domain).toBe('filings');
    expect(pack.items[0].strength).toBe('moderate');
  });

  it('skips unmapped document types', () => {
    const result = makeResult({
      results: [{
        id: 'chunk-3',
        documentType: 'other',
        title: 'Unknown',
        content: 'Some content',
        relevanceScore: 0.5,
        chunkIndex: 0,
      }],
      totalChunks: 1,
      domainCount: 1,
    });
    const pack = buildEvidencePackFromRagResult(result);
    expect(pack.items).toHaveLength(0);
  });

  it('classifies strength by relevance score', () => {
    const result = makeResult({
      results: [
        { id: 'c1', documentType: 'news_article', title: 'Strong', content: 'A', relevanceScore: 0.9, chunkIndex: 0 },
        { id: 'c2', documentType: 'news_article', title: 'Moderate', content: 'B', relevanceScore: 0.6, chunkIndex: 1 },
        { id: 'c3', documentType: 'news_article', title: 'Weak', content: 'C', relevanceScore: 0.3, chunkIndex: 2 },
      ],
      totalChunks: 3,
      domainCount: 1,
    });
    const pack = buildEvidencePackFromRagResult(result);
    expect(pack.items.find((i) => i.strength === 'strong')).toBeTruthy();
    expect(pack.items.find((i) => i.strength === 'moderate')).toBeTruthy();
    expect(pack.items.find((i) => i.strength === 'weak')).toBeTruthy();
  });

  it('truncates long content to 500 characters', () => {
    const longContent = 'x'.repeat(1000);
    const result = makeResult({
      results: [{
        id: 'c1',
        documentType: 'news_article',
        title: 'Long',
        content: longContent,
        relevanceScore: 0.9,
        chunkIndex: 0,
      }],
      totalChunks: 1,
      domainCount: 1,
    });
    const pack = buildEvidencePackFromRagResult(result);
    expect(pack.items[0].summary.length).toBe(501); // 500 + '…'
  });

  it('includes url and publishedAt when available', () => {
    const result = makeResult({
      results: [{
        id: 'c1',
        documentType: 'news_article',
        title: 'Article',
        content: 'Content',
        relevanceScore: 0.9,
        publishedAt: '2025-01-01T00:00:00Z',
        sourceUrl: 'https://example.com/article',
        chunkIndex: 0,
      }],
      totalChunks: 1,
      domainCount: 1,
    });
    const pack = buildEvidencePackFromRagResult(result);
    expect(pack.items[0].url).toBe('https://example.com/article');
    expect(pack.items[0].occurredAt).toBe('2025-01-01T00:00:00Z');
  });
});
