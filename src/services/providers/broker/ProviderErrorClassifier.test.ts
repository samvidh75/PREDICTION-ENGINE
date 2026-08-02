import { describe, expect, it, vi } from 'vitest';
import { classifyHttpStatus, classifyNetworkError, parseRetryAfter } from './ProviderErrorClassifier';

describe('ProviderErrorClassifier', () => {
  it('classifies transient and permanent HTTP statuses deterministically', () => {
    expect(classifyHttpStatus(400).retryable).toBe(false);
    expect(classifyHttpStatus(401).category).toBe('non_retryable_401');
    expect(classifyHttpStatus(403).category).toBe('non_retryable_403');
    expect(classifyHttpStatus(404).category).toBe('non_retryable_404');
    expect(classifyHttpStatus(408).category).toBe('retryable_timeout');
    expect(classifyHttpStatus(425).category).toBe('retryable_timeout');
    expect(classifyHttpStatus(429, undefined, 12_000).retryAfterMs).toBe(12_000);
    expect(classifyHttpStatus(500).category).toBe('retryable_5xx');
    expect(classifyHttpStatus(599).category).toBe('retryable_5xx');
    expect(classifyHttpStatus(700).category).toBe('unknown');
  });

  it('classifies abort errors without requiring DOMException', () => {
    expect(classifyNetworkError({ name: 'AbortError', message: 'aborted' }).category)
      .toBe('retryable_timeout');
    expect(classifyNetworkError(Object.assign(new Error('fetch failed'), { code: 'ENOTFOUND' })).category)
      .toBe('retryable_network');
    expect(classifyNetworkError(new Error('something else')).category)
      .toBe('unknown');
  });

  it('parses Retry-After seconds and HTTP-date values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T00:00:00.000Z'));

    expect(parseRetryAfter('5')).toBe(5_000);
    expect(parseRetryAfter('Sat, 13 Jun 2026 00:00:10 GMT')).toBe(10_000);
    expect(parseRetryAfter('bad-value')).toBe(60_000);

    vi.useRealTimers();
  });
});
