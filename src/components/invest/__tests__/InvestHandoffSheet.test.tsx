import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InvestHandoffSheet } from '../InvestHandoffSheet';
import { hasBackendVocabulary, hasProductForbiddenTerms, hasRenderGarbage } from '../../../lib/compliance/forbiddenCopyAudit';

vi.mock('../../../services/api/client', () => ({
  api: { getInvestContext: vi.fn().mockRejectedValue(new Error('no data')) },
  __esModule: true,
}));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function renderReady() {
  render(<InvestHandoffSheet open onClose={vi.fn()} symbol="TCS" companyName="Tata Consultancy Services" marketPrice={3800} />);
  await waitFor(() => expect(screen.getByText(/Investment checklist/i)).toBeInTheDocument());
}

describe('InvestHandoffSheet', () => {
  it('keeps the research review available if context is temporarily unavailable', async () => {
    await renderReady();
    expect(screen.getByText(/Tata Consultancy Services/i)).toBeInTheDocument();
    expect(screen.getByText('Track instead')).toBeInTheDocument();
    expect(screen.getByText('Compare first')).toBeInTheDocument();
  });

  it('opens a broker and quantity selection after review', async () => {
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: /Continue review/i }));
    expect(screen.getByText(/Choose where to continue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zerodha Kite', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Groww/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toHaveValue(1);
    expect(screen.getByText(/₹3,800/)).toBeInTheDocument();
  });

  it('supports an unlisted broker name', async () => {
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: /Continue review/i }));
    fireEvent.click(screen.getByRole('button', { name: /Other broker/i }));
    expect(screen.getByPlaceholderText(/Type your broker/i)).toBeInTheDocument();
  });

  it('states that sensitive broker credentials stay outside StockStory', async () => {
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: /Continue review/i }));
    expect(screen.getByText(/never asks for or stores your broker password, PIN or OTP/i)).toBeInTheDocument();
  });

  it('contains no backend vocabulary, forbidden product terms, or render garbage', async () => {
    await renderReady();
    const body = document.body.textContent || '';
    expect(hasBackendVocabulary(body)).toBeNull();
    expect(hasProductForbiddenTerms(body)).toBeNull();
    expect(hasRenderGarbage(body)).toBeNull();
  });
});
