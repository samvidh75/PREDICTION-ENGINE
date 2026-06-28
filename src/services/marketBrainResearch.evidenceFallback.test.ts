import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const responsePayload = {
  symbol: 'TCS',
  companyName: 'TCS',
  research: {
    symbol: 'TCS',
    companyName: 'TCS',
    state: 'Needs review',
    convictionScore: 0,
    headline: 'Research view needs evidence review.',
    thesis: [],
    risksToReview: [],
    whatToWatch: [],
    evidenceReview: undefined,
    factorViews: [],
    methodNote: 'Research-only output. Not personal investment advice.',
    generatedAt: '2026-06-27T00:00:00.000Z',
  },
};

describe('fetchMarketBrainResearch empty evidence fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns fresh empty evidence review arrays for each normalized response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => responsePayload,
    }));

    const first = await fetchMarketBrainResearch('TCS');
    first.research.evidenceReview.partial.push('fundamentals');
    first.research.evidenceReview.missing.push('news');

    const second = await fetchMarketBrainResearch('TCS');

    expect(second.research.evidenceReview).toEqual({
      needsReview: false,
      partial: [],
      missing: [],
      summary: 'Research evidence status is unavailable for this view.',
    });
  });
});
