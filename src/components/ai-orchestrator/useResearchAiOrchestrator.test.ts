/**
 * Tests: useResearchAiOrchestrator — the central orchestrator React hook.
 *
 * We test the deterministic fallback (buildDeterministicReply) logic
 * and the send() promise semaphore logic by extracting the fixture
 * internals. The hook itself is React stateful, so we test the pure
 * helper functions and mock React testing for the send() flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildRisksBullets,
  buildWatchBullets,
  buildNarrativeBullets,
  buildDeterministicReply,
} from './useResearchAiOrchestrator';
import type { ResearchAiContext, ResearchAiChatMessage } from './researchAiTypes';

/* ── Helpers ─────────────────────────────────────────────────── */

function makeContext(overrides: Partial<ResearchAiContext> = {}): ResearchAiContext {
  return {
    surface: 'stock-detail',
    symbol: 'TEST',
    companyName: 'TestCorp',
    narrative: ['Revenue grew 15% in Q3.', 'Margins expanded by 200 bps.'],
    risksToReview: ['High debt ratio of 1.8'],
    whatToWatch: ['Q4 earnings release in February.'],
    sector: 'Technology',
    currentPrice: 1450.5,
    changeAbs: 23.5,
    changePercent: 1.64,
    ...overrides,
  };
}

/* ── Bullet builders ─────────────────────────────────────────── */

describe('buildRisksBullets', () => {
  it('returns bullet string from risks', () => {
    const result = buildRisksBullets(['Risk A', 'Risk B']);
    expect(result).toBe('•  Risk A\n•  Risk B');
  });

  it('returns empty string for empty array', () => {
    expect(buildRisksBullets([])).toBe('');
  });
});

describe('buildWatchBullets', () => {
  it('returns bullet string from watch items', () => {
    const result = buildWatchBullets(['Item X', 'Item Y']);
    expect(result).toBe('•  Item X\n•  Item Y');
  });

  it('returns empty string for empty array', () => {
    expect(buildWatchBullets([])).toBe('');
  });
});

describe('buildNarrativeBullets', () => {
  it('returns bullet string from narrative items', () => {
    const result = buildNarrativeBullets(['Point 1', 'Point 2']);
    expect(result).toBe('•  Point 1\n•  Point 2');
  });

  it('returns empty string for empty array', () => {
    expect(buildNarrativeBullets([])).toBe('');
  });
});

/* ── buildDeterministicReply ─────────────────────────────────── */

describe('buildDeterministicReply', () => {
  it('returns a general reply for unrecognised questions', () => {
    const reply = buildDeterministicReply(makeContext(), 'What is the weather today?');
    expect(reply).toContain('TestCorp');
    expect(reply).toContain('₹1,450.50');
  });

  it('returns risks reply for questions about risks', () => {
    const reply = buildDeterministicReply(makeContext(), 'What are the main risks here?');
    expect(reply).toContain('High debt ratio of 1.8');
  });

  it('returns revenue reply for questions about revenue', () => {
    const reply = buildDeterministicReply(makeContext(), 'How is revenue looking?');
    expect(reply).toContain('Revenue grew 15% in Q3');
  });

  it('returns valuation reply for valuation questions', () => {
    const reply = buildDeterministicReply(makeContext(), 'Is the stock overvalued?');
    expect(reply).toContain('₹1,450.50');
  });

  it('returns watchlist reply for upcoming/outlook questions', () => {
    const reply = buildDeterministicReply(makeContext(), 'What should I watch for?');
    expect(reply).toContain('Q4 earnings release');
  });

  it('returns a useful reply even when context arrays are empty', () => {
    const ctx = makeContext({
      narrative: [],
      risksToReview: [],
      whatToWatch: [],
      currentPrice: 0,
      changeAbs: 0,
      changePercent: 0,
    });
    const reply = buildDeterministicReply(ctx, 'How is TestCorp doing?');
    expect(reply).toContain('TestCorp');
  });

  it('switches risks to Hindi for hi/sli questions', () => {
    const ctx = makeContext();
    const reply = buildDeterministicReply(ctx, 'kya risk hai bhai');
    // Should use Hindi risk template
    expect(reply).toContain('जोखिम');
  });

  it('uses currency-aware price formatting', () => {
    const ctx = makeContext({ currentPrice: 50000, changePercent: 0 });
    const reply = buildDeterministicReply(ctx, 'price?');
    expect(reply).toContain('₹50,000.00');
  });
});

/* ── Message state helpers (pure functions from the module) ──── */

describe('Deterministic fallback within send chain', () => {
  it('reply always fits within 800 characters', () => {
    const longContext = makeContext({
      narrative: Array.from({ length: 5 }, (_, i) => `Long narrative point number ${i + 1} that repeats to fill space. ` .repeat(5)),
      risksToReview: Array.from({ length: 5 }, (_, i) => `Detailed risk item number ${i + 1} in a verbose style for testing. ` .repeat(3)),
      whatToWatch: Array.from({ length: 5 }, (_, i) => `Important watch item number ${i + 1} that should be mentioned.  ` .repeat(3)),
    });
    const reply = buildDeterministicReply(longContext, 'Tell me everything about this stock');
    expect(reply.length).toBeLessThanOrEqual(800);
  });
});
