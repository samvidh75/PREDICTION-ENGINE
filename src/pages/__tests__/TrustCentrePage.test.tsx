import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrustCentrePage from '../TrustCentrePage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TrustCentrePage (Research Standards)', () => {
  it('renders Research Standards heading', () => {
    render(<TrustCentrePage />);
    expect(screen.getByText('Research Standards')).toBeInTheDocument();
  });

  it('renders methodology sections', () => {
    render(<TrustCentrePage />);
    expect(screen.getByText('How StockStory Evaluates Companies')).toBeInTheDocument();
    expect(screen.getByText('What the Scores Mean')).toBeInTheDocument();
    expect(screen.getByText('How to Use This Research')).toBeInTheDocument();
    expect(screen.getByText('Research Standards')).toBeInTheDocument();
    expect(screen.getByText('Why Execution Happens Through Brokers')).toBeInTheDocument();
    expect(screen.getByText('Compliance Statement')).toBeInTheDocument();
  });

  it('renders score dimensions', () => {
    render(<TrustCentrePage />);
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.getByText('Momentum')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
  });

  it('renders compliance pills', () => {
    render(<TrustCentrePage />);
    expect(screen.getByText('Research only')).toBeInTheDocument();
    expect(screen.getByText('Transparent methodology')).toBeInTheDocument();
    expect(screen.getByText('No fabricated data')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<TrustCentrePage />);
    expect(screen.getByText('View rankings')).toBeInTheDocument();
    expect(screen.getByText('Read mission')).toBeInTheDocument();
  });

  it('contains no backend/provider vocabulary', () => {
    render(<TrustCentrePage />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/IndianAPI|Yahoo|Jugaad|NSEPython|Upstox|Screener|Finnhub/i);
    expect(body).not.toMatch(/coverage|freshness|lineage|migration|backfill|diagnostics/i);
  });

  it('contains no forbidden trading language', () => {
    render(<TrustCentrePage />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
  });
});
