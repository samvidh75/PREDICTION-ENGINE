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

const baseItem = {
  symbol: 'RELIANCE',
  companyName: 'Reliance Industries',
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
      symbol: 'INFY',
      companyName: 'Infosys',
      currentStatus: 'Strengthening',
      previousStatus: 'Stable',
      conviction: 'Healthy',
      score: 72,
      lastUpdated: '2026-06-30T09:00:00.000Z',
      scoreDirection: 'improving',
      lastThesis: 'Large deal conversion improved the research context.',
    },
  ],
  needsReview: [baseItem],
  changedItems: [
    baseItem,
    {
      symbol: 'INFY',
      companyName: 'Infosys',
      currentStatus: 'Strengthening',
      previousStatus: 'Stable',
      conviction: 'Healthy',
      score: 72,
      lastUpdated: '2026-06-30T09:00:00.000Z',
      scoreDirection: 'improving',
      lastThesis: 'Large deal conversion improved the research context.',
    },
  ],
  alerts: [],
  generatedAt: '2026-06-30T09:15:00.000Z',
};

const watchlistIntelWithAlerts: WatchlistIntelligence = {
  ...watchlistIntel,
  alerts: [
    {
      id: 'RELIANCE-risk-change-test',
      symbol: 'RELIANCE',
      type: 'risk_change',
      title: 'RELIANCE thesis needs review',
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
    mockWatchlistFetch();

    render(<WatchlistPage />);

    fireEvent.click(screen.getByText('Load Tracked Stocks'));

    await waitFor(() => {
      expect(screen.getByText('Watchlist research changes')).toBeTruthy();
    });

    expect(screen.getByText('Margins need review after recent operating pressure.')).toBeTruthy();
    expect(screen.getByText('Large deal conversion improved the research context.')).toBeTruthy();
    expect(screen.getByText('1 needs review')).toBeTruthy();
    expect(screen.getByText('2 thesis changes')).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('renders research alerts from watchlist intelligence safely', async () => {
    mockWatchlistFetch(watchlistIntelWithAlerts);

    render(<WatchlistPage />);

    fireEvent.click(screen.getByText('Load Tracked Stocks'));

    await waitFor(() => {
      expect(screen.getByText('Important changes to review')).toBeTruthy();
    });

    expect(screen.getByText('1 research alert')).toBeTruthy();
    expect(screen.getByText('RELIANCE thesis needs review')).toBeTruthy();
    expect(screen.getByText('Margin pressure should be reviewed before the next thesis update.')).toBeTruthy();
    expect(screen.getByText('Risk changed')).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('wires sanitized watchlist and alert context into the shared AI explanation surface', async () => {
    mockWatchlistFetch(watchlistIntelWithAlerts);

    render(<WatchlistPage />);

    fireEvent.click(screen.getByText('Load Tracked Stocks'));

    await waitFor(() => {
      expect(screen.getByText('AI explanation')).toBeTruthy();
    });

    expect(screen.getByText('Explains the research context already shown on this page.')).toBeTruthy();
    expect(screen.getByText('Research context only. Not a recommendation.')).toBeTruthy();
    expect(screen.getAllByText('Standard explanation is available for this view.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('AI research question')).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('records safe handoff intent when research alert actions are used', async () => {
    mockWatchlistFetch(watchlistIntelWithAlerts);

    render(<WatchlistPage />);

    fireEvent.click(screen.getByText('Load Tracked Stocks'));

    await waitFor(() => {
      expect(screen.getByText('Important changes to review')).toBeTruthy();
    });

    const compareButtons = screen.getAllByText('Compare');
    fireEvent.click(compareButtons[compareButtons.length - 1]);

    expect(mockRecordAction).toHaveBeenCalledWith('compare_open', 'RELIANCE');
    expect(mockNavigate).toHaveBeenCalledWith('/compare?symbols=RELIANCE');
  });

  it('records safe handoff intent when panel actions are used', async () => {
    mockWatchlistFetch();

    render(<WatchlistPage />);

    fireEvent.click(screen.getByText('Load Tracked Stocks'));

    await waitFor(() => {
      expect(screen.getByText('Watchlist research changes')).toBeTruthy();
    });

    fireEvent.click(screen.getAllByText('Compare')[0]);

    expect(mockRecordAction).toHaveBeenCalledWith('compare_open', 'RELIANCE');
    expect(mockNavigate).toHaveBeenCalledWith('/compare?symbols=RELIANCE');
  });

  it('shows a product-safe load failure without raw transport details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }),
    );

    render(<WatchlistPage />);

    fireEvent.click(screen.getByText('Load Tracked Stocks'));

    await waitFor(() => {
      expect(screen.getByText('Unable to load watchlist intelligence right now.')).toBeTruthy();
    });

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(/status|provider|transport|diagnostics/i);
  });
});
