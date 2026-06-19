import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  it('renders broker not ready state when opened without context', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/Broker handoff is being prepared/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Track instead')).toBeInTheDocument();
    expect(screen.getByText('Compare first')).toBeInTheDocument();
    expect(screen.getByText('Back to research')).toBeInTheDocument();
  });

  it('shows company identity in no-broker mode', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/TCS|tcs|Invest review/i)).toBeInTheDocument();
    });
  });

  it('shows no broker handoff disclaimer in no-broker mode', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/Broker integration is not yet available/i)).toBeInTheDocument();
    });
  });

  it('shows alternative actions in no-broker mode', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText('Track instead')).toBeInTheDocument();
      expect(screen.getByText('Compare first')).toBeInTheDocument();
      expect(screen.getByText('Back to research')).toBeInTheDocument();
    });
  });

  it('contains no backend/provider vocabulary', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/Broker handoff is being prepared/i)).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasBackendVocabulary(body);
    expect(violation).toBeNull();
  });

  it('contains no forbidden trading language', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/Broker handoff is being prepared/i)).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasForbiddenTradingLanguage(body);
    expect(violation).toBeNull();
  });

  it('contains no product-forbidden terms', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/Broker handoff is being prepared/i)).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasProductForbiddenTerms(body);
    expect(violation).toBeNull();
  });

  it('contains no render garbage', async () => {
    render(<InvestHandoffSheet open={true} onClose={vi.fn()} symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/Broker handoff is being prepared/i)).toBeInTheDocument();
    });
    const body = document.body.textContent || '';
    const violation = hasRenderGarbage(body);
    expect(violation).toBeNull();
  });
});
