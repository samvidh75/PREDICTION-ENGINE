import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestHandoffSheet } from '../InvestHandoffSheet';
import { hasBackendVocabulary, hasForbiddenTradingLanguage, hasRenderGarbage } from '../../../lib/compliance/forbiddenCopyAudit';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('InvestHandoffSheet', () => {
  it('renders thesis review stage when opened', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    expect(screen.getByText('Thesis review')).toBeInTheDocument();
    expect(screen.getByText('Key risks')).toBeInTheDocument();
    expect(screen.getByText('Investment checklist')).toBeInTheDocument();
  });

  it('shows company name and symbol', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" companyName="Tata Consultancy Services" />);
    const nameElements = screen.getAllByText(/Tata Consultancy Services/);
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    const symbolElements = screen.getAllByText(/TCS/);
    expect(symbolElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows broker disclaimer', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    expect(screen.getByText(/The final order will be placed with your broker/)).toBeInTheDocument();
  });

  it('shows Continue to broker button', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    expect(screen.getByText('Continue to broker')).toBeInTheDocument();
  });

  it('shows alternative actions', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    expect(screen.getByText('Track instead')).toBeInTheDocument();
    expect(screen.getByText('Compare first')).toBeInTheDocument();
    expect(screen.getByText('Back to research')).toBeInTheDocument();
  });

  it('shows broker handoff is being prepared on stage 2', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    fireEvent.click(screen.getByText('Continue to broker'));
    expect(screen.getByText('Broker handoff is being prepared')).toBeInTheDocument();
    expect(screen.getByText(/do not store.*broker credentials/i)).toBeInTheDocument();
  });

  it('contains no backend/provider vocabulary', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    const body = document.body.textContent || '';
    const violation = hasBackendVocabulary(body);
    expect(violation).toBeNull();
  });

  it('contains no forbidden trading language', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    const body = document.body.textContent || '';
    const violation = hasForbiddenTradingLanguage(body);
    expect(violation).toBeNull();
  });

  it('contains no render garbage', () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    const body = document.body.textContent || '';
    const violation = hasRenderGarbage(body);
    expect(violation).toBeNull();
  });
});
