import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LayoutProvider } from '../context/LayoutContext';
import WatchlistPage from './WatchlistPage';

const renderWithLayout = (ui: React.ReactElement) => render(<LayoutProvider>{ui}</LayoutProvider>);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../services/portfolio/WatchlistEngine', () => ({
  WatchlistEngine: {
    getWatchlists: vi.fn(() => []),
    removeTicker: vi.fn(),
  },
}));

vi.mock('../services/portfolio/SmartWatchlistEngine', () => ({
  SmartWatchlistEngine: {
    getSmartWatchlists: vi.fn(() => []),
  },
}));

vi.mock('../services/portfolio/NoteEngine', () => ({
  NoteEngine: {
    getNote: vi.fn(() => ({ note: '', timestamp: 0, lastUpdated: null })),
    saveNote: vi.fn(),
  },
}));

vi.mock('../services/stocks/StockRegistry', () => ({
  StockRegistry: {
    getStock: vi.fn(() => null),
  },
}));

vi.mock('../services/auth/sessionStore', () => ({
  loadAuthSession: vi.fn(() => ({ uid: 'test-uid' })),
}));

vi.mock('../architecture/navigation/routeCoordinator', () => ({
  navigateToStock: vi.fn(),
}));

describe('WatchlistPage states', () => {
  it('renders empty state when no lists exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: true, json: async () => [] };
    }));

    renderWithLayout(<WatchlistPage />);

    expect(await screen.findByText('Track companies you are researching')).toBeInTheDocument();
  });

  it('renders watchlist header', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: true, json: async () => [] };
    }));

    renderWithLayout(<WatchlistPage />);

    expect(await screen.findByText('Tracked companies')).toBeInTheDocument();
  });

  it('renders tracked companies header when remote fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: false, status: 500, json: async () => ({}) };
    }));

    renderWithLayout(<WatchlistPage />);

    expect(await screen.findByText('Tracked companies')).toBeInTheDocument();
  });

  it('renders empty-state action buttons when no tickers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: true, json: async () => [] };
    }));

    renderWithLayout(<WatchlistPage />);

    await waitFor(() => {
      const actions = screen.queryAllByText(/Open scanner|Search companies/);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  it('contains no forbidden trading language', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: true, json: async () => [] };
    }));

    renderWithLayout(<WatchlistPage />);

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
    });
  });
});
