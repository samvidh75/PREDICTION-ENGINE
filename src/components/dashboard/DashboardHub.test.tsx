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

// Mock the API client
const mockGetSignals = vi.fn();
const mockGetOpsHealth = vi.fn();
const mockGetDataCoverage = vi.fn();
vi.mock('../../services/api/client', () => ({
  api: {
    getSignals: (...args: unknown[]) => mockGetSignals(...args),
    getOpsHealth: (...args: unknown[]) => mockGetOpsHealth(...args),
    getDataCoverage: (...args: unknown[]) => mockGetDataCoverage(...args),
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

beforeEach(() => {
  mockGetSignals.mockReturnValue(pending());
  mockGetOpsHealth.mockReturnValue(pending());
  mockGetDataCoverage.mockResolvedValue({ coverage: { symbols: { count: 6 }, predictionRegistry: { symbolCount: 5 } }, generatedAt: '2026-06-17T00:00:00.000Z' });
});

describe('DashboardHub states', () => {
  it('shows loading state for signals section', () => {
    render(<DashboardHub />);
    expect(screen.getByText('Recent signal changes')).toBeInTheDocument();
  });

  it('shows empty watchlist state', () => {
    render(<DashboardHub />);
    expect(screen.getByText(/No companies saved yet/)).toBeInTheDocument();
  });

  it('shows empty saved research state', () => {
    render(<DashboardHub />);
    expect(screen.getByText(/No user-entered holdings saved/)).toBeInTheDocument();
  });

  it('shows empty recent state', () => {
    render(<DashboardHub />);
    expect(screen.getByText('Your Indian equity research command centre.')).toBeInTheDocument();
  });

  it('shows signals error state when API fails', async () => {
    mockGetSignals.mockRejectedValue(new Error('API error'));
    mockGetOpsHealth.mockResolvedValue({ status: 'ok', metrics: { symbols_covered: 0, db_health: 'connected' } });

    render(<DashboardHub />);

    expect(await screen.findByText('Signals temporarily unavailable')).toBeInTheDocument();
  });

  it('shows signals empty state when API returns no signals', async () => {
    mockGetSignals.mockResolvedValue({
      signals: [],
      symbolsAnalyzed: 5,
      snapshotDate: new Date().toISOString(),
    });
    mockGetOpsHealth.mockResolvedValue({ status: 'ok', metrics: { symbols_covered: 6, db_health: 'connected' } });

    render(<DashboardHub />);

    expect(await screen.findByText('No significant signal changes')).toBeInTheDocument();
    expect(screen.getByText(/5 companies were analyzed/)).toBeInTheDocument();
  });

  it('shows status bar when health data loads', async () => {
    mockGetSignals.mockResolvedValue({ signals: [], symbolsAnalyzed: 0 });
    mockGetOpsHealth.mockResolvedValue({ status: 'ok', metrics: { symbols_covered: 6, db_health: 'connected' } });

    render(<DashboardHub />);

    expect(await screen.findByText('Companies covered')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });
});
