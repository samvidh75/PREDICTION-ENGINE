import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileNav } from '../MobileNav';
import { LayoutProvider } from '../../../context/LayoutContext';

expect.extend({});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

function mockCurrentPage(page: string) {
  Object.defineProperty(window, 'location', {
    value: { search: `?page=${page}` },
    writable: true,
  });
}

describe('MobileNav authenticated', () => {
  it('renders AI Scanner tab', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.getByText('AI Scanner')).toBeInTheDocument();
  });

  it('renders Menu tab', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('renders Home, Search, Watchlist tabs', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
  });

  it('has accessible label on nav element', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();
  });

  it('contains no forbidden trading language', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
  });

  it('has maximum 5 bottom nav items', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    const bottomNav = screen.getByLabelText('Mobile navigation');
    const items = bottomNav.querySelectorAll('button');
    expect(items.length).toBeLessThanOrEqual(6);
  });

  it('does not show Portfolio in bottom tabs', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.queryByText('Portfolio')).not.toBeInTheDocument();
  });

  it('does not show Alerts in mobile menu', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
  });
});
