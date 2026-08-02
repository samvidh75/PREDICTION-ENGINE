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

  it('keeps valid factor views while filtering malformed duplicate-key entries', async () => {
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
              label: '',
              score: 44,
              summary: 'Malformed duplicate quality evidence should not render.',
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

  it('keeps the first valid public factor view when duplicate keys are returned', async () => {
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
              label: 'Duplicate Quality',
              score: 58,
              summary: 'Duplicate quality evidence should not render twice.',
            },
            {
              key: 'valuation',
              label: 'Valuation',
              score: 49,
              summary: 'Valuation evidence is available for this research view.',
            },
            {
              key: 'valuation',
              label: 'Duplicate Valuation',
              score: 51,
              summary: 'Duplicate valuation evidence should not render twice.',
            },
          ],
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.factorViews).toEqual([
      {
        key: 'quality',
        label: 'Quality',
        score: 72,
        summary: 'Quality evidence is available for this research view.',
      },
      {
        key: 'valuation',
        label: 'Valuation',
        score: 49,
        summary: 'Valuation evidence is available for this research view.',
      },
    ]);
  });
});
