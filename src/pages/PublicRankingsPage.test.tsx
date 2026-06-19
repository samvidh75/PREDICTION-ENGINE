import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetScanner, mockUseAuth } = vi.hoisted(() => ({
  mockGetScanner: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('../components/navigation/TopNav', () => ({
  default: () => null,
}));

vi.mock('../components/navigation/MobileNav', () => ({
  default: () => null,
}));

vi.mock('../services/api/client', () => ({
  api: {
    getScanner: mockGetScanner,
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import PublicRankingsPage from './PublicRankingsPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PublicRankingsPage states', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
  });

  it('shows empty state when API returns no data', async () => {
    mockGetScanner.mockResolvedValue({ data: [], preset: "Quality compounders" });
    render(<PublicRankingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Rankings are being compiled')).toBeInTheDocument();
    });
  });

  it('shows signup teaser for unauthenticated users when empty', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    mockGetScanner.mockResolvedValue({ data: [], preset: "Quality compounders" });
    render(<PublicRankingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Create free account')).toBeInTheDocument();
    });
  });

  it('renders data when rankings exist', async () => {
    mockGetScanner.mockResolvedValue({
      data: [
        { symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', rank: 1, score: 75, conviction: 'High conviction research case', oneLineThesis: '', keyReason: '', riskMarker: null },
        { symbol: 'TCS', companyName: 'Tata Consultancy Services', sector: 'Technology', rank: 2, score: 70, conviction: 'Worth researching', oneLineThesis: '', keyReason: '', riskMarker: null },
      ],
      preset: "Quality compounders",
    });
    render(<PublicRankingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('RELIANCE').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('TCS').length).toBeGreaterThanOrEqual(1);
  });

  it('limits displayed rows to 3 for unauthenticated users', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    mockGetScanner.mockResolvedValue({
      data: [
        { symbol: 'A', companyName: 'A Ltd', sector: 'Tech', rank: 1, score: 80, conviction: 'High', oneLineThesis: '', keyReason: '', riskMarker: null },
        { symbol: 'B', companyName: 'B Ltd', sector: 'Tech', rank: 2, score: 70, conviction: 'Medium', oneLineThesis: '', keyReason: '', riskMarker: null },
        { symbol: 'C', companyName: 'C Ltd', sector: 'Tech', rank: 3, score: 60, conviction: 'Medium', oneLineThesis: '', keyReason: '', riskMarker: null },
        { symbol: 'D', companyName: 'D Ltd', sector: 'Tech', rank: 4, score: 50, conviction: 'Low', oneLineThesis: '', keyReason: '', riskMarker: null },
      ],
      preset: "Quality compounders",
    });
    render(<PublicRankingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('D')).not.toBeInTheDocument();
  });

  it('does not render "Not available" or "Sector pending" text', async () => {
    mockGetScanner.mockResolvedValue({
      data: [
        { symbol: 'A', companyName: 'A Ltd', sector: 'Not available', rank: 1, score: 80, conviction: 'High', oneLineThesis: '', keyReason: '', riskMarker: null },
      ],
      preset: "Quality compounders",
    });
    render(<PublicRankingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('Not available')).not.toBeInTheDocument();
    expect(screen.queryByText('Sector pending')).not.toBeInTheDocument();
  });

  it('hides sector filter when fewer than 2 useful sectors exist', async () => {
    mockGetScanner.mockResolvedValue({
      data: [
        { symbol: 'A', companyName: 'A Ltd', sector: 'Tech', rank: 1, score: 80, conviction: 'High', oneLineThesis: '', keyReason: '', riskMarker: null },
        { symbol: 'B', companyName: 'B Ltd', sector: null, rank: 2, score: 70, conviction: 'Medium', oneLineThesis: '', keyReason: '', riskMarker: null },
      ],
      preset: "Quality compounders",
    });
    render(<PublicRankingsPage />);
    await waitFor(() => {
      expect(screen.queryByText('Sector:')).not.toBeInTheDocument();
    });
  });

  it('does not render "Not available" or "Sector pending" text', async () => {
    mockGetScanner.mockResolvedValue({
      data: [
        { symbol: 'A', companyName: 'A Ltd', sector: 'Not available', rank: 1, score: 80, conviction: 'High', oneLineThesis: '', keyReason: '', riskMarker: null },
      ],
      preset: "Quality compounders",
    });
    render(<PublicRankingsPage />);
    await waitFor(() => {
       expect(screen.getAllByText('A')[0]).toBeInTheDocument();
    });
    expect(screen.queryByText('Not available')).not.toBeInTheDocument();
    expect(screen.queryByText('Sector pending')).not.toBeInTheDocument();
  });

  it('does not expose full score column to unauthenticated users', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    mockGetScanner.mockResolvedValue({
      data: [
        { symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', rank: 1, score: 75, conviction: 'High conviction research case', oneLineThesis: '', keyReason: '', riskMarker: null },
      ],
      preset: "Quality compounders",
    });
    render(<PublicRankingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Gated')[0]).toBeInTheDocument();
    });
    expect(screen.queryByText('75')).not.toBeInTheDocument();
  });
});
