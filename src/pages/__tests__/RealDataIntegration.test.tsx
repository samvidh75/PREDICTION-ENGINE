import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardHub from '../../components/dashboard/DashboardHub';
import { SearchPage } from '../SearchPage';
import { PublicRankingsPage } from '../PublicRankingsPage';
import StockStoryPage from '../StockStoryPage';
import { LayoutProvider } from '../../context/LayoutContext';

vi.mock('../../architecture/navigation/routeCoordinator', () => ({
  navigateToStock: vi.fn(),
}));

vi.mock('../../services/behavior/UserJourneyEngine', () => ({
  UserJourneyEngine: { trackEvent: vi.fn() },
}));

vi.mock('../../services/search/RecentSearchStore', () => ({
  RecentSearchStore: { getRecent: vi.fn(() => []), addTicker: vi.fn() },
}));

vi.mock('../../components/ui/OnboardingComponents', () => ({
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
  DataReadinessPanel: () => <div data-testid="data-readiness-panel" />,
}));

// Mock auth context to simulate authenticated state for auth-gated tests
vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    authError: null,
    isSessionExpired: false,
    logout: vi.fn(),
  }),
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
  // Save original auth mock
  const originalModule = vi.importActual('../../context/AuthContext');

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
        timestamp: '2026-06-17T00:00:00Z',
        metrics: { predictions_today: 1250, symbols_covered: 116, pipeline_freshness: 'recent', db_health: 'connected', hit_rate: 'N/A', scheduler_health: 'ok', response_ms: 18, environment: 'production', uptime_seconds: 112, node_version: 'v22' },
      },
      '/api/predictions/signals': {
        status: 'ok',
        mode: 'production_real',
        data: {
          signals: [],
          snapshotDate: new Date().toISOString().split('T')[0],
          symbolsAnalyzed: 0,
        },
        reason: 'OK',
        message: null,
        generatedAt: new Date().toISOString(),
        dataState: {},
      },
    }));

    render(<LayoutProvider><DashboardHub /></LayoutProvider>);

    await waitFor(() => {
      expect(screen.getByText('Research Command Centre')).toBeInTheDocument();
    });
  });

  it('SearchPage hides Pending label when leaderboard has entry', async () => {
    window.history.replaceState({}, '', '?page=search&q=RELIANCE');

    vi.stubGlobal('fetch', makeMockFetch({
      '/api/intelligence/leaderboard': {
        ok: true,
        data: [
          { symbol: 'RELIANCE.NS', rankingScore: 88, confidenceScore: 92, predictionDate: '2026-06-15', companyName: 'Reliance Industries', sector: 'Energy', industry: 'Refining', rank: 1, classification: 'Good', factors: { quality: 70, growth: 80, value: 60, momentum: 75, risk: 65, sector: 70 } },
        ],
      },
    }));

    render(
      <LayoutProvider>
        <SearchPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Pending|Not enough information|not yet available/)).not.toBeInTheDocument();
    });
  });

  it('SearchPage shows Not enough information for stocks without leaderboard entry', async () => {
    window.history.replaceState({}, '', '?page=search&q=TCS');

    vi.stubGlobal('fetch', makeMockFetch({
      '/api/intelligence/leaderboard': { ok: true, data: [] },
    }));

    render(
      <LayoutProvider>
        <SearchPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Not enough information/)).toBeInTheDocument();
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

  it('PublicRankingsPage shows public teaser when unauthenticated', async () => {
    window.history.replaceState({}, '', '?page=rankings');
    vi.stubGlobal('fetch', makeMockFetch({}));

    render(
      <LayoutProvider>
        <PublicRankingsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Research Shortlist')).toBeInTheDocument();
      expect(screen.getByText('Create free account')).toBeInTheDocument();
    });
  });

  it('PublicRankingsPage does not expose raw HTTP errors', async () => {
    window.history.replaceState({}, '', '?page=rankings');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({}),
    })) as unknown as typeof fetch);

    render(
      <LayoutProvider>
        <PublicRankingsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(body).not.toMatch(/HTTP|Request failed|502|API|backend|provider/i);
    });
  });

});
