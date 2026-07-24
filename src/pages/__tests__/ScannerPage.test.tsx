import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('../../components/ai-orchestrator/ResearchAiExplanationPanel', () => ({
  ResearchAiExplanationPanel: (_props: { context: unknown }) => (
    <div data-testid="ai-explanation-panel">AI explanation ready</div>
  ),
}));

// Mock stockResearch so getScannerStocks returns fixture data for tests.
// Values chosen to pass the quality-compounders preset thresholds (quality≥60, stability≥45, maxDebtToEquity≤2.5, minRoe≥12).
vi.mock('../../lib/stockResearch', () => ({
  getScannerStocks: () => [
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', industry: 'Oil & Gas', price: 2450, change: 12, changePercent: 0.49, pe: 15, pb: 3.2, roe: 45, debtToEquity: 0.05, marketCap: 1650000, dividendYield: 3, revenueGrowth: 25, profitGrowth: 25, rsi: 60 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', industry: 'Software', price: 3890, change: -15, changePercent: -0.38, pe: 35, pb: 8.5, roe: 42, debtToEquity: 0.15, marketCap: 1400000, dividendYield: 2.1, revenueGrowth: 11.5, profitGrowth: 14.2, rsi: 55 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financial Services', industry: 'Banking', price: 1680, change: 8, changePercent: 0.48, pe: 18, pb: 3.8, roe: 38, debtToEquity: 0.45, marketCap: 950000, dividendYield: 1.8, revenueGrowth: 18.3, profitGrowth: 20.1, rsi: 60 },
  ],
  getStockResearch: () => null,
}));

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

/** Get the first visible stock row by finding DIV[role="button"] or stock-related <button> elements */
function getFirstStockRow(): HTMLElement {
  const allButtons = screen.getAllByRole('button');
  // Desktop: DIV[role="button"], Mobile: <button> with stock rank
  const stockRows = allButtons.filter(
    (el) => (
      el.tagName === 'DIV' && el.getAttribute('role') === 'button'
    ) || (
      el.tagName === 'BUTTON' && /\d+[A-Z]/.test(el.textContent ?? '')
    ),
  );
  expect(stockRows.length).toBeGreaterThan(0);
  return stockRows[0];
}

describe('ScannerPage accessibility integration', () => {
  it('renders scanner presets and result rows', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Quality Compounders').length).toBeGreaterThanOrEqual(1);
    });

    // At least 5 preset buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('shows AI detail panel on hover', async () => {
    renderPage();

    await waitFor(() => {
      const stockRows = screen.getAllByRole('button').filter(
        (el) => el.tagName === 'DIV' && el.getAttribute('role') === 'button',
      );
      expect(stockRows.length).toBeGreaterThan(0);
    });

    const row = getFirstStockRow();
    fireEvent.mouseEnter(row);

    await waitFor(() => {
      expect(screen.getByText('Factor Breakdown')).toBeTruthy();
    });

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('keeps AI panel visible after click (selected stock)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    const row = getFirstStockRow();
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Factor Breakdown')).toBeTruthy();
    });

    // Mouse leave should NOT hide the panel since it's selected
    fireEvent.mouseLeave(row);

    expect(screen.getByText('Factor Breakdown')).toBeTruthy();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('navigates to stock detail on double-click', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    const row = getFirstStockRow();
    fireEvent.click(row);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/stock\/[A-Z]+$/),
    );
  });

  it('shows AI panel on keyboard focus', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    const row = getFirstStockRow();
    fireEvent.focus(row);

    await waitFor(() => {
      expect(screen.getByText('Factor Breakdown')).toBeTruthy();
    });

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('selects stock on Enter key', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    const row = getFirstStockRow();
    fireEvent.keyDown(row, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Factor Breakdown')).toBeTruthy();
    });

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });

  it('selects stock on Space key', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    const row = getFirstStockRow();
    fireEvent.keyDown(row, { key: ' ' });

    await waitFor(() => {
      expect(screen.getByText('Factor Breakdown')).toBeTruthy();
    });
  });

  it('renders ResearchAiExplanationPanel when a stock is active', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    const row = getFirstStockRow();
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByTestId('ai-explanation-panel')).toBeTruthy();
    });
  });

  it('does not auto-start LLM on initial render', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Quality Compounders').length).toBeGreaterThanOrEqual(1);
    });

    // No AI detail panel before interaction
    expect(screen.queryByText('Factor Breakdown')).toBeNull();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(unsafePublicCopy);
  });
});
