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

  it('falls back to the requested symbol when stale payload identity is blank', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        symbol: '   ',
        research: {
          ...responsePayload.research,
          symbol: '',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch(' infy ');

    expect(result.symbol).toBe('INFY');
    expect(result.research.symbol).toBe('INFY');
  });

  it('normalizes public narrative text before rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          headline: '  Research headline  ',
          thesis: ['  Quality metrics support the business thesis.  ', '', '   '],
          risksToReview: ['  Margin volatility remains a risk to review.  '],
          whatToWatch: ['  Next result and margin trend.  '],
          evidenceReview: {
            ...responsePayload.research.evidenceReview,
            summary: '  Required research evidence is available for this view.  ',
          },
          factorViews: [{
            key: 'quality',
            label: '  Quality  ',
            score: 78,
            summary: '  Quality evidence is available for this research view.  ',
          }],
          methodNote: '  Research-only output. Not personal investment advice.  ',
          generatedAt: '  2026-06-27T00:00:00.000Z  ',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.headline).toBe('Research headline');
    expect(result.research.thesis).toEqual(['Quality metrics support the business thesis.']);
    expect(result.research.risksToReview).toEqual(['Margin volatility remains a risk to review.']);
    expect(result.research.whatToWatch).toEqual(['Next result and margin trend.']);
    expect(result.research.evidenceReview.summary).toBe('Required research evidence is available for this view.');
    expect(result.research.factorViews).toEqual([{
      key: 'quality',
      label: 'Quality',
      score: 78,
      summary: 'Quality evidence is available for this research view.',
    }]);
    expect(result.research.methodNote).toBe('Research-only output. Not personal investment advice.');
    expect(result.research.generatedAt).toBe('2026-06-27T00:00:00.000Z');
  });

  it('filters direct recommendation language from public narrative fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          headline: 'Strong Buy setup from upstream model',
          thesis: [
            'Quality metrics support the business thesis.',
            'Buy now because the setup is perfect.',
          ],
          risksToReview: ['Guaranteed return claims should not render.'],
          whatToWatch: ['Next result and margin trend.', 'Sell immediately if support breaks.'],
          evidenceReview: {
            ...responsePayload.research.evidenceReview,
            summary: 'Sure shot evidence summary from upstream provider.',
          },
          factorViews: [{
            key: 'quality',
            label: 'Quality',
            score: 78,
            summary: 'Hold recommendation should not reach public factor copy.',
          }],
          methodNote: 'Multibagger guarantee generated by upstream provider.',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.headline).toBe('');
    expect(result.research.thesis).toEqual(['Quality metrics support the business thesis.']);
    expect(result.research.risksToReview).toEqual([]);
    expect(result.research.whatToWatch).toEqual(['Next result and margin trend.']);
    expect(result.research.evidenceReview.summary).toBe('Research evidence status is unavailable for this view.');
    expect(result.research.factorViews).toEqual([]);
    expect(result.research.methodNote).toBe('');
  });

  it('falls back from invalid research states before public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          state: 'Strong buy',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.state).toBe('Needs review');
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

  it('normalizes malformed evidence review flags before public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          evidenceReview: {
            needsReview: 'yes',
            partial: ['fundamentals'],
            missing: [],
            summary: 'Some research evidence needs review.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.evidenceReview.needsReview).toBe(true);
  });

  it('keeps review enabled when evidence gaps conflict with a stale false flag', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          evidenceReview: {
            needsReview: false,
            partial: ['fundamentals'],
            missing: ['sector_context'],
            summary: 'Some research evidence needs review.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.evidenceReview.needsReview).toBe(true);
    expect(result.research.evidenceReview.partial).toEqual(['fundamentals']);
    expect(result.research.evidenceReview.missing).toEqual(['sector_context']);
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

  it('deduplicates evidence domains before public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          evidenceReview: {
            needsReview: true,
            partial: ['fundamentals', 'fundamentals', 'news', 'news'],
            missing: ['sector_context', 'sector_context', 'technicals'],
            summary: 'Some research evidence needs review.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.evidenceReview.partial).toEqual(['fundamentals', 'news']);
    expect(result.research.evidenceReview.missing).toEqual(['sector_context', 'technicals']);
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

  it('throws a typed incomplete error for malformed successful research payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: null,
      }),
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toMatchObject({
      code: 'INCOMPLETE_RESEARCH_RESPONSE',
      message: 'Research response was incomplete.',
      status: 200,
    });
  });

  it('throws a typed public-safe error for unavailable research', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        code: 'PROVIDER_UPSTREAM_FAILURE',
        message: 'Backend provider failed because the upstream adapter timed out.',
      }),
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toMatchObject({
      code: 'PROVIDER_UPSTREAM_FAILURE',
      message: 'Research is temporarily unavailable for this company.',
      status: 503,
    });
  });

  it('throws public-safe error copy when unavailable research returns a non-object payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => 'upstream adapter failure',
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toMatchObject({
      code: undefined,
      message: 'Research is temporarily unavailable for this company.',
      status: 502,
    });
  });
});
