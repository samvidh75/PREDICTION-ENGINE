import { describe, expect, it } from 'vitest';
import { getQuoteFreshness } from './StockWorkspaceBar';

describe('getQuoteFreshness', () => {
  const now = Date.parse('2026-06-13T10:00:00.000Z');

  it('returns unavailable when the quote timestamp is absent or invalid', () => {
    expect(getQuoteFreshness(undefined, now)).toBe('Unavailable');
    expect(getQuoteFreshness('not-a-date', now)).toBe('Unavailable');
  });

  it('classifies recent, delayed and stale quote timestamps', () => {
    expect(getQuoteFreshness('2026-06-13T09:50:00.000Z', now)).toBe('Recent');
    expect(getQuoteFreshness('2026-06-13T08:00:00.000Z', now)).toBe('Delayed');
    expect(getQuoteFreshness('2026-06-11T10:00:00.000Z', now)).toBe('Stale');
  });

  it('rejects timestamps materially in the future', () => {
    expect(getQuoteFreshness('2026-06-13T10:10:00.000Z', now)).toBe('Unavailable');
  });
});
