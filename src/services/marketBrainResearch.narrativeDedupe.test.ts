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

describe('fetchMarketBrainResearch narrative deduplication', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates public narrative arrays after trimming, safety filtering, and case folding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...responsePayload,
        research: {
          ...responsePayload.research,
          thesis: [
            ' Quality metrics support the business thesis. ',
            'quality metrics support the business thesis.',
            'Buy now because the setup is perfect.',
            '',
          ],
          risksToReview: [
            'Margin volatility remains a risk to review.',
            ' MARGIN VOLATILITY REMAINS A RISK TO REVIEW. ',
            'Guaranteed return claims should not render.',
          ],
          whatToWatch: [
            'Next result and margin trend.',
            ' next result and margin trend. ',
            'Sell immediately if support breaks.',
          ],
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(result.research.thesis).toEqual(['Quality metrics support the business thesis.']);
    expect(result.research.risksToReview).toEqual(['Margin volatility remains a risk to review.']);
    expect(result.research.whatToWatch).toEqual(['Next result and margin trend.']);
  });
});
