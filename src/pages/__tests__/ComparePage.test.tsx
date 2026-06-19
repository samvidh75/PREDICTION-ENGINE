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
      // Mock the research company endpoint and compare endpoint
      if (url.includes('/api/research/compare')) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              companies: [
                { symbol: 'AAA', companyName: 'Alpha Limited', scores: { quality: 70, value: 66, risk: 22 }, strengths: ['Strong margins'], risks: [] },
                { symbol: 'BBB', companyName: 'Beta Limited', scores: { quality: 64, value: 60, risk: 58 }, strengths: ['Stable cash flow'], risks: [] },
              ],
              factorComparison: [
                { factor: 'Risk', winner: 'Lower risk score', explanation: 'AAA has a significantly lower risk score (22) compared to BBB (58).' },
                { factor: 'Quality', winner: 'Highest research score', explanation: 'AAA scores higher (70) than BBB (64) on quality.' },
              ],
              recommendation: 'AAA presents the stronger research case across risk and quality.',
              missingDataCaveat: null,
            },
          }),
        };
      }
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
      expect(screen.getByText('Risk')).toBeInTheDocument();
      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('AAA has a significantly lower risk score (22) compared to BBB (58).')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
