import React, { useEffect, useState } from "react";
import { LoadingState, EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer, DataFreshnessBadge } from "../components/ui/PageHeader";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import tokens from "../components/ui/tokens";
import { formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type Signal } from "../services/api/client";

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
    critical: "bg-rose-50 border-rose-200 text-rose-700",
    important: "bg-amber-50 border-amber-200 text-amber-700",
    monitor: "bg-sky-50 border-sky-200 text-sky-700",
  };

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <TopNav />
      <MobileNav />
      <div className={`${tokens.layout.container} pt-[76px] md:pt-28`}>
        <PageHeader
          title="Score changes"
          subtitle="Score changes from the latest verified data update cycle."
          primaryAction={snapshotDate ? <DataFreshnessBadge date={snapshotDate} /> : <MissingDataBadge />}
        />

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="status">
          <p className="font-semibold text-xs">Some data is temporarily unavailable</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      )}

      {loading ? (
        <LoadingState description="Checking for recent score changes…" />
      ) : signals.length === 0 ? (
        <div className="flex flex-col gap-5">
          <EmptyState
            title="Score changes pending"
            description={
              symbolsAnalyzed && symbolsAnalyzed > 0
                ? `${symbolsAnalyzed} companies registered. Score changes appear after the next verified update cycle.`
                : "Score changes appear when provider data has been processed and verified."
            }
          />
          {coverageData && (
            <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Data coverage
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Companies covered</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {coverageData.symbolCount !== null ? coverageData.symbolCount.toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Scored records</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {coverageData.registryRowCount !== null ? coverageData.registryRowCount.toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Latest update</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {coverageData.latestPredictionDate || "—"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Score changes appear once updated provider data has been verified.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
            <Button
              type="button"
              onClick={() => setPage("signup")}
              className="h-10 px-4 text-xs"
            >
              Create free account
            </Button>
            <Button
              type="button"
              onClick={() => setPage("methodology")}
              variant="secondary"
              className="h-10 px-4 text-xs"
            >
              View scoring methodology
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="p-4 font-semibold uppercase tracking-wider">Symbol</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Signal</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden sm:table-cell">Severity</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden md:table-cell">Explanation</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden lg:table-cell">Freshness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {signals.map((signal, i) => {
                const severityClass = severityColors[signal.severity] || "bg-slate-50 border-slate-200 text-slate-700";

                return (
                  <tr
                    key={`${signal.symbol}:${i}`}
                    onClick={() => signal.symbol && navigate(signal.symbol)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="p-4 font-mono font-bold text-slate-950 hover:text-emerald-700">
                      {signal.symbol}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-50 border-slate-200 text-slate-700">
                        {signal.type || "Signal pending"}
                      </span>
                    </td>
                    <td className="hidden p-4 sm:table-cell">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityClass}`}>
                        {signal.severity || "Unknown"}
                      </span>
                    </td>
                    <td className="hidden max-w-xs truncate p-4 md:table-cell">
                      <span className="text-slate-600">{signal.explanation || "No explanation"}</span>
                    </td>
                    <td className="hidden p-4 lg:table-cell">
                      {signal.snapshotDate || snapshotDate ? (
                        <span className="text-[10px] text-emerald-700 font-semibold whitespace-nowrap">
                          {formatFreshness(signal.snapshotDate || snapshotDate)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {symbolsAnalyzed !== null && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[10px] text-slate-500">
              {symbolsAnalyzed} companies in latest cycle
            </div>
          )}
        </div>
      )}
      <div className="mt-6">
        <ResearchDisclaimer />
      </div>
      </div>
    </main>
  );
}
