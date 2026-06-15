import React, { useEffect, useState } from "react";
import { LoadingState, EmptyState, ErrorState } from "../components/ui/DataState";

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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 text-white antialiased">
      <header className="mb-8 border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Top-ranked companies</h1>
        <p className="mt-1 text-sm text-slate-400">
          Source-backed ranking scores from the intelligence API. Missing values remain unavailable.
        </p>
      </header>

      {loading ? (
        <LoadingState description="Loading rankings from the intelligence API..." />
      ) : error || !data ? (
        <ErrorState
          title="Rankings unavailable"
          description="The intelligence API could not be reached. Rankings will be available after the next pipeline run."
        />
      ) : data.length === 0 ? (
        <EmptyState
          title="No rankings available"
          description="Ranking data has not been generated yet. Check back after the daily pipeline run."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                <th className="p-4 font-semibold uppercase tracking-wider">Rank</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Symbol</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden sm:table-cell">Score</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden md:table-cell">Confidence</th>
                <th className="p-4 font-semibold uppercase tracking-wider hidden lg:table-cell">Sector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.map((entry, i) => (
                <tr
                  key={entry.symbol ?? i}
                  onClick={() => entry.symbol && navigate(entry.symbol)}
                  className="cursor-pointer transition-colors hover:bg-slate-900/40"
                >
                  <td className="p-4 font-semibold text-slate-500">#{i + 1}</td>
                  <td className="p-4 font-mono font-bold text-white hover:text-cyan-400">
                    {entry.symbol ?? "—"}
                  </td>
                  <td className="hidden p-4 sm:table-cell">
                    {typeof entry.ranking_score === "number" && Number.isFinite(entry.ranking_score) ? (
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        entry.ranking_score >= 70
                          ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                          : entry.ranking_score >= 40
                          ? "border-amber-800 bg-amber-950/40 text-amber-300"
                          : "border-rose-800 bg-rose-950/40 text-rose-300"
                      }`}>
                        {Math.round(entry.ranking_score)}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="hidden p-4 md:table-cell">
                    {typeof entry.confidence_score === "number" && Number.isFinite(entry.confidence_score) ? (
                      <span className="text-slate-300">{Math.round(entry.confidence_score)}%</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="hidden p-4 lg:table-cell">
                    <span className="text-slate-500">{entry.sector || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
