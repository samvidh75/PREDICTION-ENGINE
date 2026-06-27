import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch, MarketBrainResearchError } from './marketBrainResearch';

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

describe('fetchMarketBrainResearch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads product-safe market brain research by symbol', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => responsePayload,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchMarketBrainResearch(' tcs ');

    expect(fetchMock).toHaveBeenCalledWith('/api/stockstory/TCS/research', expect.any(Object));
    expect(result.research.state).toBe('High conviction');
  });

  it('normalizes stale research payloads without evidence review metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          evidenceReview: undefined,
          factorViews: undefined,
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.evidenceReview).toEqual({
      needsReview: false,
      partial: [],
      missing: [],
      summary: 'Research evidence status is unavailable for this view.',
    });
    expect(result.research.factorViews).toEqual([]);
  });

  it('throws a typed error for unavailable research', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ code: 'RESEARCH_TEMPORARILY_UNAVAILABLE', message: 'Research is temporarily unavailable for this company.' }),
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toBeInstanceOf(MarketBrainResearchError);
  });
});
