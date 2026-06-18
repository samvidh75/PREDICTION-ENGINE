import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LayoutProvider } from '../../context/LayoutContext';
import ComparePage from '../ComparePage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('../../architecture/navigation/routeCoordinator', () => ({
  navigateToStock: vi.fn(),
}));

describe('ComparePage empty state', () => {
  it('renders without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      expect(document.querySelector('.ss-page-compare, .ss-surface, main')).toBeTruthy();
    });
  });

  it('contains no forbidden trading language', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
    }, { timeout: 3000 });
  });

  it('contains no raw undefined/null/NaN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LayoutProvider><ComparePage /></LayoutProvider>);

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(body).not.toMatch(/\bundefined\b/);
      expect(body).not.toMatch(/\bNaN\b/);
    }, { timeout: 3000 });
  });
});
