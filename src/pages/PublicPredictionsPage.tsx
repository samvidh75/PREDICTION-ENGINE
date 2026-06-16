import React, { useEffect, useState } from "react";
import { LoadingState, EmptyState } from "../components/ui/DataState";
import ScorePill from "../components/ui/ScorePill";
import { MissingDataBadge, PageHeader, ResearchDisclaimer } from "../components/ui/PageHeader";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import tokens from "../components/ui/tokens";

export default function PublicPredictionsPage(): JSX.Element {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/intelligence/leaderboard?limit=20", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("UNAVAILABLE");
        const body = await r.json();
        if (!Array.isArray(body)) throw new Error("UNEXPECTED_FORMAT");
        setData(body);
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <MobileNav />
      <div className={`${tokens.layout.container} pt-[76px] md:pt-28`}>
        <PageHeader
          title="Top-ranked companies"
          subtitle="Prediction rows will appear when source-backed scoring has produced verified snapshots."
          primaryAction={<MissingDataBadge />}
        />

      {loading ? (
        <LoadingState description="Checking whether verified prediction rows are available." />
      ) : error || !data || data.length === 0 ? (
        <div className="flex flex-col gap-5">
          <EmptyState
            title="Verified predictions are being prepared"
            description="Prediction rows will appear here when source-backed scoring has produced verified company snapshots. No placeholder data or sample rows are shown."
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
                <th className="p-4 font-semibold uppercase tracking-wider">Rank</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Symbol</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden sm:table-cell">Score</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden md:table-cell">Confidence</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden lg:table-cell">Sector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((entry, i) => (
                <tr
                  key={entry.symbol ?? i}
                  onClick={() => entry.symbol && navigate(entry.symbol)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="p-4 font-semibold text-slate-500">#{i + 1}</td>
                  <td className="p-4 font-mono font-bold text-slate-950 hover:text-emerald-800">
                    {entry.symbol ?? "—"}
                  </td>
                  <td className="hidden p-4 sm:table-cell">
                    {typeof entry.ranking_score === "number" && Number.isFinite(entry.ranking_score) ? (
                      <ScorePill score={Math.round(entry.ranking_score)} />
                    ) : (
                      <MissingDataBadge />
                    )}
                  </td>
                  <td className="hidden p-4 md:table-cell">
                    {typeof entry.confidence_score === "number" && Number.isFinite(entry.confidence_score) ? (
                      <span className="text-slate-700">{Math.round(entry.confidence_score)}%</span>
                    ) : (
                      <MissingDataBadge />
                    )}
                  </td>
                  <td className="hidden p-4 lg:table-cell">
                    <span className="text-slate-500">{entry.sector || "Not available"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6">
        <ResearchDisclaimer />
      </div>
      </div>
    </main>
  );
}
