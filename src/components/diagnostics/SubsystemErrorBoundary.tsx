import React from "react";
import type { DiagnosticContext } from "../../services/diagnostics/diagnosticLogger";
import { logSubsystemError } from "../../services/diagnostics/diagnosticLogger";

type Props = {
  subsystem: string;
  phase?: string;
  featureKey?: string;
  fallbackTitle?: string;
  fallbackBody?: string;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error: unknown;
};

export default class SubsystemErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown): void {
    const { subsystem, phase, featureKey } = this.props;
    const context: DiagnosticContext = {
      subsystem,
      phase,
      featureKey,
    };

    logSubsystemError({
      context,
      error,
      info: "Subsystem render failed inside ErrorBoundary",
    });
  }

  render(): JSX.Element {
    if (!this.state.hasError) {
      return <>{this.props.children}</>;
    }

    const fallbackTitle = this.props.fallbackTitle ?? "Intelligence module temporarily unavailable";
    const fallbackBody =
      this.props.fallbackBody ?? "This subsystem failed in isolation. Other intelligence environments remain stable.";

    const parts: string[] = [this.props.subsystem];
    if (this.props.phase) parts.push(`phase:${this.props.phase}`);
    if (this.props.featureKey) parts.push(`key:${this.props.featureKey}`);
    const contextPreview = parts.join(" • ");

    return (
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Fault-tolerant subsystem isolation</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">{fallbackTitle}</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/85">{fallbackBody}</div>

            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">{contextPreview}</div>
          </div>
        </div>
      </section>
    );
  }
}
