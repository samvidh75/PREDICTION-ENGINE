import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CommandPalette', () => {
  it('renders Open dashboard action', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Open dashboard')).toBeInTheDocument();
  });

  it('renders all default actions when open', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Open dashboard')).toBeInTheDocument();
    expect(screen.getByText('Search company')).toBeInTheDocument();
    expect(screen.getByText('Open rankings')).toBeInTheDocument();
    expect(screen.getByText('Compare companies')).toBeInTheDocument();
    expect(screen.getByText('Open Trust Centre')).toBeInTheDocument();
    expect(screen.getByText('Open watchlist')).toBeInTheDocument();
    expect(screen.getByText('Open portfolio')).toBeInTheDocument();
    expect(screen.getByText('Open About')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CommandPalette open={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Open dashboard')).not.toBeInTheDocument();
  });

  it('has correct dialog accessibility attributes', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const dialog = screen.getByLabelText('Command palette');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('contains no forbidden trading language', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/Buy Stock|Sell Stock|Strong Buy|Strong Sell|Try Pro|Unlock Pro|Trade now/i);
  });

  it('contains no undefined/null/NaN in rendered output', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/\bundefined\b/);
    expect(body).not.toMatch(/\bnull\b/);
    expect(body).not.toMatch(/\bNaN\b/);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
