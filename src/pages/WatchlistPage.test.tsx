import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WatchlistPage from './WatchlistPage';

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

    render(<WatchlistPage />);

    expect(await screen.findByText('No companies saved in this list')).toBeInTheDocument();
  });

  it('renders watchlist header', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: true, json: async () => [] };
    }));

    render(<WatchlistPage />);

    expect(await screen.findByText('Watchlist')).toBeInTheDocument();
  });

  it('shows offline mode label when remote fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return { ok: false, status: 500, json: async () => ({}) };
    }));

    render(<WatchlistPage />);

    expect(await screen.findByText(/offline mode/)).toBeInTheDocument();
  });
});
