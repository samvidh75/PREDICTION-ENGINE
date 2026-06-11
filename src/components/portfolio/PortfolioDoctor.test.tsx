import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PortfolioDoctor from './PortfolioDoctor';

const getHoldings = vi.fn();

vi.mock('../../services/portfolio/PortfolioEngine', () => ({
  PortfolioEngine: {
    getHoldings: () => getHoldings(),
  },
}));

function portfolioEnvelope() {
  return {
    status: 'ok',
    data: {
      intelligence: {
        diversification_score: 0.55,
        concentration_score: 0.3,
        factor_exposure: { quality: 0.62, growth: 0.58, momentum: 0.5 },
        risk_exposure: { aggregate_risk: 0.42, risk_level: 'LOW' },
        portfolio_health: 'HEALTHY',
        portfolio_fragility: 'LOW',
        portfolio_resilience: 'STRONG',
        stock_count: 2,
        sector_count: 2,
      },
    },
  };
}

describe('PortfolioDoctor goal-linked diagnostics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getHoldings.mockReturnValue([
      { symbol: 'TCS', shares: 10, avgBuyPrice: 100, sector: 'IT' },
      { symbol: 'INFY', shares: 5, avgBuyPrice: 200, sector: 'IT' },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: vi.fn().mockResolvedValue(portfolioEnvelope()),
    } as unknown as Response)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts weighted local holdings and selected goal', async () => {
    render(<PortfolioDoctor />);

    await waitFor(() => expect(screen.getByText('Portfolio Doctor')).toBeTruthy());

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe('/api/intelligence/portfolio');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.goal).toBe('balanced');
    expect(body.positions).toEqual([
      { symbol: 'TCS', weight: 0.5 },
      { symbol: 'INFY', weight: 0.5 },
    ]);

    fireEvent.click(screen.getByText('Preserve Capital'));
    await waitFor(() => {
      const latest = vi.mocked(fetch).mock.calls.at(-1);
      expect(JSON.parse(String((latest?.[1] as RequestInit).body)).goal).toBe('capital_preservation');
    });
  });

  it('shows honest empty state without remote request when no holdings exist', () => {
    vi.unstubAllGlobals();
    getHoldings.mockReturnValue([]);
    vi.stubGlobal('fetch', vi.fn());

    render(<PortfolioDoctor />);

    expect(screen.getByText('No Portfolio Data')).toBeTruthy();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
