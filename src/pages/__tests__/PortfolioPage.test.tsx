import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioPage from '../PortfolioPage';

const mockNavigate = vi.fn();

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('PortfolioPage', () => {
  it('renders empty state heading', () => {
    render(<PortfolioPage />);
    expect(screen.getByText('Portfolio')).toBeTruthy();
  });

  it('shows empty state message', () => {
    render(<PortfolioPage />);
    expect(screen.getByText(/No portfolio companies/i)).toBeTruthy();
  });

  it('renders CTA buttons', () => {
    render(<PortfolioPage />);
    expect(screen.getByText('Go to Watchlist')).toBeTruthy();
    expect(screen.getByText('Add Holding Manually')).toBeTruthy();
  });

  it('renders disclaimer', () => {
    render(<PortfolioPage />);
    expect(screen.getByText(/Not a broker account/i)).toBeTruthy();
  });

  it('navigation works — Go to Watchlist', () => {
    render(<PortfolioPage />);
    screen.getByText('Go to Watchlist').click();
    expect(mockNavigate).toHaveBeenCalledWith('/watchlist');
  });
});
