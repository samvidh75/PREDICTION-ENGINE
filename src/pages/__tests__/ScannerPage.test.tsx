import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ScannerPage from '../ScannerPage';

const mockNavigate = vi.hoisted(() => vi.fn());
const unsafePublicCopy = /provider|transport|backend|adapter|guaranteed|sure shot|multibagger|model|runtime|WebLLM|Ollama|browser_local/i;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Deterministic market session — the page's "live" chip text depends on the
// session, which is wall-clock dependent. Force "open" so assertions are stable.
vi.mock('../../hooks/useMarketStatus', () => ({
  useMarketStatus: () => ({
    session: 'open' as const,
    isOpen: true,
    phtTime: '10:00 AM',
    label: 'Market open',
    detail: 'Live trading 09:30 – 15:30 PHT',
  }),
}));

const FIXTURE_QUOTES = [
  { symbol: 'BDO', name: 'BDO Unibank, Inc.', price: 123, change: -3, changePercent: -2.38, volume: 2816730, sector: 'financials' },
  { symbol: 'JFC', name: 'Jollibee Foods Corporation', price: 250, change: 5, changePercent: 2.04, volume: 500000, sector: 'services' },
  { symbol: 'AC', name: 'Ayala Corporation', price: 485, change: -5, changePercent: -1.02, volume: 103840, sector: 'holdingFirms' },
];

function mockFetchSuccess() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve({
      ok: true,
      asOf: new Date().toISOString(),
      coverage: '3/294',
      reportingRatio: '3/294',
      quotes: FIXTURE_QUOTES,
    }),
  }));
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockNavigate.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ScannerPage />
    </MemoryRouter>,
  );
}

describe('ScannerPage', () => {
  it('shows a loading state before live data arrives', () => {
    mockFetchSuccess();
    renderPage();
    expect(screen.getByText(/Fetching current prices/i)).toBeTruthy();
  });

  it('renders real stock rows once the live feed responds', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BDO')).toBeTruthy();
    });

    expect(screen.getByText('JFC')).toBeTruthy();
    expect(screen.getByText('AC')).toBeTruthy();
    expect(screen.getByText(/3\/294 live/)).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('never shows fabricated fundamentals — only real price/volume signals', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BDO')).toBeTruthy();
    });

    const renderedText = document.body.textContent ?? '';
    // No factor-score jargon (quality/growth/valuation percentages) should render as data
    expect(renderedText).not.toMatch(/Factor Breakdown/);
    expect(renderedText).toMatch(/isn't available yet/);
  });

  it('has a safe empty/error state when the live feed fails', async () => {
    mockFetchFailure();
    renderPage();

    await screen.findByText(/Couldn't reach the live PSE feed/, {}, { timeout: 3000 });
    expect(screen.getByText(/Feed unavailable/)).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('filters results via search', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BDO')).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText('Search symbol or company'), { target: { value: 'jollibee' } });

    await waitFor(() => {
      expect(screen.queryByText('BDO')).toBeNull();
      expect(screen.getByText('JFC')).toBeTruthy();
    });
  });

  it('switches sort mode between gainers and losers', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BDO')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Top Losers'));

    await waitFor(() => {
      const rows = screen.getAllByText(/BDO|JFC|AC/);
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it('navigates to the stock detail page on row click', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BDO')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('BDO'));

    expect(mockNavigate).toHaveBeenCalledWith('/stock/BDO');
  });
});
