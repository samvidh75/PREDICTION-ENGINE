import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Delete item',
    message: 'Are you sure you want to delete this item?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete item')).not.toBeInTheDocument();
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has accessible dialog role and label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Delete item');
  });

  it('has close button with accessible label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });

  it('shows destructive styling by default', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // destructive mode shows alert triangle icon
    expect(document.querySelector('.lucide-alert-triangle')).toBeInTheDocument();
  });
});
