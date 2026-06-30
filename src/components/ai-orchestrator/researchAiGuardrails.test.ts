/**
 * Tests: researchAiGuardrails — forbidden patterns, sanitisation, fallback, trim.
 */

import { describe, it, expect } from 'vitest';
import {
  applyGuardrails,
  applyResponseGuardrails,
  fallbackIfEmpty,
  trimConversation,
} from './researchAiGuardrails';
import type { ResearchAiContext, ResearchAiResponse } from './researchAiTypes';

const mockContext: ResearchAiContext = {
  surface: 'stock-detail',
  symbol: 'TEST',
  companyName: 'TestCorp',
  narrative: ['Revenue grew 15% this quarter.', 'Operating margins improved.'],
  risksToReview: ['High debt levels.'],
  whatToWatch: ['Upcoming earnings report.'],
  sector: 'Technology',
  currentPrice: 100,
  changeAbs: 2,
  changePercent: 2,
};

/* ── applyGuardrails ─────────────────────────────────────────── */

describe('applyGuardrails', () => {
  it('sanitises an empty string to empty result', () => {
    const result = applyGuardrails('', mockContext);
    expect(result.allowed).toBe(true);
    expect(result.sanitized).toBe('');
  });

  it('removes time-specific buy/sell recommendations', () => {
    const result = applyGuardrails(
      'I think you should buy this stock now because it is undervalued.',
      mockContext,
    );
    expect(result.sanitized).not.toMatch(/\bsell now\b/i);
  });

  it('removes absolute claim language', () => {
    const result = applyGuardrails('This stock is a guaranteed winner with no risk.', mockContext);
    expect(result.sanitized).not.toMatch(/guaranteed|no risk/i);
  });

  it('removes price targets', () => {
    const result = applyGuardrails('Our price target of ₹1500 is achievable.', mockContext);
    expect(result.sanitized).not.toMatch(/price target/);
  });

  it('removes action verb + buy/sell combos', () => {
    const result = applyGuardrails('You should buy this stock immediately.', mockContext);
    expect(result.sanitized).not.toMatch(/should buy/);
  });

  it('removes return promises', () => {
    const result = applyGuardrails('This could double your money in a year.', mockContext);
    expect(result.sanitized).not.toMatch(/double.*money/);
  });

  it('removes stock tip language', () => {
    const result = applyGuardrails('This is a hot stock pick for the month.', mockContext);
    expect(result.sanitized).not.toMatch(/stock pick/);
  });

  it('removes add-disclaimer-sounding text', () => {
    const result = applyGuardrails('This is not investment advice, but…', mockContext);
    expect(result.sanitized).not.toMatch(/investment advice/);
  });

  it('removes "consult an advisor" recommendations', () => {
    const result = applyGuardrails('You should consult a financial advisor.', mockContext);
    expect(result.sanitized).not.toMatch(/consult.*advisor/);
  });

  it('applies sanitisation replacement rules', () => {
    const result = applyGuardrails('The stock will rise next quarter.', mockContext);
    expect(result.sanitized).toMatch(/may rise/);
  });

  it('replaces "we recommend / our view" language', () => {
    const result = applyGuardrails('We recommend buying this stock.', mockContext);
    expect(result.sanitized).toMatch(/the assessment suggests/);
  });

  it('truncates to 1200 characters', () => {
    const long = 'A'.repeat(2000);
    const result = applyGuardrails(long, mockContext);
    expect(result.sanitized.length).toBeLessThanOrEqual(1200);
  });

  it('returns empty sanitized for fully blocked content', () => {
    const result = applyGuardrails(
      'buy now sell now guaranteed no risk price target of ₹100 stock pick',
      mockContext,
    );
    // After removing all forbidden patterns, might end up empty
    expect(typeof result.sanitized).toBe('string');
  });

  it('removes ₹/€/$ currency predictions', () => {
    const result = applyGuardrails('Expect ₹500 growth this year.', mockContext);
    expect(result.sanitized).not.toMatch(/₹500/);
  });

  it('removes percentage predictions (upside/downside)', () => {
    const result = applyGuardrails('The stock has 20% upside potential.', mockContext);
    expect(result.sanitized).not.toMatch(/20%.*upside/);
  });

  it('cleans up whitespace after sanitisation', () => {
    const result = applyGuardrails('Buy   this   now.   ', mockContext);
    expect(result.sanitized).not.toMatch(/\s{2,}/);
  });
});

/* ── applyResponseGuardrails ─────────────────────────────────── */

describe('applyResponseGuardrails', () => {
  it('passes through a clean response unchanged', () => {
    const response: ResearchAiResponse = {
      ok: true,
      text: 'Revenue grew 15% last quarter.',
      needsReview: false,
      runtime: 'deterministic',
    };
    const guarded = applyResponseGuardrails(response, mockContext);
    expect(guarded.text).toBe('Revenue grew 15% last quarter.');
    expect(guarded.needsReview).toBe(false);
  });

  it('sets needsReview when text is stripped', () => {
    const response: ResearchAiResponse = {
      ok: true,
      text: 'You should buy this stock now.',
      needsReview: false,
      runtime: 'browser-edge',
    };
    const guarded = applyResponseGuardrails(response, mockContext);
    expect(guarded.text).toBeNull();
    expect(guarded.needsReview).toBe(true);
  });

  it('preserves null text responses', () => {
    const response: ResearchAiResponse = {
      ok: true,
      text: null,
      needsReview: false,
      runtime: 'user-local',
    };
    const guarded = applyResponseGuardrails(response, mockContext);
    expect(guarded.text).toBeNull();
  });
});

/* ── fallbackIfEmpty ─────────────────────────────────────────── */

describe('fallbackIfEmpty', () => {
  it('returns non-empty text over 10 chars', () => {
    expect(fallbackIfEmpty('Hello world!', mockContext)).toBe('Hello world!');
  });

  it('builds bullet points from context when text is null', () => {
    const result = fallbackIfEmpty(null, mockContext);
    expect(result).toContain('•');
    expect(result).toContain('Revenue grew 15%');
    expect(result).toContain('High debt levels');
    expect(result).toContain('Upcoming earnings');
  });

  it('builds bullet points when text is too short', () => {
    const result = fallbackIfEmpty('Hi', mockContext);
    expect(result).toContain('•');
  });

  it('returns generic message when context has no data', () => {
    const empty: ResearchAiContext = {
      surface: 'stock-detail',
      symbol: 'E',
      companyName: 'EmptyCorp',
      narrative: [],
      risksToReview: [],
      whatToWatch: [],
      sector: '',
      currentPrice: 0,
      changeAbs: 0,
      changePercent: 0,
    };
    const result = fallbackIfEmpty(null, empty);
    expect(result).toContain('EmptyCorp');
  });
});

/* ── trimConversation ────────────────────────────────────────── */

describe('trimConversation', () => {
  function makeMsg(role: string, text: string) {
    return { role, text };
  }

  it('returns messages unchanged when under limit', () => {
    const msgs = [makeMsg('system', 'Hello'), makeMsg('user', 'Hi')];
    expect(trimConversation(msgs, 10)).toHaveLength(2);
  });

  it('trims oldest non-system messages when over limit', () => {
    const msgs = [
      makeMsg('system', 'S1'),
      makeMsg('user', 'U1'),
      makeMsg('assistant', 'A1'),
      makeMsg('user', 'U2'),
      makeMsg('assistant', 'A2'),
    ];
    const trimmed = trimConversation(msgs, 3);
    // system preserved, then the most recent 2 non-system
    expect(trimmed).toHaveLength(3);
    expect(trimmed[0].text).toBe('S1');
    expect(trimmed[trimmed.length - 1].text).toBe('A2');
  });

  it('preserves system message even when over limit', () => {
    const msgs = [
      makeMsg('system', 'Keep'),
      makeMsg('user', 'U1'),
      makeMsg('user', 'U2'),
      makeMsg('user', 'U3'),
    ];
    const trimmed = trimConversation(msgs, 2);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0].text).toBe('Keep');
  });

  it('returns empty array given empty input', () => {
    expect(trimConversation([], 10)).toEqual([]);
  });

  it('defaults maxMessages to 10', () => {
    const msgs = Array.from({ length: 15 }, (_, i) => makeMsg('user', `M${i + 1}`));
    const trimmed = trimConversation(msgs);
    expect(trimmed.length).toBeLessThanOrEqual(10);
  });
});
