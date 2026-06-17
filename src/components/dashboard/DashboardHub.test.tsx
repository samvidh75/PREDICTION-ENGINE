import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardHub from './DashboardHub';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../../services/portfolio/WatchlistEngine', () => ({
  WatchlistEngine: {
    getWatchlists: vi.fn(() => []),
    addTicker: vi.fn(),
    removeTicker: vi.fn(),
  },
}));

vi.mock('../../services/portfolio/PortfolioEngine', () => ({
  PortfolioEngine: {
    getHoldings: vi.fn(() => []),
  },
}));

vi.mock('../../services/search/RecentSearchStore', () => ({
  RecentSearchStore: {
    getRecent: vi.fn(() => []),
    addTicker: vi.fn(),
  },
}));

vi.mock('../../services/stocks/StockRegistry', () => ({
  StockRegistry: {
    getStock: vi.fn(() => null),
  },
}));

vi.mock('../../architecture/navigation/routeCoordinator', () => ({
  navigateToStock: vi.fn(),
}));

describe('DashboardHub states', () => {
  it('shows loading state for signals section', () => {
    render(<DashboardHub />);
    expect(screen.getByText('Loading source-backed signal changes...')).toBeInTheDocument();
  });

  it('shows empty watchlist state', () => {
    render(<DashboardHub />);
    expect(screen.getByText('No companies saved yet.')).toBeInTheDocument();
  });

  it('shows empty saved research state', () => {
    render(<DashboardHub />);
    expect(screen.getByText('No saved research items yet.')).toBeInTheDocument();
  });

  it('shows empty recent state', () => {
    render(<DashboardHub />);
    expect(screen.getByText('No recently viewed companies.')).toBeInTheDocument();
  });

  it('shows signals error state when API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: false, status: 500, json: async () => ({}) };
    }));

    render(<DashboardHub />);

    expect(await screen.findByText('Signal changes are not available right now.')).toBeInTheDocument();
  });

  it('shows signals empty state when API returns no signals', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('signals')) {
        return { ok: true, json: async () => ({ signals: [], symbolsAnalyzed: 5 }) };
      }
      if (url.includes('health')) {
        return { ok: true, json: async () => ({ status: 'ok', metrics: { symbols_covered: 6, db_health: 'connected' } }) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<DashboardHub />);

    expect(await screen.findByText('No significant source-backed changes detected.')).toBeInTheDocument();
    expect(screen.getByText(/5 symbols analyzed/)).toBeInTheDocument();
  });

  it('shows status bar when health data loads', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('health')) {
        return { ok: true, json: async () => ({ status: 'ok', metrics: { symbols_covered: 6, db_health: 'connected' } }) };
      }
      return { ok: true, json: async () => ({ signals: [], symbolsAnalyzed: 0 }) };
    }));

    render(<DashboardHub />);

    expect(await screen.findByText(/6 companies covered/)).toBeInTheDocument();
  });
});
