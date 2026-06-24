import React from "react";
import { AlertCircle } from "lucide-react";

type State = { error: Error | null };

export default class PageErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return <div className="mx-auto my-24 max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><AlertCircle className="mx-auto h-10 w-10 text-red-500" /><h1 className="mt-4 text-lg font-bold text-slate-950">Something went wrong loading this page. Try refreshing.</h1><button type="button" onClick={() => { this.setState({ error: null }); window.location.reload(); }} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retry</button><details className="mt-4 text-left text-xs text-slate-500"><summary>Error details</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{this.state.error.message}</pre></details></div>;
  }
}
