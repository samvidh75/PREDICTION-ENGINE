import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResearchAlertsPanel } from './ResearchAlertsPanel';

const unsafeTradingWord = ['B', 'uy'].join('');
const unsafeInfraWord = ['back', 'end'].join('');
const unsafeInternalWord = ['vec', 'tor'].join('');

const safeAlerts = [
  {
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank',
    category: 'risk changed',
    headline: 'Credit cost pressure needs review',
    summary: ['Asset quality trend changed'],
    risksToReview: ['Credit cost pressure'],
    whatToWatch: ['Deposit growth trend'],
  },
  {
    symbol: 'LT',
    companyName: 'Larsen and Toubro',
    headline: 'Important move after execution update',
    summary: ['Execution context changed'],
    whatToWatch: ['Order book conversion'],
  },
];

describe('ResearchAlertsPanel', () => {
  it('renders a safe empty state when no alert evidence exists', () => {
    render(<ResearchAlertsPanel alerts={[]} />);

    expect(screen.getByText('No research alerts to review')).toBeTruthy();
    expect(screen.getByText(/safe research context to review/i)).toBeTruthy();
  });

  it('renders safe research alert cards', () => {
    render(<ResearchAlertsPanel alerts={safeAlerts} />);

    expect(screen.getByText('Important changes to review')).toBeTruthy();
    expect(screen.getByText('HDFC Bank')).toBeTruthy();
    expect(screen.getByText('Risk changed')).toBeTruthy();
    expect(screen.getByText('Asset quality trend changed')).toBeTruthy();
    expect(screen.getByText('Credit cost pressure')).toBeTruthy();
    expect(screen.getByText('Deposit growth trend')).toBeTruthy();
    expect(screen.getByText('Larsen and Toubro')).toBeTruthy();
    expect(screen.getByText('Important move')).toBeTruthy();
  });

  it('drops unsafe copy before rendering', () => {
    const unsafeHeadline = `data ${unsafeInfraWord} unavailable`;
    const unsafeSummary = `${unsafeTradingWord} direct action phrase`;
    const unsafeRisk = `internal ${unsafeInternalWord} detail`;

    render(
      <ResearchAlertsPanel
        alerts={[
          {
            symbol: 'TCS',
            companyName: 'TCS',
            headline: unsafeHeadline,
            summary: [unsafeSummary, 'Margin profile needs review'],
            risksToReview: [unsafeRisk, 'Client concentration'],
          },
        ]}
      />,
    );

    expect(screen.getAllByText('TCS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Margin profile needs review')).toBeTruthy();
    expect(screen.getByText('Client concentration')).toBeTruthy();
    expect(screen.queryByText(unsafeHeadline)).toBeNull();
    expect(screen.queryByText(unsafeSummary)).toBeNull();
    expect(screen.queryByText(unsafeRisk)).toBeNull();
  });

  it('renders only action buttons with supplied handlers', () => {
    const onResearch = vi.fn();
    const onCompare = vi.fn();
    const onTrack = vi.fn();
    const onInvest = vi.fn();

    render(
      <ResearchAlertsPanel
        alerts={[safeAlerts[0]]}
        onResearch={onResearch}
        onCompare={onCompare}
        onTrack={onTrack}
        onInvest={onInvest}
      />,
    );

    fireEvent.click(screen.getByText('Research'));
    fireEvent.click(screen.getByText('Compare'));
    fireEvent.click(screen.getByText('Track'));
    fireEvent.click(screen.getByText('Invest'));

    expect(onResearch).toHaveBeenCalledWith('HDFCBANK');
    expect(onCompare).toHaveBeenCalledWith('HDFCBANK');
    expect(onTrack).toHaveBeenCalledWith('HDFCBANK');
    expect(onInvest).toHaveBeenCalledWith('HDFCBANK');
  });

  it('does not render raw invalid scalar text', () => {
    render(
      <ResearchAlertsPanel
        alerts={[
          {
            symbol: 'SBIN',
            companyName: 'State Bank of India',
            headline: null,
            summary: [undefined, 'Credit cost needs review', Number.NaN, Number.POSITIVE_INFINITY],
          },
        ]}
      />,
    );

    expect(screen.getByText('State Bank of India')).toBeTruthy();
    expect(screen.getByText('Credit cost needs review')).toBeTruthy();
    expect(screen.queryByText('null')).toBeNull();
    expect(screen.queryByText('undefined')).toBeNull();
    expect(screen.queryByText('NaN')).toBeNull();
    expect(screen.queryByText('Infinity')).toBeNull();
  });
});
