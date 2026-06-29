import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketBrainResearch } from './marketBrainResearch';

const baseResearch = {
  companyName: 'Test Company',
  state: 'Watch',
  convictionScore: 50,
  headline: 'Research view is available.',
  thesis: ['Research evidence is available.'],
  risksToReview: ['Review incoming disclosures.'],
  whatToWatch: ['Watch operating updates.'],
  evidenceReview: {
    needsReview: false,
    partial: [],
    missing: [],
    summary: 'Required research evidence is available for this view.',
  },
  factorViews: [],
  methodNote: 'Research-only output.',
  generatedAt: '2026-06-27T00:00:00.000Z',
};

describe('fetchMarketBrainResearch public symbol normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves exchange-style symbols containing ampersands before frontend rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        symbol: ' m&m ',
        companyName: 'M&M',
        research: {
          ...baseResearch,
          symbol: ' m&m ',
          companyName: 'M&M',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('m&m');

    expect(result.symbol).toBe('M&M');
    expect(result.research.symbol).toBe('M&M');
  });

  it('preserves exchange-style symbols containing hyphens before frontend rendering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        symbol: ' bajaj-auto ',
        companyName: 'Bajaj Auto',
        research: {
          ...baseResearch,
          symbol: ' bajaj-auto ',
          companyName: 'Bajaj Auto',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('bajaj-auto');

    expect(result.symbol).toBe('BAJAJ-AUTO');
    expect(result.research.symbol).toBe('BAJAJ-AUTO');
  });

  it('falls back to the requested symbol when upstream top-level and nested symbols are malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        symbol: '../../backend-provider',
        companyName: 'Test Company',
        research: {
          ...baseResearch,
          symbol: 'NSE:TEST<script>',
          companyName: 'Test Company',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('test-1');

    expect(result.symbol).toBe('TEST-1');
    expect(result.research.symbol).toBe('TEST-1');
  });

  it('uses a safe nested symbol when the top-level upstream symbol is malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        symbol: 'bad symbol with spaces',
        companyName: 'M&M',
        research: {
          ...baseResearch,
          symbol: ' m&m ',
          companyName: 'M&M',
        },
      }),
    }));

    const result = await fetchMarketBrainResearch('fallback');

    expect(result.symbol).toBe('M&M');
    expect(result.research.symbol).toBe('M&M');
  });
});
