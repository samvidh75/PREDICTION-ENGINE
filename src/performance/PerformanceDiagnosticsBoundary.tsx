import React from "react";

declare global {
  interface Window {
    __ss_perf_buffer?: Array<unknown>;
  }
}

type Props = {
  featureKey: string;
  children: React.ReactNode;

  /**
   * Keep the buffer small to avoid memory growth.
   */
  maxEntries?: number;
};

export default function PerformanceDiagnosticsBoundary({
  featureKey,
  children,
  maxEntries = 50,
}: Props): JSX.Element {
  const onRender: React.ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    const g = window as Window;
    if (!g.__ss_perf_buffer) g.__ss_perf_buffer = [];

    g.__ss_perf_buffer.push({
      at: Date.now(),
      featureKey: id,
      phase,
      actualDurationMs: actualDuration,
      baseDurationMs: baseDuration,
      startTimeMs: startTime,
      commitTimeMs: commitTime,
    });

    if (g.__ss_perf_buffer.length > maxEntries) {
      g.__ss_perf_buffer.splice(0, g.__ss_perf_buffer.length - maxEntries);
    }
  };

  return (
    <React.Profiler id={featureKey} onRender={onRender}>
      {children}
    </React.Profiler>
  );
}
