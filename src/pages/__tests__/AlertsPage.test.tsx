import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AlertsPage from '../AlertsPage';
import { LayoutProvider } from '../../context/LayoutContext';
import { hasBackendVocabulary, hasForbiddenTradingLanguage, hasRenderGarbage } from '../../lib/compliance/forbiddenCopyAudit';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<LayoutProvider>{ui}</LayoutProvider>);
}

describe('AlertsPage', () => {
  it('renders What Changed heading', () => {
    renderWithProviders(<AlertsPage />);
    const headings = screen.getAllByText('What Changed');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders alert categories in panel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [] })
    }));
    renderWithProviders(<AlertsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Track a company to review important changes/)).toBeInTheDocument();
    });
  });

  it('renders action buttons', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [] })
    }));
    renderWithProviders(<AlertsPage />);
    await waitFor(() => {
      expect(screen.getByText('Open scanner')).toBeInTheDocument();
      expect(screen.getByText('Search company')).toBeInTheDocument();
    });
  });

  it('contains no backend/provider vocabulary', () => {
    renderWithProviders(<AlertsPage />);
    const body = document.body.textContent || '';
    const violation = hasBackendVocabulary(body);
    expect(violation).toBeNull();
  });

  it('contains no forbidden trading language', () => {
    renderWithProviders(<AlertsPage />);
    const body = document.body.textContent || '';
    const violation = hasForbiddenTradingLanguage(body);
    expect(violation).toBeNull();
  });

  it('contains no render garbage', () => {
    renderWithProviders(<AlertsPage />);
    const body = document.body.textContent || '';
    const violation = hasRenderGarbage(body);
    expect(violation).toBeNull();
  });
});
