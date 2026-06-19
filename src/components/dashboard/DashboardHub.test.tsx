import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardHub from './DashboardHub';
import { LayoutProvider } from '../../context/LayoutContext';

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
    removeHolding: vi.fn(),
  },
}));

vi.mock('../../services/portfolio/NoteEngine', () => ({
  NoteEngine: {
    getNote: vi.fn(() => ({ note: '', lastUpdated: '' })),
    saveNote: vi.fn(),
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
    getAllStocks: vi.fn(() => []),
  },
}));



vi.mock('../../architecture/navigation/routeCoordinator', () => ({
  navigateToStock: vi.fn(),
}));

// Mock the API client
const mockGetSignals = vi.fn();
vi.mock('../../services/api/client', () => ({
  api: {
    getSignals: (...args: unknown[]) => mockGetSignals(...args),
    getScanner: vi.fn(() => Promise.resolve({ data: [] })),
  },
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

const pending = () => new Promise(() => {});
const renderDashboard = () => render(<LayoutProvider><DashboardHub /></LayoutProvider>);

beforeEach(() => {
  mockGetSignals.mockReturnValue(pending());
});

describe('DashboardHub states', () => {
  it('shows loading state for signals section', () => {
    renderDashboard();
    expect(screen.getByText('Loading signals...')).toBeInTheDocument();
  });

  it('shows empty watchlist state', () => {
    renderDashboard();
    expect(screen.getByText('No companies tracked')).toBeInTheDocument();
  });

  it('shows thesis monitoring panel', () => {
    renderDashboard();
    expect(screen.getByText('Portfolio thesis monitor')).toBeInTheDocument();
  });

  it('shows empty recent state', () => {
    renderDashboard();
    expect(screen.getByText('Research briefing')).toBeInTheDocument();
  });

  it('shows signals error state when API fails', async () => {
    mockGetSignals.mockRejectedValue(new Error('API error'));

    renderDashboard();

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows signals empty state when API returns no signals', async () => {
    mockGetSignals.mockResolvedValue({
      signals: [],
      symbolsAnalyzed: 5,
      snapshotDate: new Date().toISOString(),
    });

    renderDashboard();

    expect(await screen.findByText('No notable changes')).toBeInTheDocument();
    expect(screen.getByText('No research changes crossed the display threshold for tracked companies.')).toBeInTheDocument();
  });

  it('shows signals section heading', async () => {
    mockGetSignals.mockResolvedValue({ signals: [], symbolsAnalyzed: 0 });

    renderDashboard();

    expect(await screen.findByText('What changed')).toBeInTheDocument();
  });
});
