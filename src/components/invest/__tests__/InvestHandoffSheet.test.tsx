import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestHandoffSheet } from '../InvestHandoffSheet';
import { hasBackendVocabulary, hasForbiddenTradingLanguage, hasProductForbiddenTerms, hasRenderGarbage } from '../../../lib/compliance/forbiddenCopyAudit';

vi.mock('../../../services/api/client', () => {
  const mock = {
    getInvestContext: vi.fn().mockRejectedValue(new Error('no data')),
  };
  return {
    api: mock,
    __esModule: true,
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('InvestHandoffSheet', () => {
  it('renders thesis review stage when opened', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Thesis review')).toBeInTheDocument();
    });
    expect(screen.getByText('Key risks')).toBeInTheDocument();
    expect(screen.getByText('Investment checklist')).toBeInTheDocument();
  });

  it('shows company name and symbol', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" companyName="Tata Consultancy Services" />);
    await waitFor(() => {
      const nameElements = screen.getAllByText(/Tata Consultancy Services/);
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });
    const symbolElements = screen.getAllByText(/TCS/);
    expect(symbolElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows broker handoff disclaimer', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/Final order will be placed with your broker/)).toBeInTheDocument();
    });
  });

  it('shows continue review button', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Continue review')).toBeInTheDocument();
    });
  });

  it('shows alternative actions', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Track instead')).toBeInTheDocument();
      expect(screen.getByText('Compare first')).toBeInTheDocument();
      expect(screen.getByText('Back to research')).toBeInTheDocument();
    });
  });

  it('shows stage 2 with review copy instead of external handoff', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Continue review')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue review'));
    await waitFor(() => {
      expect(screen.getByText(/Review your research before deciding/)).toBeInTheDocument();
      expect(screen.getByText(/No broker credentials are stored in StockStory/)).toBeInTheDocument();
    });
  });

  it('contains no backend/provider vocabulary', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Thesis review')).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasBackendVocabulary(body);
    expect(violation).toBeNull();
  });

  it('contains no forbidden trading language', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Thesis review')).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasForbiddenTradingLanguage(body);
    expect(violation).toBeNull();
  });

  it('contains no product-forbidden terms', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Thesis review')).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasProductForbiddenTerms(body);
    expect(violation).toBeNull();
  });

  it('contains no render garbage', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Thesis review')).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasRenderGarbage(body);
    expect(violation).toBeNull();
  });
});
