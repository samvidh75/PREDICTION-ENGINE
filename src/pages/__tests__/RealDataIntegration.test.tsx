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

  it('DashboardHub shows real readiness counts and freshness from health API', async () => {
    window.history.replaceState({}, '', '?page=dashboard');
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.includes('/api/ops/health')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ok',
            metrics: {
              predictions_today: 1250,
              symbols_covered: 116,
              hit_rate: '82%',
              pipeline_freshness: 'recent',
              db_health: 'healthy',
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          signals: [],
          symbolsAnalyzed: 0,
        }),
      };
    }) as unknown as typeof fetch);

    render(
      <LayoutProvider>
        <DashboardHub />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('116')).toBeInTheDocument();
      expect(screen.getByText(/1,250 prediction rows/)).toBeInTheDocument();
    });
  });

  it('SearchPage displays pending vs active prediction scores dynamically', async () => {
    window.history.replaceState({}, '', '?page=search&q=RELIANCE');

    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.includes('/api/intelligence/leaderboard')) {
        return {
          ok: true,
          json: async () => [
            {
              symbol: 'RELIANCE.NS',
              rankingScore: 88,
              confidenceScore: 92,
              predictionDate: '2026-06-15',
              rank: 3,
            },
          ],
        };
      }
      return { ok: false };
    }) as unknown as typeof fetch);

    render(
      <LayoutProvider>
        <SearchPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('RELIANCE')).toBeInTheDocument();
      expect(screen.getByText('Rank #3')).toBeInTheDocument();
      expect(screen.getByText('Updated 2026-06-15')).toBeInTheDocument();
    });
  });

  it('StockStoryPage renders financials tab when predictions are missing', async () => {
    window.history.replaceState({}, '', '?page=stock&id=RELIANCE');

    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.includes('/api/stockstory/')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            status: 'unavailable',
            reason: 'PREDICTION_NOT_FOUND',
            message: 'No prediction snapshot is available.',
          }),
        };
      }
      if (url.includes('/financials')) {
        return {
          ok: true,
          json: async () => ({
            ticker: 'RELIANCE',
            snapshot_date: '2026-03-31',
            pe_ratio: 24.5,
            roe: 0.15,
            operating_margin: 0.18,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch);

    render(
      <LayoutProvider>
        <StockStoryPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Company not indexed yet')).not.toBeInTheDocument();
      expect(screen.getByText('Reliance Industries Ltd')).toBeInTheDocument();
    });
  });

  it('PublicRankingsPage parses scores and freshness date correctly from leaderboard API', async () => {
    window.history.replaceState({}, '', '?page=rankings');
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.includes('/api/intelligence/leaderboard')) {
        return {
          ok: true,
          json: async () => [
            {
              symbol: 'RELIANCE',
              rankingScore: 84,
              confidenceScore: 78,
              sector: 'Energy',
              predictionDate: '2026-06-15',
              rank: 1,
            },
          ],
        };
      }
      return { ok: false };
    }) as unknown as typeof fetch);

    render(
      <LayoutProvider>
        <PublicRankingsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('As of 2026-06-15')).toBeInTheDocument();
      expect(screen.getByText('RELIANCE')).toBeInTheDocument();
      expect(screen.getByText('84')).toBeInTheDocument();
      expect(screen.getByText('78')).toBeInTheDocument();
    });
  });

  it('PublicPredictionsPage parses scores and freshness date correctly from leaderboard API', async () => {
    window.history.replaceState({}, '', '?page=predictions');
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.includes('/api/intelligence/leaderboard')) {
        return {
          ok: true,
          json: async () => [
            {
              symbol: 'RELIANCE',
              rankingScore: 84,
              confidenceScore: 78,
              sector: 'Energy',
              predictionDate: '2026-06-15',
              rank: 1,
            },
          ],
        };
      }
      return { ok: false };
    }) as unknown as typeof fetch);

    render(
      <LayoutProvider>
        <PublicPredictionsPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('As of 2026-06-15')).toBeInTheDocument();
      expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    });
  });
});
