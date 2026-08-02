import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WatchlistPage from './WatchlistPage';
import type { WatchlistIntelligence } from '../services/personalization/WatchlistIntelligenceEngine';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockRecordAction = vi.hoisted(() => vi.fn());
const unsafePublicCopy = /provider|transport|backend|adapter|narrativePromptPayload|guaranteed|sure shot|multibagger/i;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../services/personalization/UserActionMemory', () => ({
  recordAction: mockRecordAction,
}));

/** Seed the real localStorage-backed watchlist store with tickers, matching
 * services/portfolio/watchlistStore.ts's own storage shape — this page now
 * requires a real (non-empty) watchlist before it will call the
 * intelligence endpoint at all, so tests must seed one rather than relying
 * on a UI button that doesn't exist on this page. */
function seedWatchlist(tickers: string[]) {
  localStorage.setItem(
    'stockstory_multi_watchlist_v1_anonymous',
    JSON.stringify([
      { id: 'default', name: 'My Watchlist', tickers, isArchived: false, isFavourite: false, order: 0 },
    ]),
  );
}

const baseItem = {
  symbol: 'BDO',
  companyName: 'BDO Unibank',
  currentStatus: 'Needs review' as const,
  previousStatus: 'Stable' as const,
  conviction: 'Caution',
  score: 54,
  lastUpdated: '2026-06-30T09:00:00.000Z',
  scoreDirection: 'declining' as const,
  lastThesis: 'Margins need review after recent operating pressure.',
};

const watchlistIntel: WatchlistIntelligence = {
  items: [
    baseItem,
    {
      symbol: 'JFC',
      companyName: 'Jollibee Foods Corporation',
      currentStatus: 'Strengthening',
      previousStatus: 'Stable',
      conviction: 'Healthy',
      score: 72,
      lastUpdated: '2026-06-30T09:00:00.000Z',
      scoreDirection: 'improving',
      lastThesis: 'Store expansion improved the research context.',
    },
  ],
  needsReview: [baseItem],
  changedItems: [
    baseItem,
    {
      symbol: 'JFC',
      companyName: 'Jollibee Foods Corporation',
      currentStatus: 'Strengthening',
      previousStatus: 'Stable',
      conviction: 'Healthy',
      score: 72,
      lastUpdated: '2026-06-30T09:00:00.000Z',
      scoreDirection: 'improving',
      lastThesis: 'Store expansion improved the research context.',
    },
  ],
  alerts: [],
  generatedAt: '2026-06-30T09:15:00.000Z',
};

const watchlistIntelWithAlerts: WatchlistIntelligence = {
  ...watchlistIntel,
  alerts: [
    {
      id: 'BDO-risk-change-test',
      symbol: 'BDO',
      type: 'risk_change',
      title: 'BDO thesis needs review',
      body: 'Margin pressure should be reviewed before the next thesis update.',
      timestamp: '2026-06-30T09:10:00.000Z',
      acknowledged: false,
    },
  ],
};

function mockWatchlistFetch(payload: WatchlistIntelligence = watchlistIntel) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    }),
  );
}

describe('WatchlistPage thesis change integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mockNavigate.mockReset();
    mockRecordAction.mockReset();
    localStorage.clear();
  });

  it('loads watchlist intelligence and renders the safe thesis change panel', async () => {
    localStorage.setItem('auth_token', 'test-token');
    seedWatchlist(['BDO', 'JFC']);
    mockWatchlistFetch();

    render(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Watchlist research changes')).toBeTruthy();
    });

    expect(screen.getByText('Margins need review after recent operating pressure.')).toBeTruthy();
    expect(screen.getByText('Store expansion improved the research context.')).toBeTruthy();
    expect(screen.getByText('1 needs review')).toBeTruthy();
    expect(screen.getByText('2 thesis changes')).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('renders research alerts from watchlist intelligence safely', async () => {
    seedWatchlist(['BDO', 'JFC']);
    mockWatchlistFetch(watchlistIntelWithAlerts);

    render(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Important changes to review')).toBeTruthy();
    });

    expect(screen.getByText('1 research alert')).toBeTruthy();
    expect(screen.getByText('BDO thesis needs review')).toBeTruthy();
    expect(screen.getByText('Margin pressure should be reviewed before the next thesis update.')).toBeTruthy();
    expect(screen.getByText('Risk changed')).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('wires sanitized watchlist and alert context into the shared AI explanation surface', async () => {
    seedWatchlist(['BDO', 'JFC']);
    mockWatchlistFetch(watchlistIntelWithAlerts);

    render(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Research summary')).toBeTruthy();
    });

    expect(screen.getByText('Highlights the main thesis signals already shown on this page.')).toBeTruthy();
    expect(screen.getAllByText('A standard summary is available for this view.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('AI research question')).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('records safe handoff intent when research alert actions are used', async () => {
    seedWatchlist(['BDO', 'JFC']);
    mockWatchlistFetch(watchlistIntelWithAlerts);

    render(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Important changes to review')).toBeTruthy();
    });

    const compareButtons = screen.getAllByText('Compare');
    fireEvent.click(compareButtons[compareButtons.length - 1]);

    expect(mockRecordAction).toHaveBeenCalledWith('compare_open', 'BDO');
    expect(mockNavigate).toHaveBeenCalledWith('/compare?symbols=BDO');
  });

  it('records safe handoff intent when panel actions are used', async () => {
    seedWatchlist(['BDO', 'JFC']);
    mockWatchlistFetch();

    render(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Watchlist research changes')).toBeTruthy();
    });

    fireEvent.click(screen.getAllByText('Compare')[0]);

    expect(mockRecordAction).toHaveBeenCalledWith('compare_open', 'BDO');
    expect(mockNavigate).toHaveBeenCalledWith('/compare?symbols=BDO');
  });

  it('shows a product-safe load failure without raw transport details', async () => {
    seedWatchlist(['BDO']);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }),
    );

    render(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load watchlist intelligence right now.')).toBeTruthy();
    });

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(/status|provider|transport|diagnostics/i);
  });

  it('does not call the intelligence endpoint when the watchlist is empty', async () => {
    mockWatchlistFetch();

    render(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Stock')).toBeTruthy();
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});
