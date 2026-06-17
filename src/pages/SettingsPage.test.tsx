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
    expect(screen.getByText('Profile information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
  });

  it('shows profile name stored locally notice', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Profile name is stored locally/)).toBeInTheDocument();
  });

  it('does not show raw Firebase field names in profile', () => {
    render(<SettingsPage />);
    expect(screen.queryByText(/uid/)).not.toBeInTheDocument();
    expect(screen.queryByText(/providerData/)).not.toBeInTheDocument();
    expect(screen.queryByText(/isAnonymous/)).not.toBeInTheDocument();
  });

  it('renders notifications tab with alert categories', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Notifications'));
    expect(screen.getByText('Notifications channel')).toBeInTheDocument();
    expect(screen.getByText('Factor Alerts')).toBeInTheDocument();
  });

  it('renders appearance tab without locked badge', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Appearance'));
    expect(screen.getByText('Research workspace theme')).toBeInTheDocument();
    expect(screen.getByText(/fixed light theme/)).toBeInTheDocument();
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
  });

  it('renders security tab content', () => {
    render(<SettingsPage />);
    const securityButtons = screen.getAllByText('Security');
    fireEvent.click(securityButtons[0]);
    expect(screen.getByText('Security and credentials')).toBeInTheDocument();
    expect(screen.getByText('Send Reset Link')).toBeInTheDocument();
  });

  it('shows local-only label for name settings', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Profile name is stored locally/)).toBeInTheDocument();
    expect(screen.queryByText(/Cloud-saved/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Synced/)).not.toBeInTheDocument();
  });
});
