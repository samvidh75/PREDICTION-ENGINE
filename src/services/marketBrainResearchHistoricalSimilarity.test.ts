import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const basePayload = {
  symbol: 'TCS',
  companyName: 'TCS',
  research: {
    symbol: 'TCS',
    companyName: 'TCS',
    state: 'Watch',
    convictionScore: 61,
    headline: 'Research view is available.',
    thesis: ['Quality metrics support the business thesis.'],
    risksToReview: [],
    whatToWatch: ['Next result and margin trend.'],
    evidenceReview: {
      needsReview: false,
      partial: [],
      missing: [],
      summary: 'Required research evidence is available for this view.',
    },
    anomalyReview: null,
    factorViews: [],
    methodNote: 'Research-only output. Not personal investment advice.',
    generatedAt: '2026-06-27T00:00:00.000Z',
  },
};

describe('fetchMarketBrainResearch historical similarity normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes usable historical similarity context with safe public copy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          historicalSimilarityReview: {
            usable: true,
            sampleSize: 42,
            minSampleSize: 30,
            observations: [
              'Found 42 similar historical cases for research context.',
              'Found 42 similar historical cases for research context.',
              'Use this as historical context, not an instruction.',
            ],
            limitations: ['Some similar cases do not include outcome observations.'],
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.historicalSimilarityReview).toEqual({
      usable: true,
      sampleSize: 42,
      minSampleSize: 30,
      observations: [
        'Found 42 similar historical cases for research context.',
        'Use this as historical context, not an instruction.',
      ],
      limitations: ['Some similar cases do not include outcome observations.'],
      summary: 'Similar historical cases are available as research context.',
    });
  });

  it('keeps undersized historical samples research-only and not usable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          historicalSimilarityReview: {
            usable: true,
            sampleSize: 12,
            minSampleSize: 30,
            observations: ['Found 12 similar historical cases for research context.'],
            limitations: ['Not enough similar historical cases for this view yet.'],
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.historicalSimilarityReview).toMatchObject({
      usable: false,
      sampleSize: 12,
      minSampleSize: 30,
      summary: 'Not enough similar historical cases for this view yet.',
    });
  });

  it('returns null for malformed historical similarity metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          historicalSimilarityReview: {
            usable: true,
            sampleSize: Number.NaN,
            minSampleSize: Infinity,
            observations: ['Malformed numeric values should not render.'],
            limitations: [],
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.historicalSimilarityReview).toBeNull();
  });

  it('filters unsafe historical similarity copy from public output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          historicalSimilarityReview: {
            usable: true,
            sampleSize: 35,
            minSampleSize: 30,
            observations: [
              'Found 35 similar historical cases for research context.',
              'Buy because the target is guaranteed.',
              'Backend provider coverage is incomplete.',
            ],
            limitations: ['API freshness diagnostics should not render.'],
            summary: 'Strong Buy historical setup.',
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.historicalSimilarityReview).toEqual({
      usable: true,
      sampleSize: 35,
      minSampleSize: 30,
      observations: ['Found 35 similar historical cases for research context.'],
      limitations: [],
      summary: 'Similar historical cases are available as research context.',
    });
  });

  it('returns fresh historical similarity arrays', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...basePayload,
        research: {
          ...basePayload.research,
          historicalSimilarityReview: {
            usable: true,
            sampleSize: 31,
            minSampleSize: 30,
            observations: ['Found 31 similar historical cases for research context.'],
            limitations: [],
          },
        },
      }),
    }));

    const first = await fetchMarketBrainResearch('TCS');
    const second = await fetchMarketBrainResearch('TCS');

    expect(first.research.historicalSimilarityReview?.observations).not.toBe(
      second.research.historicalSimilarityReview?.observations,
    );
    expect(first.research.historicalSimilarityReview?.limitations).not.toBe(
      second.research.historicalSimilarityReview?.limitations,
    );
  });
});
