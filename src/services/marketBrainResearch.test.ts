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

  it('normalizes response identity fields before public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        symbol: ' tcs ',
        companyName: ' Tata Consultancy Services ',
        research: {
          ...responsePayload.research,
          symbol: ' tcs ',
          companyName: ' Tata Consultancy Services ',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.symbol).toBe('TCS');
    expect(result.companyName).toBe('Tata Consultancy Services');
    expect(result.research.symbol).toBe('TCS');
    expect(result.research.companyName).toBe('Tata Consultancy Services');
  });

  it('falls back from invalid conviction scores before public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          convictionScore: 101,
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.convictionScore).toBe(0);
  });

  it('filters unknown evidence domains from public client metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          evidenceReview: {
            needsReview: true,
            partial: ['fundamentals', 'unknown_domain'],
            missing: ['sector_context', 'legacy_domain'],
            summary: 'Some research evidence needs review.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.evidenceReview.partial).toEqual(['fundamentals']);
    expect(result.research.evidenceReview.missing).toEqual(['sector_context']);
  });

  it('filters malformed factor views from public client output', async () => {
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
              score: 78,
              summary: 'Quality evidence is available for this research view.',
            },
            {
              key: 'legacy_factor',
              label: 'Legacy factor',
              score: 10,
              summary: 'Unsupported factor metadata should not reach public rendering.',
            },
            {
              key: 'risk',
              label: '',
              score: 40,
              summary: 'Blank labels should not reach public rendering.',
            },
            {
              key: 'momentum',
              label: 'Momentum',
              score: Number.NaN,
              summary: 'Non-finite scores should not reach public rendering.',
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
        score: 78,
        summary: 'Quality evidence is available for this research view.',
      },
    ]);
  });

  it('filters out-of-range factor scores from public client output', async () => {
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
              score: 0,
              summary: 'Lower bound score is valid for this research view.',
            },
            {
              key: 'growth',
              label: 'Growth',
              score: 100,
              summary: 'Upper bound score is valid for this research view.',
            },
            {
              key: 'valuation',
              label: 'Valuation',
              score: -1,
              summary: 'Negative scores should not reach public rendering.',
            },
            {
              key: 'momentum',
              label: 'Momentum',
              score: 101,
              summary: 'Scores above the public range should not reach public rendering.',
            },
          ],
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.factorViews.map((factorView) => factorView.score)).toEqual([0, 100]);
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
