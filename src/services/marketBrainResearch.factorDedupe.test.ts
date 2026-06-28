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
    evidenceReview: {
      needsReview: false,
      partial: [],
      missing: [],
      summary: 'Required research evidence is available for this view.',
    },
    factorViews: [],
    methodNote: 'Research-only output.',
    generatedAt: '2026-06-27T00:00:00.000Z',
  },
};

describe('fetchMarketBrainResearch factor normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates repeated public factor keys before rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          factorViews: [
            {
              key: 'quality',
              label: 'Quality',
              score: 72,
              summary: 'Quality evidence is available for this research view.',
            },
            {
              key: 'quality',
              label: 'Quality duplicate',
              score: 44,
              summary: 'Duplicate quality evidence should not render twice.',
            },
            {
              key: 'growth',
              label: 'Growth',
              score: 61,
              summary: 'Growth evidence is available for this research view.',
            },
          ],
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.factorViews.map((factorView) => factorView.key)).toEqual(['quality', 'growth']);
    expect(result.research.factorViews).toHaveLength(2);
  });
});
