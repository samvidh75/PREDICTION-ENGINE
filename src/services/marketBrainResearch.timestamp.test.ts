import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const responsePayload = {
  symbol: 'TCS',
  companyName: 'TCS',
  research: {
    symbol: 'TCS',
    companyName: 'TCS',
    state: 'High conviction',
    convictionScore: 82,
    headline: 'TCS is marked High conviction with 82/100 conviction.',
    thesis: ['Quality metrics support the business thesis.'],
    risksToReview: ['No dominant risk signal in the current research view.'],
    whatToWatch: ['Next result and margin trend.'],
    evidenceReview: {
      needsReview: false,
      partial: [],
      missing: [],
      summary: 'Required research evidence is available for this view.',
    },
    factorViews: [],
    methodNote: 'Research-only output. Not personal investment advice.',
    generatedAt: '2026-06-27T00:00:00.000Z',
  },
};

describe('fetchMarketBrainResearch timestamp normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes non-canonical generatedAt values from public research output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          generatedAt: 'not-a-public-timestamp',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.generatedAt).toBe('');
  });

  it('keeps canonical generatedAt timestamps after trimming public output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          generatedAt: '  2026-06-27T00:00:00.000Z  ',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.generatedAt).toBe('2026-06-27T00:00:00.000Z');
  });
});
