import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const responsePayload = {
  symbol: 'M&M',
  companyName: 'M&M',
  research: {
    symbol: 'M&M',
    companyName: 'M&M',
    state: 'Watch',
    convictionScore: 50,
    headline: 'Research headline.',
    thesis: [],
    risksToReview: [],
    whatToWatch: [],
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

describe('fetchMarketBrainResearch request symbol safety', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows PSE-style public symbols in request paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => responsePayload,
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchMarketBrainResearch(' m&m ');

    expect(fetchMock).toHaveBeenCalledWith('/api/stockstory/M%26M/research', expect.any(Object));
  });

  it('rejects malformed request symbols before calling the research endpoint', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchMarketBrainResearch('TCS/../../provider')).rejects.toMatchObject({
      code: 'SYMBOL_INVALID',
      message: 'A valid symbol is required to load research.',
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
