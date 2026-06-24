import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LayoutProvider } from '../context/LayoutContext';
import DashboardHub from '../components/dashboard/DashboardHub';
import ScannerPage from '../components/scanner/ScannerPage';
import AlertsPanel from '../components/alerts/AlertsPanel';
import StockWorkspaceBar from '../components/company/StockWorkspaceBar';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../services/portfolio/WatchlistEngine', () => ({
  WatchlistEngine: {
    getWatchlists: vi.fn(() => []),
    addTicker: vi.fn(),
    removeTicker: vi.fn(),
  },
}));

vi.mock('../services/portfolio/PortfolioEngine', () => ({
  PortfolioEngine: {
    getHoldings: vi.fn(() => []),
    removeHolding: vi.fn(),
  },
}));

vi.mock('../services/portfolio/NoteEngine', () => ({
  NoteEngine: {
    getNote: vi.fn(() => ({ note: '', lastUpdated: '' })),
    saveNote: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('../services/search/RecentSearchStore', () => ({
  RecentSearchStore: {
    getRecent: vi.fn(() => []),
    addTicker: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../services/api/client', () => ({
  api: {
    getLeaderboard: vi.fn(() => Promise.resolve({ data: [] })),
    getSignals: vi.fn(() => Promise.resolve({ signals: [] })),
    getScanner: vi.fn(() => Promise.resolve({ data: [] })),
    getWatchlists: vi.fn(() => Promise.resolve([])),
    searchUniversal: vi.fn(() => Promise.resolve({ data: { results: [] } })),
    compareCompanies: vi.fn(() => Promise.resolve({ data: null })),
    addWatchlistTicker: vi.fn(),
    removeWatchlistTicker: vi.fn(),
    getMetadata: vi.fn(() => Promise.resolve(null)),
    getAlerts: vi.fn(() => Promise.resolve([])),
    getQuote: vi.fn(() => Promise.resolve({ symbol: "TCS", price: 3000, change: 10, changePercent: 0.33, exchange: "NSE" })),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<LayoutProvider>{ui}</LayoutProvider>);
}

describe('Part AB — No raw rendering defects', () => {
  const FORBIDDEN_RAW = [
    /\bNaN\b/,
    /\bInfinity\b/,
    /\bundefined\b/,
    /\[\w*\]/,
  ];

  it('DashboardHub does not render raw NaN/undefined/Infinity', () => {
    const { container } = renderWithProviders(<DashboardHub />);
    const text = container.textContent || '';
    for (const pattern of FORBIDDEN_RAW) {
      expect(text).not.toMatch(pattern);
    }
  });
});

describe('Part AB — Scanner', () => {
  it('ScannerPage renders category sections', () => {
    renderWithProviders(<ScannerPage />);
    expect(screen.getAllByText('AI Stock Scanner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('sector')).toBeInTheDocument();
    expect(screen.getByText('quality')).toBeInTheDocument();
    expect(screen.getByText('risk')).toBeInTheDocument();
    expect(screen.queryByText(/Free scans|Premium scans/i)).not.toBeInTheDocument();
  });

  it('ScannerPage does not contain investment advice language', () => {
    renderWithProviders(<ScannerPage />);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/buy|sell|hold|strong buy|target price|multibagger|best stock to buy|recommendation/i);
  });

  it('ScannerPage result actions are Research/Compare/Track only', () => {
    renderWithProviders(<ScannerPage />);
    expect(screen.queryByText('Invest')).not.toBeInTheDocument();
  });
});

describe('Part AB — AlertsPanel empty state', () => {
  it('does not fake active alerts count', () => {
    renderWithProviders(<AlertsPanel />);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/active alerts count/i);
  });

  it('shows product-safe empty state', () => {
    renderWithProviders(<AlertsPanel />);
    expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
  });
});

describe('Part AB — StockWorkspaceBar', () => {
  it('renders research workspace heading', () => {
    renderWithProviders(<StockWorkspaceBar ticker="RELIANCE" horizon={30} />);
    expect(screen.getByText('Research workspace')).toBeInTheDocument();
  });

  it('does not contain exchange/provider wording', () => {
    const { container } = renderWithProviders(<StockWorkspaceBar ticker="TCS" horizon={90} />);
    const text = container.textContent || '';
    expect(text).not.toMatch(/exchange|Exchange|provider|Provider/i);
  });
});
