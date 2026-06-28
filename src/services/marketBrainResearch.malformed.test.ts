import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

describe('fetchMarketBrainResearch malformed payload handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
      code: 'INCOMPLETE_RESEARCH_RESPONSE',
      message: 'Research response was incomplete.',
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
      code: undefined,
      message: 'Research is temporarily unavailable for this company.',
      status: 502,
    });
  });
});
