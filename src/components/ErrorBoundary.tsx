import React, { ReactNode, Component, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for API-consuming components
 * Catches rendering errors and provides graceful degradation
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `Error in ${this.props.componentName || 'component'}:`,
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-white border border-[#E5E5E5] rounded-none p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D946EF]" strokeWidth={2} />
              <div className="flex flex-col gap-1">
                <h3 className="font-mono text-sm font-semibold text-[#0A0A0A] uppercase">
                  Live market data is currently refreshing
                </h3>
                <p className="text-xs text-[#525252]">
                  Displaying last verified intelligence snapshot.
                </p>
                <p className="text-[9px] text-[#888888] font-mono mt-1">
                  Snapshot Timestamp: {new Date().toISOString()}
                </p>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
