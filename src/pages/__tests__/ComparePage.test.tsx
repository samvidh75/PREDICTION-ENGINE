import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LayoutProvider } from '../../context/LayoutContext';
import ComparePage from '../ComparePage';
import { hasProductForbiddenTerms, hasRenderGarbage } from '../../lib/compliance/forbiddenCopyAudit';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('../../architecture/navigation/routeCoordinator', () => ({
  navigateToStock: vi.fn(),
}));

describe('ComparePage empty state', () => {
  it('renders without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      expect(screen.getByText('Compare companies')).toBeInTheDocument();
    });
  });

  it('contains no forbidden trading language', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
    }, { timeout: 3000 });
  });

  it('contains no raw undefined/null/NaN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(body).not.toMatch(/\bundefined\b/);
      expect(body).not.toMatch(/\bNaN\b/);
    }, { timeout: 3000 });
  });

  it('contains no product-forbidden terms in the empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(hasProductForbiddenTerms(body)).toBeNull();
      expect(hasRenderGarbage(body)).toBeNull();
    }, { timeout: 3000 });
  });

  it('renders empty state when no companies selected', async () => {
    window.history.pushState({}, '', '/?page=compare&ids=AAA,BBB');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/search/universal')) {
        return {
          ok: true,
          json: async () => ({ ok: true, data: { query: '', results: [] } }),
        };
      }
      return {
        ok: true,
        json: async () => ({}),
      };
    }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      expect(screen.getByText('Select two companies to compare')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
