import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

describe('fetchMarketBrainResearch malformed payload handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects blank symbols before calling the research endpoint', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchMarketBrainResearch('   ')).rejects.toMatchObject({
      code: 'SYMBOL_REQUIRED',
      message: 'A symbol is required to load research.',
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects successful responses with non-object research payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        symbol: 'TCS',
        companyName: 'TCS',
        research: 'adapter returned a malformed research view',
      }),
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toMatchObject({
      code: 'RESEARCH_UNAVAILABLE',
      message: 'Research is temporarily unavailable for this company.',
      status: 200,
    });
  });

  it('rejects successful non-json responses with a typed unavailable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new Error('invalid json'); },
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toMatchObject({
      code: 'RESEARCH_UNAVAILABLE',
      message: 'Research is temporarily unavailable for this company.',
      status: 200,
    });
  });

  it('uses public-safe error copy when failed responses are not JSON objects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => 'upstream provider timeout',
    }));

    await expect(fetchMarketBrainResearch('TCS')).rejects.toMatchObject({
      code: 'RESEARCH_UNAVAILABLE',
      message: 'Research is temporarily unavailable for this company.',
      status: 502,
    });
  });
});
