import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutProvider } from '../../context/LayoutContext';
import TrustCentrePage from '../TrustCentrePage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockEndpoint(urlPattern: string, response: unknown) {
  const originalFetch = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes(urlPattern)) {
      return { ok: true, json: async () => response };
    }
    if (originalFetch) return originalFetch(url);
    return { ok: true, json: async () => ({}) };
  }));
}

describe('TrustCentrePage regression states', () => {
  it('renders unaudited outcome metrics as unavailable instead of invented zero values', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('trust-metrics')) {
        return {
          ok: true,
          json: async () => ({
            status: 'partial',
            message: 'Only registry-backed trust metrics are available.',
            data: {
              alpha: null,
              hit_rate: null,
              sharpe_ratio: null,
              calibration_score: null,
              total_predictions: 125,
              total_outcomes: null,
            },
            dataState: {
              availability: 'partial',
              asOf: '2026-06-11',
              missingInputs: ['audited_outcomes.alpha'],
              completenessScore: 17,
            },
          }),
        };
      }
      if (url.includes('data-coverage')) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            generatedAt: '2026-06-11T00:00:00Z',
            database: { status: 'ready', migrationsReady: true, error: null },
            coverage: {
              symbols: { count: 6, status: 'available' },
              dailyPrices: { rowCount: 2987, status: 'available' },
              financialSnapshots: { rowCount: 5, status: 'available' },
              featureSnapshots: { rowCount: 2837, status: 'available' },
              factorSnapshots: { rowCount: 2365, status: 'available' },
              predictionRegistry: { rowCount: 27, status: 'available' },
            },
            providers: {},
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);
    render(<LayoutProvider><TrustCentrePage /></LayoutProvider>);

    expect(await screen.findByText('Only registry-backed trust metrics are available.')).toBeInTheDocument();
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
    expect(screen.getByText('Performance audit')).toBeInTheDocument();
  });

  it('renders an explicit error state when the metrics service fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('trust-metrics')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ message: 'Trust metrics are temporarily unavailable.' }),
        };
      }
      if (url.includes('data-coverage')) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            generatedAt: '2026-06-11T00:00:00Z',
            database: { status: 'ready', migrationsReady: true, error: null },
            coverage: {
              symbols: { count: 6, status: 'available' },
              dailyPrices: { rowCount: 2987, status: 'available' },
              financialSnapshots: { rowCount: 5, status: 'available' },
              featureSnapshots: { rowCount: 2837, status: 'available' },
              factorSnapshots: { rowCount: 2365, status: 'available' },
              predictionRegistry: { rowCount: 27, status: 'available' },
            },
            providers: {},
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);
    render(<LayoutProvider><TrustCentrePage /></LayoutProvider>);

    expect(await screen.findByText('Trust metrics are temporarily unavailable.')).toBeInTheDocument();
  });

  it('renders tab navigation with Overview, Providers, Coverage, Gaps tabs', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('trust-metrics')) {
        return { ok: true, json: async () => ({ status: 'ok', data: { alpha: null, hit_rate: null, sharpe_ratio: null, calibration_score: null, total_predictions: 0, total_outcomes: 0 }, dataState: { asOf: '2026-06-11', missingInputs: [], completenessScore: 0 } }) };
      }
      if (url.includes('data-coverage')) {
        return { ok: true, json: async () => ({ ok: true, generatedAt: '2026-06-11T00:00:00Z', database: { status: 'ready' }, coverage: {}, providers: {} }) };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);
    render(<LayoutProvider><TrustCentrePage /></LayoutProvider>);

    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Gaps & Methodology')).toBeInTheDocument();
  });

  it('contains no forbidden trading language', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('trust-metrics')) {
        return { ok: true, json: async () => ({ status: 'ok', data: { alpha: null, hit_rate: null, sharpe_ratio: null, calibration_score: null, total_predictions: 0, total_outcomes: 0 }, dataState: { asOf: '2026-06-11', missingInputs: [], completenessScore: 0 } }) };
      }
      if (url.includes('data-coverage')) {
        return { ok: true, json: async () => ({ ok: true, generatedAt: '2026-06-11T00:00:00Z', database: { status: 'ready' }, coverage: {}, providers: {} }) };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);
    render(<LayoutProvider><TrustCentrePage /></LayoutProvider>);

    await screen.findByText('Data Intelligence Centre');
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
  });
});
