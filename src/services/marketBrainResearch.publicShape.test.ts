import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const publicResearchPayload = {
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

describe('fetchMarketBrainResearch public shape', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not pass through upstream provider or backend-only research fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...publicResearchPayload,
        research: {
          ...publicResearchPayload.research,
          provider: 'internal-provider',
          providerTraceId: 'trace-123',
          rawEvidence: [{ source: 'internal-adapter' }],
          backendDiagnostics: {
            adapter: 'internal-adapter',
            latencyMs: 42,
          },
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('TCS');

    expect(Object.keys(result.research).sort()).toEqual([
      'companyName',
      'convictionScore',
      'evidenceReview',
      'factorViews',
      'generatedAt',
      'headline',
      'methodNote',
      'risksToReview',
      'state',
      'symbol',
      'thesis',
      'whatToWatch',
    ].sort());
    expect(result.research).not.toHaveProperty('provider');
    expect(result.research).not.toHaveProperty('providerTraceId');
    expect(result.research).not.toHaveProperty('rawEvidence');
    expect(result.research).not.toHaveProperty('backendDiagnostics');
  });
});
