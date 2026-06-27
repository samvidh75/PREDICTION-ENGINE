import React from "react";

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

type State = { error: Error | null };

export default class PageErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(_error: Error): State { return { error: new Error("PageError") }; }
  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        margin: '80px auto',
        maxWidth: '480px',
        background: '#FFFFFF',
        border: '1px solid #D2D2D7',
        borderRadius: '18px',
        padding: '48px 40px',
        textAlign: 'center',
        fontFamily: FONT,
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠</div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1D1D1F', margin: '0 0 8px', letterSpacing: '-0.022em' }}>
          This view is temporarily unavailable.
        </h1>
        <p style={{ fontSize: '15px', color: '#6E6E73', margin: '0 0 24px', lineHeight: 1.5 }}>
          Market data could not be loaded. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: '#1D1D1F',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: FONT,
            letterSpacing: '-0.016em',
          }}
        >
          Retry
        </button>
      </div>
    );
  }
}
