import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StockCompare from './StockCompare';

function stockstoryResponse(symbol: string, missingInputs: string[] = []) {
  return {
    status: 'ok',
    dataState: {
      asOf: '2026-06-10',
      missingInputs,
      lineage: [{ sourceTable: 'prediction_registry', isFallback: false, isSynthetic: false }],
    },
    data: {
      rankingScore: symbol === 'TCS' ? 82 : 77,
      classification: 'Healthy',
      growth: 70,
      quality: 72,
      stability: 74,
      valuation: 65,
      momentum: 68,
      risk: 35,
      narrative: `${symbol} sourced narrative`,
    },
  };
}

describe('StockCompare evidence badges', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/predictions')) {
        return { ok: true, json: vi.fn().mockResolvedValue([]) } as unknown as Response;
      }
      const symbol = url.includes('TCS') ? 'TCS' : 'INFY';
      return {
        ok: true,
        json: vi.fn().mockResolvedValue(stockstoryResponse(symbol, symbol === 'INFY' ? ['factor_snapshots'] : [])),
      } as unknown as Response;
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders available and partial evidence from API lineage', async () => {
    render(<StockCompare />);

    fireEvent.change(screen.getByPlaceholderText('RELIANCE'), { target: { value: 'TCS' } });
    fireEvent.change(screen.getByPlaceholderText('INFY'), { target: { value: 'INFY' } });
    fireEvent.click(screen.getByText('Compare'));

    await waitFor(() => expect(screen.getByText('Evidence available')).toBeTruthy());
    expect(screen.getByText('Partial evidence')).toBeTruthy();
    expect(screen.getAllByText('prediction_registry').length).toBeGreaterThan(0);
    expect(screen.getByText(/Missing: factor_snapshots/i)).toBeTruthy();
  });
});
