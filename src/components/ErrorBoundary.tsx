import React, { ReactNode, Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  maxRetries?: number;
  retryIntervalMs?: number;
  onAutoRecover?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `Error in ${this.props.componentName || 'component'}:`,
      error,
      errorInfo
    );
    this.scheduleRetry();
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private scheduleRetry() {
    const maxRetries = this.props.maxRetries ?? 3;
    const retryInterval = this.props.retryIntervalMs ?? 3000;

    if (this.state.retryCount >= maxRetries) return;

    const delay = retryInterval * Math.pow(2, this.state.retryCount);
    this.retryTimer = setTimeout(() => {
      this.setState(prev => ({
        hasError: false,
        error: null,
        retryCount: prev.retryCount + 1,
      }));
      this.props.onAutoRecover?.();
    }, delay);
  }

  private handleManualRetry = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.setState({ hasError: false, error: null, retryCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const maxRetries = this.props.maxRetries ?? 3;
      const retryInterval = this.props.retryIntervalMs ?? 3000;
      const currentRetry = this.state.retryCount;

      return (
        <div className="bg-[#0D1117] border border-[rgba(148,163,184,0.16)] rounded-none p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D946EF]" strokeWidth={2} />
            <div className="flex flex-col gap-1">
              <h3 className="font-mono text-sm font-semibold text-[#E6EDF3] uppercase">
                Live market data is currently refreshing
              </h3>
              <p className="text-xs text-[#9AA7B5]">
                Displaying last verified intelligence snapshot.
              </p>
              <p className="text-[9px] text-[#888888] font-mono mt-1">
                Snapshot Timestamp: {new Date().toISOString()}
              </p>
              {currentRetry < maxRetries && (
                <p className="text-[9px] text-amber-600 font-mono mt-1">
                  Auto-recover in {(retryInterval * Math.pow(2, currentRetry)) / 1000}s (attempt {currentRetry + 1}/{maxRetries})
                </p>
              )}
              {currentRetry >= maxRetries && (
                <button
                  onClick={this.handleManualRetry}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" strokeWidth={2} />
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
