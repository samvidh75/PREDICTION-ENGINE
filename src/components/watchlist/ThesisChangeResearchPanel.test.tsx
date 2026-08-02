import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThesisChangeResearchPanel } from './ThesisChangeResearchPanel';

const unsafeTradingWord = ['B', 'uy'].join('');
const unsafeInfraWord = ['back', 'end'].join('');
const unsafeInternalWord = ['vec', 'tor'].join('');

const safeItems = [
  {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries',
    headline: 'Margins improved while debt risk needs review',
    thesis: ['Energy and retail performance improved'],
    risksToReview: ['Debt levels need review'],
    whatToWatch: ['Retail margin trend'],
    needsReview: true,
  },
  {
    symbol: 'INFY',
    companyName: 'Infosys',
    summary: ['Margin profile strengthened'],
    whatToWatch: ['Large deal conversion'],
  },
];

describe('ThesisChangeResearchPanel', () => {
  it('renders a safe empty state when no thesis change evidence exists', () => {
    render(<ThesisChangeResearchPanel items={[]} />);

    expect(screen.getByText('Track thesis changes')).toBeTruthy();
    expect(screen.getByText(/safe evidence to review/i)).toBeTruthy();
  });

  it('renders safe thesis change cards', () => {
    render(<ThesisChangeResearchPanel items={safeItems} />);

    expect(screen.getByText('Watchlist research changes')).toBeTruthy();
    expect(screen.getByText('Reliance Industries')).toBeTruthy();
    expect(screen.getByText('Needs review')).toBeTruthy();
    expect(screen.getByText('Energy and retail performance improved')).toBeTruthy();
    expect(screen.getByText('Debt levels need review')).toBeTruthy();
    expect(screen.getByText('Retail margin trend')).toBeTruthy();
    expect(screen.getByText('Infosys')).toBeTruthy();
    expect(screen.getByText('Thesis improving')).toBeTruthy();
  });

  it('drops unsafe copy before rendering', () => {
    const unsafeHeadline = `data ${unsafeInfraWord} unavailable`;
    const unsafeThesis = `${unsafeTradingWord} direct action phrase`;
    const unsafeRisk = `internal ${unsafeInternalWord} detail`;

    render(
      <ThesisChangeResearchPanel
        items={[
          {
            symbol: 'TCS',
            companyName: 'TCS',
            headline: unsafeHeadline,
            thesis: [unsafeThesis],
            risksToReview: [unsafeRisk],
          },
        ]}
      />,
    );

    expect(screen.getAllByText('TCS').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(unsafeHeadline)).toBeNull();
    expect(screen.queryByText(unsafeThesis)).toBeNull();
    expect(screen.queryByText(unsafeRisk)).toBeNull();
  });

  it('renders only action buttons with supplied handlers', () => {
    const onResearch = vi.fn();
    const onCompare = vi.fn();
    const onTrack = vi.fn();
    const onInvest = vi.fn();

    render(
      <ThesisChangeResearchPanel
        items={[safeItems[0]]}
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

    expect(onResearch).toHaveBeenCalledWith('RELIANCE');
    expect(onCompare).toHaveBeenCalledWith('RELIANCE');
    expect(onTrack).toHaveBeenCalledWith('RELIANCE');
    expect(onInvest).toHaveBeenCalledWith('RELIANCE');
  });

  it('does not render raw invalid scalar text', () => {
    render(
      <ThesisChangeResearchPanel
        items={[
          {
            symbol: 'SBIN',
            companyName: 'State Bank of India',
            headline: null,
            thesis: [undefined, 'Credit cost needs review', Number.NaN, Number.POSITIVE_INFINITY],
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
