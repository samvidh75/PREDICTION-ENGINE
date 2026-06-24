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
        <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#161B22] border border-[rgba(148,163,184,0.16)] rounded-xl p-6 text-center">
            <h2 className="text-lg font-semibold text-[#E6EDF3] mb-2">Something went wrong</h2>
            <details className="mb-4">
              <summary className="text-sm text-[#9AA7B5] cursor-pointer hover:text-[#E6EDF3]">Technical details</summary>
              <p className="mt-2 text-xs text-[#888888] font-mono text-left bg-[#0D1117] rounded p-3 break-words">
                {this.state.error.message}
              </p>
            </details>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#E6EDF3] bg-[#2962FF] rounded-lg hover:bg-[#1E4FC7] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
              <a
                href="/?page=scanner"
                className="text-sm text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
              >
                Go to scanner
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
