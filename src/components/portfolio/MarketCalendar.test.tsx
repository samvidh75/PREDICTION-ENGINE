import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MarketCalendar from './MarketCalendar';

describe('MarketCalendar sourced events', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders sourced corporate events with lineage evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'ok',
        dataState: {
          asOf: '2026-06-10',
          lineage: [{ sourceTable: 'corporate_timeline', isFallback: false, isSynthetic: false }],
        },
        data: {
          events: [{
            id: 'evt-1',
            date: '2026-06-12',
            ticker: 'TCS',
            type: 'Results',
            details: 'Audited result filing',
            source: 'https://exchange.example/filing',
            asOf: '2026-06-12',
          }],
        },
      }),
    } as unknown as Response)));

    render(<MarketCalendar />);

    await waitFor(() => expect(screen.getByText('TCS')).toBeTruthy());
    expect(screen.getByText(/corporate_timeline/i)).toBeTruthy();
    expect(screen.getByText(/Audited result filing/i)).toBeTruthy();
  });

  it('does not render static sample events when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    render(<MarketCalendar />);

    await waitFor(() => expect(screen.getByText(/source request failed/i)).toBeTruthy());
    expect(screen.queryByText('RELIANCE')).toBeNull();
    expect(screen.queryByText('June 12')).toBeNull();
  });
});
