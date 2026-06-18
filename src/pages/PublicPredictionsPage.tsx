import React, { useEffect, useState } from "react";
import { LoadingState, EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer, DataFreshnessBadge } from "../components/ui/PageHeader";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type Signal } from "../services/api/client";
import { DataUnavailableState, MetricCard, PremiumPage, SectionHeader, StatusChip, Surface } from "../components/premium/PremiumUI";

interface CoverageInfo {
  symbolCount: number | null;
  registryRowCount: number | null;
  latestPredictionDate: string | null;
}

export default function PublicPredictionsPage(): JSX.Element {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState<number | null>(null);
  const [coverageData, setCoverageData] = useState<CoverageInfo | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    api.getSignals(50)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setSignals(data?.signals ?? []);
        setSnapshotDate(data?.snapshotDate ?? null);
        setSymbolsAnalyzed(data?.symbolsAnalyzed ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Signals unavailable");
        setLoading(false);
      });

    api.getDataCoverage()
      .then((cov) => {
        if (ctrl.signal.aborted) return;
        setCoverageData({
          symbolCount: cov.coverage?.symbols?.count ?? null,
          registryRowCount: cov.coverage?.predictionRegistry?.rowCount ?? null,
          latestPredictionDate: cov.coverage?.predictionRegistry?.latestPredictionDate ?? null,
        });
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, []);

  const navigate = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const severityColors: Record<string, string> = {
    critical: "bg-[var(--color-danger-bg)] border-[var(--color-danger)]/20 text-[var(--color-danger)]",
    important: "bg-[var(--color-warning-bg)] border-[var(--color-warning)]/20 text-[var(--color-warning)]",
    monitor: "bg-[var(--color-active-bg)] border-[var(--color-active)]/20 text-[var(--color-active)]",
  };

  return (
    <PremiumPage>
      <TopNav />
      <MobileNav />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-[76px] sm:px-6 md:pt-28">

        <Surface dark className="mb-6 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="label">Signals</div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Research signal changes</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">Signals are research changes from verified updates. They are not investment advice or buy/sell/hold recommendations.</p>
            </div>
            {snapshotDate ? <DataFreshnessBadge date={snapshotDate} /> : <MissingDataBadge />}
          </div>
        </Surface>

        {error && (
          <div
            className="mb-4 rounded-xl p-4 text-sm border border-[var(--color-warning)]/20 bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
            role="status"
          >
            <p className="font-semibold text-xs">Some data is temporarily unavailable</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Signals visible" value={signals.length.toLocaleString("en-IN")} detail="Source-backed changes only." />
          <MetricCard label="Symbols analyzed" value={symbolsAnalyzed !== null ? symbolsAnalyzed.toLocaleString("en-IN") : "Unavailable"} detail="Latest cycle metadata." tone={symbolsAnalyzed ? "ok" : "muted"} />
          <MetricCard label="Coverage rows" value={coverageData?.registryRowCount !== null && coverageData?.registryRowCount !== undefined ? coverageData.registryRowCount.toLocaleString("en-IN") : "Pending"} detail="Prediction registry." tone={coverageData?.registryRowCount ? "ok" : "warn"} />
        </div>

        {loading ? (
          <LoadingState description="Checking for recent score changes…" />
        ) : signals.length === 0 ? (
          <div className="flex flex-col gap-5">
            <DataUnavailableState
              title="Score changes pending"
              body={
                symbolsAnalyzed && symbolsAnalyzed > 0
                  ? `${symbolsAnalyzed} companies registered. Score changes appear after the next verified update cycle.`
                  : "Score changes appear when provider data has been processed and verified."
              }
            />
            {coverageData && (
              <div className="surface surface-raised rounded-xl p-5">
                <h4 className="label mb-3">Data coverage</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted text-[10px] font-medium">Companies covered</span>
                    <span className="block text-lg font-bold tabular-nums text">
                      {coverageData.symbolCount !== null ? coverageData.symbolCount.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] font-medium">Scored records</span>
                    <span className="block text-lg font-bold tabular-nums text">
                      {coverageData.registryRowCount !== null ? coverageData.registryRowCount.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] font-medium">Latest update</span>
                    <span className="block text-lg font-bold tabular-nums text">
                      {coverageData.latestPredictionDate || "—"}
                    </span>
                  </div>
                </div>
                <p className="text-muted mt-3 text-xs leading-relaxed">
                  Score changes appear once updated provider data has been verified.
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <Button type="button" onClick={() => setPage("signup")} className="h-10 px-4 text-xs">Create free account</Button>
              <Button type="button" onClick={() => setPage("methodology")} variant="secondary" className="h-10 px-4 text-xs">View scoring methodology</Button>
            </div>
          </div>
        ) : (
          <Surface className="mt-8 overflow-hidden">
            <div className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-surface-raised)] text-xs font-semibold uppercase tracking-wider" style={{ color: "#536471" }}>
                  <th scope="col" className="p-4">Symbol</th>
                  <th scope="col" className="p-4">Signal</th>
                  <th scope="col" className="p-4 hidden sm:table-cell">Severity</th>
                  <th scope="col" className="p-4 hidden md:table-cell">Explanation</th>
                  <th scope="col" className="p-4 hidden lg:table-cell">Freshness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-surface-raised)]">
                {signals.map((signal, i) => {
                  const severityClass = severityColors[signal.severity] || "bg-white/60 border-white/30 text-ink-secondary";

                  return (
                    <tr
                      key={`${signal.symbol}:${i}`}
                      onClick={() => signal.symbol && navigate(signal.symbol)}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && signal.symbol) { e.preventDefault(); navigate(signal.symbol); } }}
                      tabIndex={0}
                      role="link"
                      className="cursor-pointer transition-colors hover:bg-white/40"
                    >
                      <td className="p-4 font-mono font-bold hover:underline text">{signal.symbol}</td>
                      <td className="p-4">
                        <span
                          className="badge"
                        >
                          {signal.type || "Signal pending"}
                        </span>
                      </td>
                      <td className="hidden p-4 sm:table-cell">
                        <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityClass}`}>
                          {signal.severity || "Unknown"}
                        </span>
                      </td>
                      <td className="hidden max-w-xs truncate p-4 md:table-cell">
                        <span style={{ color: "#536471" }}>{signal.explanation || "No explanation"}</span>
                      </td>
                      <td className="hidden p-4 lg:table-cell">
                        {signal.snapshotDate || snapshotDate ? (
                          <span className="text-[10px] font-semibold whitespace-nowrap text-[var(--color-active)]">
                            {formatFreshness(signal.snapshotDate || snapshotDate)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--color-text-muted)]">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div className="grid gap-4 p-4 md:hidden">
              {signals.map((signal, i) => (
                <button key={`${signal.symbol}:mobile:${i}`} onClick={() => signal.symbol && navigate(signal.symbol)} className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-lg font-bold text-slate-950">{signal.symbol}</div>
                      <div className="mt-1 text-sm text-slate-600">{signal.explanation || "No explanation available"}</div>
                    </div>
                    <StatusChip label={signal.severity || "Unknown"} tone={signal.severity === "critical" ? "risk" : signal.severity === "important" ? "warn" : "muted"} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusChip label={signal.type || "Signal pending"} tone="muted" />
                    <StatusChip label={signal.snapshotDate || snapshotDate ? formatFreshness(signal.snapshotDate || snapshotDate) : "Freshness pending"} tone={signal.snapshotDate || snapshotDate ? "ok" : "warn"} />
                  </div>
                </button>
              ))}
            </div>
            {symbolsAnalyzed !== null && (
              <div className="border-t border-[var(--color-surface-raised)] px-4 py-2 text-xs text-muted">
                {symbolsAnalyzed} companies in latest cycle
              </div>
            )}
          </Surface>
        )}

        <div className="mt-6">
          <ResearchDisclaimer />
        </div>
      </div>
    </PremiumPage>
  );
}
