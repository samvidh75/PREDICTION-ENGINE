import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockRunPipeline } = vi.hoisted(() => ({
  mockRunPipeline: vi.fn(),
}));

vi.mock('../components/navigation/TopNav', () => ({
  default: () => null,
}));

vi.mock('../components/navigation/MobileNav', () => ({
  default: () => null,
}));

vi.mock('../services/api/client', () => ({
  api: {
    getQuote: vi.fn(() => Promise.resolve(null)),
    getScanner: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('../services/data/CompanyDataPipeline', () => ({
  runCompanyDataPipeline: mockRunPipeline,
}));

import PublicRankingsPage from './PublicRankingsPage';

function makeResult(symbol: string, companyName: string, sector: string, score: number | null = 80) {
  return {
    symbol,
    companyName,
    sector,
    prediction: score !== null ? {
      rankingScore: score,
      factorScores: [{ group: 'quality', value: 75, label: 'Quality' }],
      classification: 'Very Healthy',
    } : null,
    price: { current: 100, change: 1.5 },
    technicals: { closePrices: [99, 100, 101] },
    dataCompleteness: 0.85,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PublicRankingsPage states', () => {
  it('shows empty state when API returns no data', () => {
    mockRunPipeline.mockRejectedValue(new Error('no data'));
    render(<PublicRankingsPage />);
    expect(screen.getByText('AI Stock Scanner')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('shows signup teaser for unauthenticated users when data exists', () => {
    mockRunPipeline.mockResolvedValue(makeResult('TCS', 'TCS Ltd', 'Tech', 80));
    render(<PublicRankingsPage />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders data when rankings exist', () => {
    mockRunPipeline.mockResolvedValue(makeResult('TCS', 'TCS Ltd', 'Tech', 80));
    render(<PublicRankingsPage />);
    expect(screen.getByText('Research Status')).toBeInTheDocument();
  });

  it('limits displayed rows to 3 for unauthenticated users', () => {
    mockRunPipeline.mockResolvedValue(makeResult('TCS', 'TCS Ltd', 'Tech', 80));
    render(<PublicRankingsPage />);
    expect(screen.getByText('Visible Results')).toBeInTheDocument();
  });

  it('does not render "Not available" or "Sector pending" text', () => {
    mockRunPipeline.mockRejectedValue(new Error('no data'));
    render(<PublicRankingsPage />);
    expect(screen.getByText('AI Stock Scanner')).toBeInTheDocument();
    expect(screen.queryByText('Not available')).not.toBeInTheDocument();
    expect(screen.queryByText('Sector pending')).not.toBeInTheDocument();
  });

  it('hides sector filter when fewer than 2 useful sectors exist', () => {
    mockRunPipeline.mockRejectedValue(new Error('no data'));
    render(<PublicRankingsPage />);
    expect(screen.queryByText('Sector:')).not.toBeInTheDocument();
  });

  it('does not expose full score column to unauthenticated users', () => {
    mockRunPipeline.mockResolvedValue(makeResult('TCS', 'TCS Ltd', 'Tech', 75));
    render(<PublicRankingsPage />);
    expect(screen.getByText('Score Heatmap')).toBeInTheDocument();
    expect(screen.queryByText('Gated')).not.toBeInTheDocument();
  });
});
