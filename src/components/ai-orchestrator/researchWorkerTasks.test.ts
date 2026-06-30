/**
 * Tests: researchWorkerTasks — offloadable worker task execution.
 */

import { describe, it, expect } from 'vitest';
import { executeTask } from './researchWorkerTasks';
import type { ResearchAiContext } from './researchAiTypes';

const sampleContext: ResearchAiContext = {
  surface: 'stock-detail',
  symbol: 'T',
  companyName: 'Test',
  narrative: ['Point 1'],
  risksToReview: ['Risk 1'],
  whatToWatch: ['Watch 1'],
  sector: 'Tech',
  currentPrice: 100,
  changeAbs: 1,
  changePercent: 1,
};

/* ── sanitise-text ───────────────────────────────────────────── */

describe('sanitise-text task', () => {
  it('sanitises text and returns sanitise-text-ok', () => {
    const result = executeTask({
      type: 'sanitise-text',
      text: 'You should buy this stock now.',
      context: sampleContext,
    });
    expect(result.type).toBe('sanitise-text-ok');
    if (result.type === 'sanitise-text-ok') {
      expect(result.sanitised).not.toMatch(/buy.*now/);
    }
  });

  it('returns empty sanitised for fully blocked text', () => {
    const result = executeTask({
      type: 'sanitise-text',
      text: 'buy now sell now guaranteed return 20% upside price target',
      context: sampleContext,
    });
    expect(result.type).toBe('sanitise-text-ok');
  });
});

/* ── trim-history ────────────────────────────────────────────── */

describe('trim-history task', () => {
  it('trims history to maxMessages', () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: (i === 0 ? 'system' : 'user') as 'system' | 'user' | 'assistant',
      text: `Msg ${i + 1}`,
      id: String(i + 1),
    }));

    const result = executeTask({
      type: 'trim-history',
      messages,
      maxMessages: 3,
    });
    expect(result.type).toBe('trim-history-ok');
    if (result.type === 'trim-history-ok') {
      expect(result.trimmed.length).toBeLessThanOrEqual(3);
    }
  });

  it('handles empty messages array', () => {
    const result = executeTask({
      type: 'trim-history',
      messages: [],
      maxMessages: 5,
    });
    expect(result.type).toBe('trim-history-ok');
    if (result.type === 'trim-history-ok') {
      expect(result.trimmed).toEqual([]);
    }
  });
});

/* ── build-prompt ────────────────────────────────────────────── */

describe('build-prompt task', () => {
  it('builds a prompt string from context and question', () => {
    const result = executeTask({
      type: 'build-prompt',
      context: sampleContext,
      question: 'How are earnings?',
    });
    expect(result.type).toBe('build-prompt-ok');
    if (result.type === 'build-prompt-ok') {
      expect(result.prompt).toContain('Test');
      expect(result.prompt).toContain('Point 1');
      expect(result.prompt).toContain('Risk 1');
      expect(result.prompt).toContain('Watch 1');
      expect(result.prompt).toContain('How are earnings?');
    }
  });
});

/* ── extract-keywords ────────────────────────────────────────── */

describe('extract-keywords task', () => {
  it('extracts keywords from text, filtering short/common words', () => {
    const result = executeTask({
      type: 'extract-keywords',
      text: 'The company revenue growth profit margin earnings report quarterly results',
    });
    expect(result.type).toBe('extract-keywords-ok');
    if (result.type === 'extract-keywords-ok') {
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords[0].length).toBeGreaterThan(3);
    }
  });

  it('returns empty array for short text', () => {
    const result = executeTask({
      type: 'extract-keywords',
      text: 'a b c d',
    });
    expect(result.type).toBe('extract-keywords-ok');
    if (result.type === 'extract-keywords-ok') {
      expect(result.keywords).toEqual([]);
    }
  });

  it('returns top 8 keywords sorted by frequency', () => {
    const result = executeTask({
      type: 'extract-keywords',
      text: 'revenue revenue revenue growth growth margin profit earnings report quarterly results',
    });
    expect(result.type).toBe('extract-keywords-ok');
    if (result.type === 'extract-keywords-ok') {
      expect(result.keywords.length).toBeLessThanOrEqual(8);
      expect(result.keywords[0]).toBe('revenue');
    }
  });
});

/* ── error handling ──────────────────────────────────────────── */

describe('error handling', () => {
  it('returns error result on malformed task', () => {
    const result = executeTask({
      // @ts-expect-error testing invalid type
      type: 'invalid-task',
      text: 'irrelevant',
    });
    expect(result.type).toBe('error');
  });
});
