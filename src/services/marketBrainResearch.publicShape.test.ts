import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch, MarketBrainResearchError } from './marketBrainResearch';

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

  it('normalizes trimmed public factor keys before allowlist filtering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...publicResearchPayload,
        research: {
          ...publicResearchPayload.research,
          factorViews: [
            {
              key: ' quality ',
              label: '  Quality  ',
              score: 78,
              summary: '  Quality evidence is available for this research view.  ',
            },
            {
              key: ' quality ',
              label: 'Duplicate quality',
              score: 77,
              summary: 'Duplicate quality evidence should not render twice.',
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

  it('uses a public unavailable error when upstream research payload is incomplete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        symbol: 'TCS',
        companyName: 'TCS',
        backendDiagnostics: {
          adapter: 'internal-adapter',
          reason: 'missing research object',
        },
      }),
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toMatchObject({
      name: 'MarketBrainResearchError',
      message: 'Research is temporarily unavailable for this company.',
      status: 200,
      code: 'RESEARCH_UNAVAILABLE',
    } satisfies Partial<MarketBrainResearchError>);
  });
});
