import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const responsePayload = {
  symbol: 'TCS',
  companyName: 'Tata Consultancy Services',
  research: {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services',
    state: 'High conviction',
    convictionScore: 82,
    headline: 'TCS research view is available.',
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

describe('fetchMarketBrainResearch company name safety', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('filters recommendation language from top-level and nested company names', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        companyName: 'Strong Buy Tata Consultancy Services',
        research: {
          ...responsePayload.research,
          companyName: 'Guaranteed return Tata Consultancy Services',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.companyName).toBe('TCS');
    expect(result.research.companyName).toBe('TCS');
  });

  it('falls back to a nested safe company name when the top-level copy is unsafe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        companyName: 'Buy now Tata Consultancy Services',
        research: {
          ...responsePayload.research,
          companyName: ' Tata Consultancy Services ',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.companyName).toBe('Tata Consultancy Services');
    expect(result.research.companyName).toBe('Tata Consultancy Services');
  });

  it('falls back to the public symbol when company names are blank', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        symbol: ' infy ',
        companyName: '   ',
        research: {
          ...responsePayload.research,
          symbol: ' infy ',
          companyName: '',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('INFY');

    expect(result.companyName).toBe('INFY');
    expect(result.research.companyName).toBe('INFY');
  });
});
