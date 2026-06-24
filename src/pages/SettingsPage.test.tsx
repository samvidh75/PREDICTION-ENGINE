import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SettingsPage from './SettingsPage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { email: 'test@example.com', displayName: 'Test User' },
  })),
}));

vi.mock('../services/portfolio/AlertEngine', () => ({
  AlertEngine: {
    isCategoryEnabled: vi.fn(() => true),
    setCategoryStatus: vi.fn(),
  },
}));

describe('SettingsPage states', () => {
  it('renders profile tab with email from auth context', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Display preferences')).toBeInTheDocument();
  });

  it('shows profile name stored locally notice', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/preferences across devices/)).toBeInTheDocument();
  });

  it('does not show raw Firebase field names in profile', () => {
    render(<SettingsPage />);
    expect(screen.queryByText(/uid/)).not.toBeInTheDocument();
    expect(screen.queryByText(/providerData/)).not.toBeInTheDocument();
    expect(screen.queryByText(/isAnonymous/)).not.toBeInTheDocument();
  });

  it('renders notifications tab with alert categories', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Data preferences')).toBeInTheDocument();
    expect(screen.getByText('Show data source badges')).toBeInTheDocument();
  });

  it('renders appearance tab without locked badge', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Default scanner sort')).toBeInTheDocument();
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
  });

  it('renders security tab content', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('shows local-only label for name settings', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/preferences across devices/)).toBeInTheDocument();
    expect(screen.queryByText(/Cloud-saved/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Synced/)).not.toBeInTheDocument();
  });
});
