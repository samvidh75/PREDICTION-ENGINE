import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import PredictiveHologram from './PredictiveHologram';

const mockedUseUser = vi.mocked(useUser);

describe('PredictiveHologram entitlement gating', () => {
  beforeEach(() => {
    mockedUseUser.mockReset();
  });

  it('renders calibration placeholder when predictiveEngine entitlement is false', () => {
    mockedUseUser.mockReturnValue({ checkEntitlement: () => false } as any);

    render(<PredictiveHologram result={null} isLoading={false} compact={true} />);

    expect(screen.getByText(/Live market data is currently refreshing/i)).toBeTruthy();
    expect(screen.queryByText(/No analysis available/i)).toBeNull();
  });

  it('renders fallback analysis state when predictiveEngine entitlement is true', () => {
    mockedUseUser.mockReturnValue({ checkEntitlement: () => true } as any);

    render(<PredictiveHologram result={null} isLoading={false} compact={true} />);

    expect(screen.getByText(/No analysis available/i)).toBeTruthy();
  });
});
