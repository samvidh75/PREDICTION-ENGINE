import React, { useEffect, useState } from "react";
import { LoadingState, EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer, DataFreshnessBadge } from "../components/ui/PageHeader";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import tokens from "../components/ui/tokens";
import { formatFreshness } from "../services/ui/dataFormatting";

interface SignalRow {
  symbol: string;
  type: string;
  severity: string;
  explanation: string;
  snapshotDate?: string | null;
}

interface SignalsPayload {
  signals: SignalRow[];
  snapshotDate?: string | null;
  symbolsAnalyzed?: number;
}

export default function PublicPredictionsPage(): JSX.Element {
  const [payload, setPayload] = useState<SignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/predictions/signals?limit=50", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "SIGNALS_UNAVAILABLE" : "UNAVAILABLE");
        const body = await r.json();
        const data = body.data || body;
        setPayload(data);
        if (typeof data.symbolsAnalyzed === "number") {
          setSymbolsAnalyzed(data.symbolsAnalyzed);
        }
      })
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return;
        setError(e.message);
      })
      .finally(() => setLoading(false));
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

  const signals = payload?.signals ?? [];
  const snapshotDate = payload?.snapshotDate ?? null;

  const severityColors: Record<string, string> = {
    critical: "bg-rose-50 border-rose-200 text-rose-800",
    important: "bg-amber-50 border-amber-200 text-amber-800",
    monitor: "bg-sky-50 border-sky-200 text-sky-800",
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <MobileNav />
      <div className={`${tokens.layout.container} pt-[76px] md:pt-28`}>
        <PageHeader
          title="Prediction signals"
          subtitle="Real signal rows appear when the prediction registry has produced verified signals."
          primaryAction={snapshotDate ? <DataFreshnessBadge date={snapshotDate} /> : <MissingDataBadge />}
        />

      {loading ? (
        <LoadingState description="Checking prediction registry for verified signals." />
      ) : error || signals.length === 0 ? (
        <div className="flex flex-col gap-5">
          <EmptyState
            title="Verified prediction signals are being prepared"
            description={
              symbolsAnalyzed && symbolsAnalyzed > 0
                ? `${symbolsAnalyzed} companies are registered. Signals will appear after verified prediction updates.`
                : "Signal rows will appear here when source-backed predictions have produced verified outputs. No placeholder data or fabricated signals are shown."
            }
          />
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
        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
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
                    <td className="p-4 font-mono font-bold text-slate-950 hover:text-emerald-800">
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
              {symbolsAnalyzed} companies analyzed
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
