import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('[ErrorBoundary] Caught:', error.message, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          padding: '40px',
          textAlign: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #FF6B6B, #b0151e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700,
          }}>S</div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#a0a0a0', maxWidth: '400px', lineHeight: 1.5, margin: 0, fontSize: '14px' }}>
            {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: '14px',
              fontWeight: 500, cursor: 'pointer', marginTop: '8px',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#a0a0a0', fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
