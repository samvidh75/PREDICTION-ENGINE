import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMarketBrainResearch } from './useMarketBrainResearch';
import {
  fetchMarketBrainResearch,
  type MarketBrainResearchResponse,
} from '../services/marketBrainResearch';

vi.mock('../services/marketBrainResearch', () => ({
  fetchMarketBrainResearch: vi.fn(),
}));

const makeResearch = (symbol: string, headline = `${symbol} research narrative`): MarketBrainResearchResponse => ({
  symbol,
  companyName: symbol,
  research: {
    symbol,
    companyName: symbol,
    state: 'Watch',
    convictionScore: 61,
    headline,
    thesis: ['Quality evidence is available for review.'],
    risksToReview: ['Risk evidence requires periodic review.'],
    whatToWatch: ['Next filing cycle.'],
    evidenceReview: {
      needsReview: false,
      partial: [],
      missing: [],
      summary: 'Research evidence coverage is ready for narrative review.',
    },
    factorViews: [],
    methodNote: 'Research-only output. Not personal investment advice.',
    generatedAt: '2026-06-27T00:00:00.000Z',
  },
});

function HookProbe({ symbol }: { symbol: string | null | undefined }) {
  const { data, loading, error, reload } = useMarketBrainResearch(symbol);

  return (
    <section>
      <p aria-label="loading-state">{loading ? 'loading' : 'idle'}</p>
      <p aria-label="error-state">{error ?? 'no-error'}</p>
      <p aria-label="symbol-state">{data?.symbol ?? 'no-symbol'}</p>
      <p aria-label="headline-state">{data?.research.headline ?? 'no-headline'}</p>
      <button type="button" onClick={() => void reload()}>
        reload
      </button>
    </section>
  );
}

describe('useMarketBrainResearch', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes symbols before requesting research', async () => {
    vi.mocked(fetchMarketBrainResearch).mockResolvedValue(makeResearch('TCS'));

    render(<HookProbe symbol=" tcs " />);

    await waitFor(() => expect(screen.getByLabelText('symbol-state').textContent).toBe('TCS'));
    expect(fetchMarketBrainResearch).toHaveBeenCalledWith('TCS');
  });

  it('resets to an empty state without calling the client for blank symbols', () => {
    render(<HookProbe symbol="   " />);

    expect(screen.getByLabelText('loading-state').textContent).toBe('idle');
    expect(screen.getByLabelText('error-state').textContent).toBe('no-error');
    expect(screen.getByLabelText('symbol-state').textContent).toBe('no-symbol');
    expect(fetchMarketBrainResearch).not.toHaveBeenCalled();
  });

  it('reports reload errors with safe fallback state', async () => {
    vi.mocked(fetchMarketBrainResearch)
      .mockResolvedValueOnce(makeResearch('TCS'))
      .mockRejectedValueOnce(new Error('Research is temporarily unavailable.'));

    render(<HookProbe symbol="TCS" />);

    await waitFor(() => expect(screen.getByLabelText('symbol-state').textContent).toBe('TCS'));

    fireEvent.click(screen.getByText('reload'));

    await waitFor(() => expect(screen.getByLabelText('error-state').textContent).toBe('Research is temporarily unavailable.'));
    expect(screen.getByLabelText('symbol-state').textContent).toBe('no-symbol');
  });

  it('ignores stale research responses after a symbol change', async () => {
    let resolveOld: (value: MarketBrainResearchResponse) => void = () => undefined;
    const oldRequest = new Promise<MarketBrainResearchResponse>((resolve) => {
      resolveOld = resolve;
    });

    vi.mocked(fetchMarketBrainResearch)
      .mockReturnValueOnce(oldRequest)
      .mockResolvedValueOnce(makeResearch('INFY', 'INFY current narrative'));

    const { rerender } = render(<HookProbe symbol="TCS" />);
    rerender(<HookProbe symbol="INFY" />);

    await waitFor(() => expect(screen.getByLabelText('headline-state').textContent).toBe('INFY current narrative'));

    await act(async () => {
      resolveOld(makeResearch('TCS', 'TCS stale narrative'));
      await oldRequest;
    });

    expect(screen.getByLabelText('headline-state').textContent).toBe('INFY current narrative');
    expect(fetchMarketBrainResearch).toHaveBeenNthCalledWith(1, 'TCS');
    expect(fetchMarketBrainResearch).toHaveBeenNthCalledWith(2, 'INFY');
  });
});
