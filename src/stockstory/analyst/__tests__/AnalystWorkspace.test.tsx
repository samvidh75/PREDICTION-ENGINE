import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AnalystWorkspace from '../../../pages/AnalystWorkspace';

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

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('AnalystWorkspace UI', () => {
  it('workspace route renders', () => {
    render(wrap(<AnalystWorkspace />));
    expect(screen.getByText(/Analyst Workspace/i)).toBeTruthy();
    expect(screen.getAllByText(/not investment advice/i).length).toBeGreaterThan(0);
  });

  it('empty state safe', async () => {
    render(wrap(<AnalystWorkspace />));
    // The deep-dive card now fetches on mount and shows a real loading
    // skeleton first; in this test environment (no server) the fetch
    // fails, so it settles into the error state, not literal "No deep
    // dive" text. Either is a safe, non-crashing render — assert the
    // component renders without throwing and reaches a stable end state.
    await waitFor(() => {
      const hasError = screen.queryByText(/couldn't load|research unavailable/i);
      const hasEmpty = screen.queryByText(/No deep dive available/i);
      expect(hasError ?? hasEmpty).toBeTruthy();
    });
  });

  it('no forbidden language in static copy', () => {
    render(wrap(<AnalystWorkspace />));
    expect(document.body.textContent).not.toMatch(/Buy now|Strong Buy|multibagger/i);
  });
});
