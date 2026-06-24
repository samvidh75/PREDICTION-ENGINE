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

describe('TrustCentrePage (How StockStory thinks)', () => {
  it('renders How StockStory thinks heading', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('How StockStory thinks')).toBeInTheDocument();
  });

  it('renders methodology sections', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Research, not guarantees')).toBeInTheDocument();
    expect(screen.getByText('The five core factors')).toBeInTheDocument();
    expect(screen.getByText('How to read conviction')).toBeInTheDocument();
    expect(screen.getByText('Before you invest')).toBeInTheDocument();
    expect(screen.getByText('Responsible use')).toBeInTheDocument();
    expect(screen.getByText('Read the full company thesis and understand the narrative')).toBeInTheDocument();
  });

  it('renders score dimensions', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.getByText('Momentum')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('High Conviction')).toBeInTheDocument();
  });

  it('renders compliance pills', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('StockStory is not a guarantee of future returns')).toBeInTheDocument();
    expect(screen.getByText('All investments carry market risk')).toBeInTheDocument();
    expect(screen.getByText('Always do your own research before investing')).toBeInTheDocument();
  });

  it('renders methodology page sections', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Research, not guarantees')).toBeInTheDocument();
    expect(screen.getByText('The five core factors')).toBeInTheDocument();
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
