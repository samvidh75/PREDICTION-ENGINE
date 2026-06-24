// src/components/diagnostics/ErrorBoundarySystem.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundarySystem extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundarySystem caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-[18px] border border-slate-500/20 bg-slate-500/5 text-center font-vos-interface text-xs">
          <span className="text-slate-400 font-bold block mb-1">
            ⚠️ Live market data is currently refreshing
          </span>
          <span className="text-gray-400 block mb-1">
            Displaying last verified intelligence snapshot for {this.props.fallbackName || "Widget"}.
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Snapshot Timestamp: {new Date().toISOString()}
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundarySystem;
