import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrustCentrePage from '../TrustCentrePage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TrustCentrePage regression states', () => {
  it('renders unaudited outcome metrics as unavailable instead of invented zero values', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
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
    })) as unknown as typeof fetch);

    render(<TrustCentrePage />);

    expect(await screen.findByText(/Trust metrics status: partial/i)).toBeInTheDocument();
    expect(screen.getAllByText('Data unavailable').length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  it('renders an explicit error state when the metrics service fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ message: 'Trust metrics are temporarily unavailable.' }),
    })) as unknown as typeof fetch);

    render(<TrustCentrePage />);

    expect(await screen.findByText(/Trust metrics status: error/i)).toBeInTheDocument();
    expect(screen.getByText('Trust metrics are temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getAllByText('Data unavailable').length).toBeGreaterThan(0);
  });
});
