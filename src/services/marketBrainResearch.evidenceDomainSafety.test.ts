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

describe('fetchMarketBrainResearch evidence domain safety', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('trims and deduplicates allowed evidence domains before public rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          evidenceReview: {
            needsReview: false,
            partial: [' fundamentals ', 'fundamentals', 'unknown_domain'],
            missing: [' sector_context ', 'technicals', ' sector_context '],
            summary: 'Some research evidence needs review.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.evidenceReview.needsReview).toBe(true);
    expect(result.research.evidenceReview.partial).toEqual(['fundamentals']);
    expect(result.research.evidenceReview.missing).toEqual(['sector_context', 'technicals']);
  });
});
