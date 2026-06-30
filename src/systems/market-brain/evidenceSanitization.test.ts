// src/systems/market-brain/evidenceSanitization.test.ts
// Phase 8 — Tests for evidence sanitization helpers.

import { describe, it, expect } from 'vitest';
import {
  sanitizeEvidenceDomain,
  sanitizeEvidenceStrength,
  sanitizeEvidenceText,
  sanitizeEvidenceUrl,
  sanitizeEvidenceItem,
  buildEvidencePack,
} from './evidenceSanitization';

describe('sanitizeEvidenceDomain', () => {
  it('accepts valid domains', () => {
    expect(sanitizeEvidenceDomain('price_volume')).toBe('price_volume');
    expect(sanitizeEvidenceDomain('financial_statements')).toBe('financial_statements');
    expect(sanitizeEvidenceDomain('news_events')).toBe('news_events');
    expect(sanitizeEvidenceDomain('ownership')).toBe('ownership');
    expect(sanitizeEvidenceDomain('derivatives')).toBe('derivatives');
    expect(sanitizeEvidenceDomain('filings')).toBe('filings');
    expect(sanitizeEvidenceDomain('corporate_actions')).toBe('corporate_actions');
    expect(sanitizeEvidenceDomain('sector_context')).toBe('sector_context');
  });

  it('rejects unknown domains', () => {
    expect(sanitizeEvidenceDomain('unknown_domain')).toBeNull();
    expect(sanitizeEvidenceDomain('')).toBeNull();
    expect(sanitizeEvidenceDomain('  ')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(sanitizeEvidenceDomain('PRICE_VOLUME')).toBe('price_volume');
  });
});

describe('sanitizeEvidenceStrength', () => {
  it('accepts valid strengths', () => {
    expect(sanitizeEvidenceStrength('strong')).toBe('strong');
    expect(sanitizeEvidenceStrength('moderate')).toBe('moderate');
    expect(sanitizeEvidenceStrength('weak')).toBe('weak');
    expect(sanitizeEvidenceStrength('missing')).toBe('missing');
  });

  it('defaults unknown strengths to missing', () => {
    expect(sanitizeEvidenceStrength('unknown')).toBe('missing');
    expect(sanitizeEvidenceStrength('')).toBe('missing');
  });

  it('is case insensitive', () => {
    expect(sanitizeEvidenceStrength('Strong')).toBe('strong');
  });
});

describe('sanitizeEvidenceText', () => {
  it('trims whitespace', () => {
    expect(sanitizeEvidenceText('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeEvidenceText('')).toBe('');
    expect(sanitizeEvidenceText('   ')).toBe('');
  });

  it('strips banned plumbing terms', () => {
    const result = sanitizeEvidenceText('Data from RAG adapter pipeline');
    expect(result).not.toContain('RAG');
    expect(result).not.toContain('adapter');
    expect(result).not.toContain('pipeline');
  });

  it('strips multiple banned terms', () => {
    const result = sanitizeEvidenceText('RAG vector embedding chunk retrieval');
    expect(result).toBe('');
  });
});

describe('sanitizeEvidenceUrl', () => {
  it('accepts valid http/https URLs', () => {
    expect(sanitizeEvidenceUrl('https://example.com/doc')).toBe('https://example.com/doc');
    expect(sanitizeEvidenceUrl('http://example.com/doc')).toBe('http://example.com/doc');
  });

  it('rejects invalid URLs', () => {
    expect(sanitizeEvidenceUrl('not-a-url')).toBeNull();
    expect(sanitizeEvidenceUrl('')).toBeNull();
    expect(sanitizeEvidenceUrl(null)).toBeNull();
    expect(sanitizeEvidenceUrl(undefined)).toBeNull();
  });

  it('rejects non-http protocols', () => {
    expect(sanitizeEvidenceUrl('ftp://example.com')).toBeNull();
    expect(sanitizeEvidenceUrl('file:///etc/passwd')).toBeNull();
  });
});

describe('sanitizeEvidenceItem', () => {
  it('sanitizes a valid item', () => {
    const item = sanitizeEvidenceItem({
      id: 'test-1',
      domain: 'news_events',
      title: 'Breaking News',
      summary: 'Important news article',
      strength: 'strong',
      url: 'https://example.com/news',
    });
    expect(item).not.toBeNull();
    expect(item!.id).toBe('test-1');
    expect(item!.domain).toBe('news_events');
    expect(item!.strength).toBe('strong');
  });

  it('returns null for invalid domain', () => {
    const item = sanitizeEvidenceItem({
      id: 'test-1',
      domain: 'invalid_domain',
      title: 'Title',
      summary: 'Summary',
    });
    expect(item).toBeNull();
  });

  it('returns null for empty title and summary', () => {
    const item = sanitizeEvidenceItem({
      id: 'test-1',
      domain: 'news_events',
      title: '',
      summary: '',
    });
    expect(item).toBeNull();
  });

  it('sanitizes text content', () => {
    const item = sanitizeEvidenceItem({
      id: 'test-1',
      domain: 'news_events',
      title: 'Clean Title',
      summary: 'RAG vector embedding data',
    });
    expect(item!.summary).not.toContain('RAG');
  });
});

describe('buildEvidencePack', () => {
  it('builds an evidence pack from items', () => {
    const pack = buildEvidencePack({
      symbol: 'RELIANCE',
      items: [
        {
          id: 'e1',
          domain: 'news_events',
          title: 'News Article',
          summary: 'Latest news',
          strength: 'strong',
        },
        {
          id: 'e2',
          domain: 'financial_statements',
          title: 'Q3 Results',
          summary: 'Financial data',
          strength: 'moderate',
        },
      ],
    });

    expect(pack.symbol).toBe('RELIANCE');
    expect(pack.items).toHaveLength(2);
    expect(pack.availableDomains).toContain('news_events');
    expect(pack.availableDomains).toContain('financial_statements');
    expect(pack.needsReview).toBe(false);
  });

  it('marks weak/missing items as partial and needsReview', () => {
    const pack = buildEvidencePack({
      symbol: 'TCS',
      items: [
        {
          id: 'e1',
          domain: 'news_events',
          title: 'News',
          summary: 'Article',
          strength: 'weak',
        },
      ],
    });

    expect(pack.partialDomains).toContain('news_events');
    expect(pack.needsReview).toBe(true);
  });

  it('includes all missing domains', () => {
    const pack = buildEvidencePack({
      symbol: 'WIPRO',
      items: [
        {
          id: 'e1',
          domain: 'price_volume',
          title: 'Price',
          summary: 'Price data',
        },
      ],
    });

    expect(pack.missingDomains).toContain('financial_statements');
    expect(pack.missingDomains).toContain('news_events');
    expect(pack.missingDomains).not.toContain('price_volume');
  });

  it('normalizes symbol to uppercase', () => {
    const pack = buildEvidencePack({
      symbol: 'reliance',
      items: [],
    });
    expect(pack.symbol).toBe('RELIANCE');
  });

  it('generates a valid ISO timestamp', () => {
    const pack = buildEvidencePack({ symbol: 'TEST', items: [] });
    expect(() => new Date(pack.generatedAt)).not.toThrow();
  });
});
