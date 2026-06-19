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
    localStorage.setItem('ss_onboarding_completed', 'false');
    render(<FirstRunGuide />);
    expect(screen.getByText('Search a company')).toBeInTheDocument();
  });

  it('does not render when dismissed', () => {
    localStorage.setItem('ss_onboarding_completed', 'true');
    render(<FirstRunGuide />);
    expect(screen.queryByText('Step 1 of 5')).not.toBeInTheDocument();
  });

  it('dismisses on close button click', () => {
    localStorage.setItem('ss_onboarding_completed', 'false');
    render(<FirstRunGuide />);
    const dismissButton = screen.getByLabelText('Dismiss guide');
    fireEvent.click(dismissButton);
    expect(screen.queryByText('Step 1 of 5')).not.toBeInTheDocument();
    expect(localStorage.getItem('ss_onboarding_completed')).toBe('true');
  });

  it('renders the first step by default', () => {
    localStorage.setItem('ss_onboarding_completed', 'false');
    render(<FirstRunGuide />);
    expect(screen.getByText('Search a company')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('navigates to the next step on next click', () => {
    localStorage.setItem('ss_onboarding_completed', 'false');
    render(<FirstRunGuide />);
    fireEvent.click(screen.getByLabelText('Next step'));
    expect(screen.getByText('Read the thesis')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
  });

  it('shows start exploring on last step', () => {
    localStorage.setItem('ss_onboarding_completed', 'false');
    render(<FirstRunGuide />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText('Next step'));
    }
    expect(screen.getByText('Start exploring')).toBeInTheDocument();
  });

  it('contains no forbidden trading language', () => {
    localStorage.setItem('ss_onboarding_completed', 'false');
    render(<FirstRunGuide />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
  });
});
