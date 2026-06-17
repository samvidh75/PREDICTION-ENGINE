import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToastProvider from '../ToastProvider';
import { useToast } from '../useToast';

function ToastTrigger(): JSX.Element {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Test success')}>Show success</button>
      <button onClick={() => toast.error('Test error')}>Show error</button>
      <button onClick={() => toast.info('Test info')}>Show info</button>
      <button onClick={() => toast.warning('Test warning')}>Show warning</button>
    </div>
  );
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(<ToastProvider><div>child</div></ToastProvider>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('shows a success toast when triggered', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>);
    fireEvent.click(screen.getByText('Show success'));
    expect(screen.getByText('Test success')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });

  it('shows multiple toast types', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>);
    fireEvent.click(screen.getByText('Show error'));
    fireEvent.click(screen.getByText('Show info'));
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Test info')).toBeInTheDocument();
  });

  it('dismisses a toast on close button click', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>);
    fireEvent.click(screen.getByText('Show warning'));
    expect(screen.getByText('Test warning')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(screen.queryByText('Test warning')).not.toBeInTheDocument();
  });

  it('uses aria-live region for accessibility', () => {
    const { container } = render(<ToastProvider><ToastTrigger /></ToastProvider>);
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });
});
