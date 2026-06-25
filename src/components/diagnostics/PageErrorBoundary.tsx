import React from "react";
import { AlertCircle } from "lucide-react";

type State = { error: Error | null };

export default class PageErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(_error: Error): State { return { error: new Error("PageError") }; }
  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto my-24 max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-lg font-bold text-slate-950">This view is temporarily unavailable.</h1>
        <p className="mt-2 text-sm text-slate-500">Try again in a moment.</p>
        <button type="button" onClick={() => { this.setState({ error: null }); window.location.reload(); }} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </div>
    );
  }
}
