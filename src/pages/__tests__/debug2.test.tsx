import { render, screen } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import PortfolioPage from '../PortfolioPage';

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
  useNavigate: () => vi.fn(),
}));

it('debug disclaimer', async () => {
  render(<PortfolioPage />);
  const allParaTexts = document.querySelectorAll('p');
  allParaTexts.forEach((p, i) => console.log(`p[${i}]:`, JSON.stringify(p.textContent)));
});
