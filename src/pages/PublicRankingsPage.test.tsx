import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicRankingsPage from './PublicRankingsPage';

vi.mock('../components/navigation/TopNav', () => ({
  default: () => null,
}));

vi.mock('../components/navigation/MobileNav', () => ({
  default: () => null,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PublicRankingsPage states', () => {
  it('shows empty state when API returns no data', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('leaderboard')) {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      if (url.includes('data-coverage')) {
        return { ok: true, json: async () => ({ coverage: { symbols: { count: 6, status: 'available' }, predictionRegistry: { rowCount: 27, latestPredictionDate: '2026-06-17' } } }) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<PublicRankingsPage />);
    expect(await screen.findByText('Rankings pending')).toBeInTheDocument();
  });

  it('shows signup and methodology CTA in empty state', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('leaderboard')) {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<PublicRankingsPage />);
    expect(await screen.findByText('Create free account')).toBeInTheDocument();
    expect(screen.getByText('View scoring methodology')).toBeInTheDocument();
  });

  it('shows data coverage card in empty state when coverage data exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('leaderboard')) {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      if (url.includes('data-coverage')) {
        return { ok: true, json: async () => ({
          coverage: {
            symbols: { count: 6, status: 'available' },
            predictionRegistry: { rowCount: 27, latestPredictionDate: '2026-06-17', status: 'available' },
          },
        })};
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<PublicRankingsPage />);
    expect(await screen.findByText('Data coverage')).toBeInTheDocument();
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('27').length).toBeGreaterThan(0);
  });

  it('renders filter controls and data when rankings exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('leaderboard')) {
        return { ok: true, json: async () => ({
          data: [
            { symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', rank: 1, rankingScore: 75, confidenceScore: 80, predictionDate: '2026-06-17' },
            { symbol: 'TCS', companyName: 'Tata Consultancy Services', sector: 'Technology', rank: 2, rankingScore: 70, confidenceScore: 75, predictionDate: '2026-06-17' },
          ],
        })};
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<PublicRankingsPage />);
    expect((await screen.findAllByText('RELIANCE')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('TCS').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Search symbol or sector...')).toBeInTheDocument();
    expect(screen.getByText('All Sectors')).toBeInTheDocument();
  });
});
