import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MarketBrainResearchPanel from './MarketBrainResearchPanel';
import { useMarketBrainResearch } from '../../hooks/useMarketBrainResearch';

vi.mock('../../hooks/useMarketBrainResearch', () => ({
  useMarketBrainResearch: vi.fn(),
}));

const mockResearch = {
  symbol: 'TCS',
  companyName: 'Tata Consultancy Services',
  research: {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services',
    state: 'High conviction' as const,
    convictionScore: 82,
    headline: 'TCS is marked High conviction with 82/100 conviction.',
    thesis: ['Quality metrics support the business thesis.'],
    risksToReview: ['Valuation requires monitoring against growth delivery.'],
    whatToWatch: ['Margin trajectory in the next reported period.'],
    factorViews: [
      { key: 'quality' as const, label: 'Quality', score: 88, summary: 'Return profile remains durable.' },
    ],
    methodNote: 'Research-only output. Not personal investment advice.',
    generatedAt: '2026-06-27T00:00:00.000Z',
  },
};

describe('MarketBrainResearchPanel', () => {
  it('renders frontend-safe market brain research copy', () => {
    vi.mocked(useMarketBrainResearch).mockReturnValue({
      data: mockResearch,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<MarketBrainResearchPanel symbol="TCS" />);

    expect(screen.getByText('Market Brain')).toBeDefined();
    expect(screen.getByText('Research output only')).toBeDefined();
    expect(screen.getByText('High conviction')).toBeDefined();
    expect(screen.getByText('TCS is marked High conviction with 82/100 conviction.')).toBeDefined();
    expect(screen.queryByText(/provider/i)).toBeNull();
    expect(screen.queryByText(/buy|sell|hold/i)).toBeNull();
  });

  it('renders safe fallback when research is unavailable', () => {
    vi.mocked(useMarketBrainResearch).mockReturnValue({
      data: null,
      loading: false,
      error: 'Research failed',
      reload: vi.fn(),
    });

    render(<MarketBrainResearchPanel symbol="TCS" />);

    expect(screen.getByText('Research narrative is temporarily unavailable. Market data sections remain available.')).toBeDefined();
  });
});
