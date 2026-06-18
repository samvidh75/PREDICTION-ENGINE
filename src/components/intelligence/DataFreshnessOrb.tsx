import React, { useEffect, useState } from "react";

interface FreshnessState {
  status: "ok" | "partial" | "unavailable";
  label: string;
}

export function DataFreshnessOrb({ className = "" }: { className?: string }) {
  const [state, setState] = useState<FreshnessState>({ status: "unavailable", label: "?" });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/ops/data-coverage", { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data || ctrl.signal.aborted) return;
        const hasFresh = data.coverage?.predictionRegistry?.latestPredictionDate;
        const hasPartial = data.coverage?.symbols?.status === "available";
        setState({
          status: hasFresh ? "ok" : hasPartial ? "partial" : "unavailable",
          label: hasFresh ? "Live" : hasPartial ? "Partial" : "Offline",
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const dotColor = state.status === "ok" ? "bg-[#22AB94]" : state.status === "partial" ? "bg-[#EF9A09]" : "bg-[#484F58]";
  const pulseClass = state.status === "ok" ? "animate-pulse" : "";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#484F58] ${className}`}
      title={`Data freshness: ${state.label}`}
    >
      <span className={`relative flex h-2 w-2 ${pulseClass}`}>
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      </span>
      <span className="hidden sm:inline">{state.label}</span>
    </span>
  );
}
