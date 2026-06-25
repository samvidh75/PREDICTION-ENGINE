import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignupPage } from '../SignupPage';
import { LoginPage } from '../LoginPage';
import { productNavigate } from '../../components/product/ProductUI';

vi.mock('../../components/product/ProductUI', async () => {
  const React = await import('react');
  return {
    ProductShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ProductPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
    ProductPanel: ({ children, as: Component = 'div' }: { children: React.ReactNode; as?: keyof JSX.IntrinsicElements }) => (
      <Component>{children}</Component>
    ),
    ProductAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button type="button" onClick={onClick}>{children}</button>
    ),
    ProductFormPanel: ({ title, body, children }: { title: string; body: string; children: React.ReactNode }) => (
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
        {children}
      </div>
    ),
    ProductStatusPill: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    productNavigate: vi.fn(),
  };
});

vi.mock('../../components/auth/CinematicAuthGateway', () => ({
  __esModule: true,
  default: ({ contextMessage }: { contextMessage: string }) => <div>AuthGateway: {contextMessage}</div>,
}));

vi.mock('../../components/navigation/TopNav', () => ({
  default: () => null,
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

describe('Auth Pages Copy & Flow Integration', () => {
  describe('SignupPage', () => {
    it('renders correct sign up page copy without returnTo context', () => {
      window.history.pushState({}, '', '/signup');
      render(<SignupPage />);

      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByText('Create an account to continue your research.')).toBeInTheDocument();
      expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument();
    });

    it('renders correct sign up page copy with returnTo context for ITC', () => {
      window.history.pushState({}, '', '/signup?returnTo=' + encodeURIComponent('?page=company&id=ITC'));
      render(<SignupPage />);

      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByText('Create an account to continue researching ITC.')).toBeInTheDocument();
    });

    it('routes to signin page on clicking already have account', () => {
      window.history.pushState({}, '', '/signup');
      render(<SignupPage />);

      const btn = screen.getByText('Already have an account? Sign in');
      btn.click();
      expect(productNavigate).toHaveBeenCalledWith('login');
    });
  });

  describe('LoginPage', () => {
    it('renders correct sign in page copy without returnTo context', () => {
      window.history.pushState({}, '', '/login');
      render(<LoginPage />);

      expect(screen.getByText('Initialize your research session.')).toBeInTheDocument();
      expect(screen.getByText('Sign in to continue your research.')).toBeInTheDocument();
      expect(screen.getByText('Need an account? Create one')).toBeInTheDocument();
    });

    it('renders correct sign in page copy with returnTo context for ITC', () => {
      window.history.pushState({}, '', '/login?returnTo=' + encodeURIComponent('?page=company&id=ITC'));
      render(<LoginPage />);

      expect(screen.getByText('Initialize your research session.')).toBeInTheDocument();
      expect(screen.getByText('Sign in to continue researching ITC.')).toBeInTheDocument();
    });

    it('routes to signup page on clicking need account link', () => {
      window.history.pushState({}, '', '/login');
      render(<LoginPage />);

      const btn = screen.getByText('Need an account? Create one');
      btn.click();
      expect(productNavigate).toHaveBeenCalledWith('signup');
    });
  });
});
