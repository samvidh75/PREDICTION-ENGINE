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

describe('TrustCentrePage (Research Standards)', () => {
  it('renders Research Standards heading', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getAllByText('Research Standards')[0]).toBeInTheDocument();
  });

  it('renders methodology sections', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('How StockStory Evaluates Businesses')).toBeInTheDocument();
    expect(screen.getByText('Score Interpretation & Conviction Dimensions')).toBeInTheDocument();
    expect(screen.getByText('Why We Do Not Issue Buy, Sell, or Hold Calls')).toBeInTheDocument();
    expect(screen.getByText('Missing Data and Omissions')).toBeInTheDocument();
    expect(screen.getByText('Why Final Execution Happens Through Brokers')).toBeInTheDocument();
    expect(screen.getByText('Compliance Statement & SEBI Disclaimer')).toBeInTheDocument();
  });

  it('renders score dimensions', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.getByText('Momentum')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('Conviction')).toBeInTheDocument();
  });

  it('renders compliance pills', () => {
    renderWithProviders(<TrustCentrePage />);
    expect(screen.getByText('Research only')).toBeInTheDocument();
    expect(screen.getByText('Transparent methodology')).toBeInTheDocument();
    expect(screen.getByText('No fabricated data')).toBeInTheDocument();
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
