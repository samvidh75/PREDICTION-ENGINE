import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileNav } from '../MobileNav';
import { LayoutProvider } from '../../../context/LayoutContext';

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
  it('renders Portfolio tab', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
  });

  it('renders Compare tab', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.getByText('Compare')).toBeInTheDocument();
  });

  it('renders Home, Rankings, Watchlist tabs', () => {
    mockCurrentPage('dashboard');
    render(<LayoutProvider><MobileNav /></LayoutProvider>);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Rankings')).toBeInTheDocument();
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
});
