import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LayoutProvider } from '../../context/LayoutContext';
import PortfolioPage from '../PortfolioPage';
import {
  hasBackendVocabulary,
  hasForbiddenTradingLanguage,
  hasProductForbiddenTerms,
  hasRenderGarbage,
} from '../../lib/compliance/forbiddenCopyAudit';

vi.mock('../../services/auth/sessionStore', () => ({
  loadAuthSession: vi.fn(() => ({ uid: 'test-user' })),
}));

vi.mock('../../hooks/useLiveQuotes', () => ({
  useLiveQuotes: vi.fn(() => ({
    TCS: { quote: { price: 3925, updatedAt: '2026-06-19T09:30:00.000Z' } },
  })),
}));

vi.mock('../../services/portfolio/PortfolioSnapshotFactory', () => ({
  PortfolioSnapshotFactory: {
    createSnapshot: vi.fn(() => ({
      holdings: [
        {
          symbol: 'TCS',
          shares: 2,
          avgBuyPrice: 3600,
          sector: 'IT',
          costBasis: 7200,
        },
      ],
    })),
  },
}));

vi.mock('../../lib/track/trackStore', () => ({
  getTrackedCompanies: vi.fn(() => [
    { symbol: 'TCS', companyName: 'Tata Consultancy Services', addedAt: new Date().toISOString(), source: 'test' },
  ]),
  isTracked: vi.fn(() => true),
  removeTrackedCompany: vi.fn(),
  addTrackedCompany: vi.fn(),
}));

vi.mock('../../components/product/ProductUI', async () => {
  const React = await import('react');
  return {
    ProductShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ProductPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
    ProductPanel: ({ children, as: Component = 'div' }: { children: React.ReactNode; as?: keyof JSX.IntrinsicElements }) => (
      <Component>{children}</Component>
    ),
    ProductAction: ({ children, disabledReason }: { children: React.ReactNode; disabledReason?: string }) => (
      <button type="button">{disabledReason || children}</button>
    ),
    ProductEmptyState: ({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) => (
      <section>
        <h2>{title}</h2>
        <p>{body}</p>
        {action}
      </section>
    ),
    productNavigate: vi.fn(),
  };
});

vi.mock('../../services/portfolio/PortfolioEngine', async () => {
  const actual = await vi.importActual<typeof import('../../services/portfolio/PortfolioEngine')>(
    '../../services/portfolio/PortfolioEngine'
  );
  return {
    ...actual,
    PortfolioEngine: {
      addHolding: vi.fn(() => true),
      updateHolding: vi.fn(() => true),
      removeHolding: vi.fn(() => true),
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PortfolioPage product copy', () => {
  it('renders thesis monitoring with clear pricing language', async () => {
    render(
      <LayoutProvider>
        <PortfolioPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Portfolio thesis monitor')).toBeInTheDocument();
      expect(screen.getByText('Tata Consultancy Services')).toBeInTheDocument();
      expect(screen.getAllByText('TCS').length).toBeGreaterThan(0);
    });
  });

  it('does not expose backend/provider/trading vocabulary', async () => {
    render(
      <LayoutProvider>
        <PortfolioPage />
      </LayoutProvider>
    );

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(hasBackendVocabulary(body)).toBeNull();
      expect(hasProductForbiddenTerms(body)).toBeNull();
      expect(hasForbiddenTradingLanguage(body)).toBeNull();
      expect(hasRenderGarbage(body)).toBeNull();
    });
  });
});
