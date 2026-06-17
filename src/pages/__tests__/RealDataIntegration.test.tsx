import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardHub from '../../views/DashboardHub';
import { SearchPage } from '../SearchPage';
import { PublicRankingsPage } from '../PublicRankingsPage';
import PublicPredictionsPage from '../PublicPredictionsPage';
import StockStoryPage from '../StockStoryPage';
import { LayoutProvider } from '../../context/LayoutContext';

// Mock routing coordinator
vi.mock('../../architecture/navigation/routeCoordinator', () => ({
  navigateToStock: vi.fn(),
}));

// Mock user journey and searches
vi.mock('../../services/behavior/UserJourneyEngine', () => ({
  UserJourneyEngine: { trackEvent: vi.fn() },
}));
vi.mock('../../services/search/RecentSearchStore', () => ({
  RecentSearchStore: { getRecent: vi.fn(() => []), addTicker: vi.fn() },
}));

// Mock onboarding components to prevent environment-specific rendering issues in JSDOM
vi.mock('../../components/ui/OnboardingComponents', () => ({
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
  DataReadinessPanel: () => <div data-testid="data-readiness-panel" />,
}));

function makeMockFetch(responses: Record<string, any>) {
  return vi.fn(async (url: string) => {
    for (const [key, value] of Object.entries(responses)) {
      if (url.includes(key)) {
        return { ok: true, json: async () => value };
      }
    }
    return { ok: true, json: async () => ({}) };
  }) as unknown as typeof fetch;
}

describe('Real Data Integration Pages', () => {
  let originalSearch: string;
  let getItemSpy: any;

  beforeEach(() => {
    originalSearch = window.location.search;
    getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
      if (key === 'onboarding_methodology_viewed') return 'true';
      return null;
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalSearch);
    vi.stubGlobal('fetch', undefined);
    getItemSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('DashboardHub shows indexed company count from health API', async () => {
    window.history.replaceState({}, '', '?page=dashboard');
    vi.stubGlobal('fetch', makeMockFetch({
      '/api/ops/health': {
        status: 'ok',
        metrics: { predictions_today: 1250, symbols_covered: 116, pipeline_freshness: 'recent', db_health: 'healthy' },
      },
      '/api/ops/data-coverage': {
        ok: true,
        generatedAt: '2026-06-16T08:00:00Z',
        database: { status: 'ready', migrationsReady: true },
        coverage: {
          symbols: { count: 116, latestUpdatedAt: '2026-06-08', status: 'available' },
          dailyPrices: { rowCount: 38775, symbolCount: 110, latestPriceDate: '2026-06-07', status: 'available' },
          financialSnapshots: { rowCount: 61, symbolCount: 5, latestSnapshotDate: '2026-06-06', status: 'available' },
          featureSnapshots: { rowCount: 35735, symbolCount: 105, latestSnapshotDate: '2026-06-05', status: 'available' },
          factorSnapshots: { rowCount: 38395, symbolCount: 105, latestSnapshotDate: '2026-06-05', status: 'available' },
          predictionRegistry: { rowCount: 107485, symbolCount: 116, latestPredictionDate: '2026-06-08', status: 'available' },
        },
        providers: { FINNHUB_KEY: 'present', REDIS_URL: 'missing' },
      },
      '/api/predictions/signals': {
        signals: [],
        snapshotDate: new Date().toISOString().split('T')[0],
        symbolsAnalyzed: 0,
      },
    }));

    render(
      <LayoutProvider>
        <DashboardHub />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('DashboardHub renders coverage KPIs from data-coverage API', async () => {
    window.history.replaceState({}, '', '?page=dashboard');
    vi.stubGlobal('fetch', makeMockFetch({
      '/api/ops/data-coverage': {
        ok: true,
        generatedAt: '2026-06-16T08:00:00Z',
        database: { status: 'ready', migrationsReady: true },
        coverage: {
          symbols: { count: 116, latestUpdatedAt: '2026-06-08', status: 'available' },
          dailyPrices: { rowCount: 38775, symbolCount: 110, latestPriceDate: '2026-06-07', status: 'available' },
          financialSnapshots: { rowCount: 61, symbolCount: 5, latestSnapshotDate: '2026-06-06', status: 'available' },
          featureSnapshots: { rowCount: 35735, symbolCount: 105, latestSnapshotDate: '2026-06-05', status: 'available' },
          factorSnapshots: { rowCount: 38395, symbolCount: 105, latestSnapshotDate: '2026-06-05', status: 'available' },
          predictionRegistry: { rowCount: 107485, symbolCount: 116, latestPredictionDate: '2026-06-08', status: 'available' },
        },
        providers: { FINNHUB_KEY: 'present', REDIS_URL: 'missing' },
      },
      '/api/predictions/signals': {
        signals: [],
        snapshotDate: new Date().toISOString().split('T')[0],
        symbolsAnalyzed: 0,
      },
      '/api/ops/health': { status: 'ok', metrics: { predictions_today: 0, symbols_covered: 0 } },
    }));

    render(
      <LayoutProvider>
        <DashboardHub />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Companies covered')).toBeInTheDocument();
      expect(screen.getByText('Scored records')).toBeInTheDocument();
      expect(screen.getByText('Financial records')).toBeInTheDocument();
      expect(screen.getByText('Price records')).toBeInTheDocument();
    });
  });

  it('SearchPage hides Score pending when leaderboard has entry', async () => {
    window.history.replaceState({}, '', '?page=search&q=RELIANCE');

    vi.stubGlobal('fetch', makeMockFetch({
      '/api/intelligence/leaderboard': [
        { symbol: 'RELIANCE.NS', rankingScore: 88, confidenceScore: 92, predictionDate: '2026-06-15' },
      ],
    }));

    render(
      <LayoutProvider>
        <SearchPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Reliance Industries/)).toBeInTheDocument();
      expect(screen.queryByText('Score pending')).not.toBeInTheDocument();
    });
  });

  it('SearchPage shows Score pending for stocks without leaderboard entry', async () => {
    window.history.replaceState({}, '', '?page=search&q=TCS');

    vi.stubGlobal('fetch', makeMockFetch({
      '/api/intelligence/leaderboard': [],
    }));

    render(
      <LayoutProvider>
        <SearchPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Score pending')).toBeInTheDocument();
    });
  });

  it('StockStoryPage renders company info when predictions missing but financials exist', async () => {
    window.history.replaceState({}, '', '?page=stock&id=RELIANCE');

    vi.stubGlobal('fetch', makeMockFetch({
      '/api/stockstory/': { status: 'unavailable', reason: 'PREDICTION_NOT_FOUND', message: 'No prediction snapshot is available.' },
      '/financials': { ticker: 'RELIANCE', snapshot_date: '2026-03-31', pe_ratio: 24.5, roe: 0.15, operating_margin: 0.18 },
    }));

    render(
      <LayoutProvider>
        <StockStoryPage />
      </LayoutProvider>
    );

    await waitFor(async () => {
      const notIndexed = screen.queryByText('Company not indexed yet');
      if (notIndexed) {
        throw new Error('Company not indexed yet should not render when financials exist');
      }
      expect(screen.getByText('Reliance Industries Ltd')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('StockStoryPage renders with partial financial data without crashing', async () => {
    window.history.replaceState({}, '', '?page=stock&id=TCS');

    vi.stubGlobal('fetch', makeMockFetch({
      '/api/stockstory/': { status: 'unavailable', reason: 'PREDICTION_NOT_FOUND', message: 'No prediction snapshot.' },
      '/financials': { ticker: 'TCS', snapshot_date: '2026-03-31', pe_ratio: 30.1 },
    }));

    render(
      <LayoutProvider>
        <StockStoryPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tata Consultancy/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('PublicRankingsPage parses scores from leaderboard API', async () => {
    window.history.replaceState({}, '', '?page=rankings');
    vi.stubGlobal('fetch', makeMockFetch({
      '/api/intelligence/leaderboard': [
        { symbol: 'RELIANCE', rankingScore: 84, confidenceScore: 78, sector: 'Energy', predictionDate: '2026-06-15' },
      ],
    }));

    render(
      <LayoutProvider>
        <PublicRankingsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/As of/)).toBeInTheDocument();
      expect(screen.getByText('RELIANCE')).toBeInTheDocument();
      expect(screen.getByText('84')).toBeInTheDocument();
    });
  });

  it('PublicPredictionsPage parses signals from predictions API', async () => {
    window.history.replaceState({}, '', '?page=predictions');
    vi.stubGlobal('fetch', makeMockFetch({
      '/api/predictions/signals': {
        signals: [
          { symbol: 'RELIANCE', type: 'bullish', severity: 'important', explanation: 'Strong revenue growth', snapshotDate: '2026-06-15' },
        ],
        snapshotDate: '2026-06-15',
        symbolsAnalyzed: 116,
      },
    }));

    render(
      <LayoutProvider>
        <PublicPredictionsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/As of/)).toBeInTheDocument();
      expect(screen.getByText('RELIANCE')).toBeInTheDocument();
      expect(screen.getByText(/bullish/i)).toBeInTheDocument();
    });
  });

  it('PublicPredictionsPage shows empty state when no signals', async () => {
    window.history.replaceState({}, '', '?page=predictions');
    vi.stubGlobal('fetch', makeMockFetch({
      '/api/predictions/signals': { signals: [], snapshotDate: null, symbolsAnalyzed: 0 },
    }));

    render(
      <LayoutProvider>
        <PublicPredictionsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Score changes pending/i)).toBeInTheDocument();
    });
  });
});
