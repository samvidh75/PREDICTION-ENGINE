import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LayoutProvider } from '../context/LayoutContext';
import DashboardHub from '../components/dashboard/DashboardHub';

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
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<LayoutProvider>{ui}</LayoutProvider>);
}

describe("Part AA — Forbidden copy audit", () => {
  const FORBIDDEN_PATTERNS = [
    { pattern: /buy now/i, label: "Buy now" },
    { pattern: /strong buy/i, label: "Strong Buy" },
    { pattern: /sure shot/i, label: "sure shot" },
    { pattern: /multibagger/i, label: "multibagger" },
    { pattern: /guaranteed returns/i, label: "guaranteed returns" },
    { pattern: /price target/i, label: "price target" },
  ];

  it("DashboardHub contains no forbidden copy", () => {
    const { container } = renderWithProviders(<DashboardHub />);
    const text = container.textContent || "";
    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
  });
});
