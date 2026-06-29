import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const basePayload = {
  symbol: 'RELIANCE',
  companyName: 'Reliance Industries',
  research: {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries',
    state: 'Watch',
    convictionScore: 64,
    headline: 'Reliance needs review after the latest market event.',
    thesis: ['Volume expanded alongside the price move.'],
    risksToReview: ['Market-event evidence is incomplete and needs review.'],
    whatToWatch: ['Whether the market event persists or fades after more evidence.'],
    evidenceReview: {
      needsReview: true,
      partial: ['technicals'],
      missing: ['news_events'],
      summary: 'Some research evidence needs review.',
    },
    factorViews: [],
    methodNote: 'Research-only output. Not personal investment advice.',
    generatedAt: '2026-06-30T00:00:00.000Z',
  },
};

describe('market brain anomaly research normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes safe anomaly review context for public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          anomalyReview: {
            anomalyType: 'Volume-backed price move',
            severity: 'High',
            evidence: [
              '  Price moved -3.1% in 15m.  ',
              'Volume was 2.7x recent levels.',
              'Volume was 2.7x recent levels.',
            ],
            missingEvidence: ['news events', 'block deals', 'news events'],
            summary: '  Volume expanded alongside the price move.  ',
            narrativePromptPayload: 'internal payload should not be exposed',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('RELIANCE');

    expect(result.research.anomalyReview).toEqual({
      anomalyType: 'Volume-backed price move',
      severity: 'High',
      evidence: ['Price moved -3.1% in 15m.', 'Volume was 2.7x recent levels.'],
      missingEvidence: ['news events', 'block deals'],
      summary: 'Volume expanded alongside the price move.',
    });
  });

  it('drops malformed anomaly labels before public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          anomalyReview: {
            anomalyType: 'Buy setup',
            severity: 'Strong',
            evidence: ['Price moved +5% in 15m.'],
            missingEvidence: [],
            summary: 'Unsafe anomaly should not render.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('RELIANCE');

    expect(result.research.anomalyReview).toBeNull();
  });

  it('filters unsafe anomaly copy and never exposes narrative payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          anomalyReview: {
            anomalyType: 'Stock-specific move',
            severity: 'Medium',
            evidence: [
              'The move appears more stock-specific than market-wide.',
              'Provider API backend coverage failed.',
              'Buy now after this move.',
            ],
            missingEvidence: ['diagnostics', 'sector context'],
            summary: 'Strong Buy from provider backend.',
            narrativePromptPayload: 'Provider API backend payload should never render.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('RELIANCE');

    expect(result.research.anomalyReview).toEqual({
      anomalyType: 'Stock-specific move',
      severity: 'Medium',
      evidence: ['The move appears more stock-specific than market-wide.'],
      missingEvidence: ['sector context'],
      summary: 'The move appears more stock-specific than market-wide.',
    });
    expect(JSON.stringify(result)).not.toContain('narrativePromptPayload');
    expect(JSON.stringify(result)).not.toMatch(/provider|backend|API|Buy now|Strong Buy/i);
  });

  it('keeps missing anomaly review as null for stale payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => basePayload,
    }));

    const result = await fetchMarketBrainResearch('RELIANCE');

    expect(result.research.anomalyReview).toBeNull();
  });
});
