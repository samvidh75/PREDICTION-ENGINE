import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrustCentrePage from '../TrustCentrePage';
import { LayoutProvider } from '../../context/LayoutContext';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<LayoutProvider>{ui}</LayoutProvider>);
}

describe('TrustCentrePage (How StockStory Thinks)', () => {
  it('renders How StockStory Thinks heading', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('How StockStory Thinks')).toBeInTheDocument();
  });

  it('renders methodology sections', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Research workflow')).toBeInTheDocument();
    expect(screen.getByText('Conviction and research dimensions')).toBeInTheDocument();
    expect(screen.getByText('Research is not a recommendation')).toBeInTheDocument();
    expect(screen.getByText('Handling of partial information')).toBeInTheDocument();
    expect(screen.getByText('Broker handoff philosophy')).toBeInTheDocument();
    expect(screen.getByText('Compliance statement')).toBeInTheDocument();
  });

  it('renders score dimensions', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Financial strength')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Valuation context')).toBeInTheDocument();
    expect(screen.getByText('Momentum')).toBeInTheDocument();
    expect(screen.getByText('Risk context')).toBeInTheDocument();
    expect(screen.getByText('Conviction')).toBeInTheDocument();
  });

  it('renders compliance pills', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Research workspace')).toBeInTheDocument();
    expect(screen.getByText('Transparent methodology')).toBeInTheDocument();
    expect(screen.getByText('Structured factor view')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('View rankings')).toBeInTheDocument();
    expect(screen.getByText('Read mission')).toBeInTheDocument();
  });

  it('contains no backend/provider vocabulary', () => {
    renderWithProviders(<TrustCentrePage />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/IndianAPI|Yahoo|Jugaad|NSEPython|Upstox|Screener|Finnhub/i);
    expect(body).not.toMatch(/coverage|freshness|lineage|migration|backfill|diagnostics/i);
  });

  it('contains no forbidden trading language', () => {
    renderWithProviders(<TrustCentrePage />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
  });
});
