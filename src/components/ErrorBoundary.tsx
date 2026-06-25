import React, { ReactNode, Component, ErrorInfo } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.scheduleRetry();
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private scheduleRetry() {
    this.retryTimer = setTimeout(() => {
      this.setState({ error: null });
    }, 8000);
  }

  handleRetry = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center p-6" style={{ minHeight: 200 }}>
          <div className="max-w-md w-full bg-white border border-[var(--border)] rounded-xl p-6 text-center">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Unable to load</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              This section encountered a temporary issue.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--action)] rounded-lg hover:bg-[var(--action-hover)] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

export function SafeBlock({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ErrorBoundary fallback={fallback ?? <div style={{ height: 200, borderRadius: 12, background: '#F9FAFB', border: '1px solid var(--border)' }} />}>
      {children}
    </ErrorBoundary>
  );
}
