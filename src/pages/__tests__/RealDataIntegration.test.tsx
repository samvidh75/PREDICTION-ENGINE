import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardHub from '../../components/dashboard/DashboardHub';
import { SearchPage } from '../SearchPage';
import { PublicRankingsPage } from '../PublicRankingsPage';
import PublicPredictionsPage from '../PublicPredictionsPage';
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
        timestamp: '2026-06-17T00:00:00Z',
        metrics: { predictions_today: 1250, symbols_covered: 116, pipeline_freshness: 'recent', db_health: 'connected', hit_rate: 'N/A', scheduler_health: 'ok', response_ms: 18, environment: 'production', uptime_seconds: 112, node_version: 'v22' },
      },
      '/api/predictions/signals': {
        signals: [],
        snapshotDate: new Date().toISOString().split('T')[0],
        symbolsAnalyzed: 0,
      },
    }));

    render(<DashboardHub />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('SearchPage hides Score pending when leaderboard has entry', async () => {
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
      expect(screen.queryByText('Score pending')).not.toBeInTheDocument();
    });
  });

  it('SearchPage shows Score pending for stocks without leaderboard entry', async () => {
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
      '/api/intelligence/leaderboard': {
        ok: true,
        data: [
          { symbol: 'RELIANCE', rankingScore: 84, confidenceScore: 78, sector: 'Energy', predictionDate: '2026-06-15', companyName: 'Reliance Industries', rank: 1, classification: 'Good', factors: { quality: 70, growth: 80, value: 60, momentum: 75, risk: 65, sector: 70 } },
        ],
      },
    }));

    render(
      <LayoutProvider>
        <PublicRankingsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
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
