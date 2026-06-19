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
      expect(document.querySelector('.ss-page-compare, .ss-surface, main')).toBeTruthy();
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

  it('maps lower risk factor to a clear lower-risk cue', async () => {
    window.history.pushState({}, '', '/?page=compare&ids=AAA,BBB');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/intelligence/insight/AAA')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              companyName: 'Alpha Limited',
              healthScore: 81,
              classification: 'Watch',
              confidence: { score: 72, level: 'medium' },
              factors: { quality: { score: 70 }, value: { score: 66 }, risk: { score: 22 } },
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          data: {
            companyName: 'Beta Limited',
            healthScore: 75,
            classification: 'Watch',
            confidence: { score: 68, level: 'medium' },
            factors: { quality: { score: 64 }, value: { score: 60 }, risk: { score: 58 } },
          },
        }),
      };
    }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      expect(screen.getByText('Lower risk score')).toBeInTheDocument();
      expect(screen.queryByText('Higher risk')).not.toBeInTheDocument();
      expect(screen.getByText('Highest research score')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
