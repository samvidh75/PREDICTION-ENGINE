import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AnalysisHub from './AnalysisHub';

vi.mock('../components/ScreenerSidebar', () => ({
  default: ({ filters, onFilterChange }) => (
    <div>
      <button onClick={() => onFilterChange({ ...filters, sector: 'Defence', exchange: 'BSE' })}>
        Apply Empty Filter
      </button>
      <button onClick={() => onFilterChange({ ...filters, sector: 'Information Technology' })}>
        Apply IT Filter
      </button>
    </div>
  ),
}));

vi.mock('../components/HealthometerRow', () => ({
  default: ({ ticker }) => <div>{ticker}</div>,
}));

vi.mock('../components/ScreenerMetricsCard', () => ({
  default: ({ label, value }) => <div>{label}:{value}</div>,
}));

describe('AnalysisHub saved screeners', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and restores user-configured filters', () => {
    render(<AnalysisHub />);

    fireEvent.click(screen.getByText('Apply IT Filter'));
    fireEvent.change(screen.getByPlaceholderText('Name this screener'), { target: { value: 'IT quality scan' } });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('IT quality scan')).toBeTruthy();

    fireEvent.click(screen.getByText('Apply Empty Filter'));
    expect(screen.getByText(/No registry entries match Sector: Defence/i)).toBeTruthy();

    fireEvent.click(screen.getByText('IT quality scan'));
    expect(screen.queryByText(/No registry entries match Sector: Defence/i)).toBeNull();
  });
});
