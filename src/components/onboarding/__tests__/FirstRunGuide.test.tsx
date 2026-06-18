import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FirstRunGuide } from '../FirstRunGuide';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('FirstRunGuide', () => {
  it('renders when not dismissed', () => {
    localStorage.setItem('ss_first_run_guide_dismissed', 'false');
    render(<FirstRunGuide />);
    expect(screen.getByText('Get started with StockStory India')).toBeInTheDocument();
  });

  it('does not render when dismissed', () => {
    localStorage.setItem('ss_first_run_guide_dismissed', 'true');
    render(<FirstRunGuide />);
    expect(screen.queryByText('Get started with StockStory India')).not.toBeInTheDocument();
  });

  it('dismisses on close button click', () => {
    localStorage.setItem('ss_first_run_guide_dismissed', 'false');
    render(<FirstRunGuide />);
    const dismissButton = screen.getByLabelText('Dismiss guide');
    fireEvent.click(dismissButton);
    expect(screen.queryByText('Get started with StockStory India')).not.toBeInTheDocument();
    expect(localStorage.getItem('ss_first_run_guide_dismissed')).toBe('true');
  });

  it('renders search, compare, and trust action buttons', () => {
    localStorage.setItem('ss_first_run_guide_dismissed', 'false');
    render(<FirstRunGuide />);
    expect(screen.getByText('Search a company')).toBeInTheDocument();
    expect(screen.getByText('Compare companies')).toBeInTheDocument();
    expect(screen.getByText('Check source trust')).toBeInTheDocument();
  });

  it('contains no forbidden trading language', () => {
    localStorage.setItem('ss_first_run_guide_dismissed', 'false');
    render(<FirstRunGuide />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
  });
});
