import React, { useEffect, useState } from "react";
import { LoadingState, EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, ResearchDisclaimer } from "../components/ui/PageHeader";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type Signal } from "../services/api/client";
import { PremiumPage, MetricCard, StatusChip } from "../components/premium/PremiumUI";
import { RoundedDepthPanel } from "../components/intelligence/RoundedDepthPanel";
import { TrendingUp, BarChart3 } from "lucide-react";

export default function PublicPredictionsPage(): JSX.Element {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState<number | null>(null);

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
      .catch((err) => { if (ctrl.signal.aborted) return; setError(err instanceof ApiError ? err.message : "Signals unavailable"); setLoading(false); });
    return () => ctrl.abort();
  }, []);

  const navigate = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock"); params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`); window.dispatchEvent(new Event("urlchange"));
  };

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey); params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`); window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <PremiumPage>
      <TopNav />
      <MobileNav />
      <div className="w-full px-6 pb-16 pt-20 md:px-10 md:pt-24 lg:px-16 xl:px-24">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Research Intelligence</span>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-[#E6EDF3] md:text-3xl">Score changes</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8B949E]">
              Score changes from the latest research cycle.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[#EF9A09]/20 bg-[#EF9A09]/[0.03] p-4 text-xs text-[#EF9A09]" role="status">
            <p className="font-semibold">Some data is being refreshed</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <MetricCard label="Changes visible" value={signals.length.toLocaleString("en-IN")} detail="Score changes from latest cycle." />
          <MetricCard label="Symbols analyzed" value={symbolsAnalyzed !== null ? symbolsAnalyzed.toLocaleString("en-IN") : "Unavailable"} detail="Latest cycle metadata." tone={symbolsAnalyzed ? "ok" : "muted"} />
        </div>

        {loading ? (
          <LoadingState description="Checking for recent score changes…" />
        ) : signals.length === 0 ? (
          <div className="flex flex-col gap-5">
            <RoundedDepthPanel padding="lg" variant="elevated">
              <div className="flex flex-col items-center gap-3 text-center">
                <TrendingUp className="h-8 w-8 text-[#484F58]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#E6EDF3]">No score changes in the latest cycle</h2>
                <p className="max-w-md text-xs leading-relaxed text-[#8B949E]">
                  {symbolsAnalyzed && symbolsAnalyzed > 0
                    ? `${symbolsAnalyzed.toLocaleString("en-IN")} companies analysed. Score changes appear after the next completed research cycle.`
                    : "Score changes appear after the next research cycle."}
                </p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setPage("rankings")} className="h-10 px-4 text-xs">
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Browse rankings
                  </Button>
                  <Button type="button" onClick={() => setPage("methodology")} className="h-10 border border-white/5 bg-transparent px-4 text-xs text-[#8B949E] hover:text-[#E6EDF3]">
                    View methodology
                  </Button>
                </div>
              </div>
            </RoundedDepthPanel>
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/5 bg-[#0D1117] overflow-hidden">
            <div className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">
                  <th scope="col" className="p-4">Symbol</th>
                  <th scope="col" className="p-4">Signal</th>
                  <th scope="col" className="p-4 hidden sm:table-cell">Severity</th>
                  <th scope="col" className="p-4 hidden md:table-cell">Explanation</th>
                  <th scope="col" className="p-4 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {signals.map((signal, i) => (
                  <tr
                    key={`${signal.symbol}:${i}`}
                    onClick={() => signal.symbol && navigate(signal.symbol)}
                    onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && signal.symbol) { e.preventDefault(); navigate(signal.symbol); } }}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="p-4 font-mono font-bold text-[#E6EDF3] hover:underline">{signal.symbol}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-[#8B949E]">
                        {signal.type || "Signal pending"}
                      </span>
                    </td>
                    <td className="hidden p-4 sm:table-cell">
                      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        signal.severity === "critical" ? "border-[#F23645]/20 bg-[#F23645]/10 text-[#F23645]" :
                        signal.severity === "important" ? "border-[#EF9A09]/20 bg-[#EF9A09]/10 text-[#EF9A09]" :
                        "border-white/5 bg-white/[0.03] text-[#8B949E]"
                      }`}>
                        {signal.severity || "Unknown"}
                      </span>
                    </td>
                    <td className="hidden max-w-xs truncate p-4 md:table-cell text-[#8B949E]">{signal.explanation || "No explanation"}</td>
                    <td className="hidden p-4 lg:table-cell">
                      {signal.snapshotDate || snapshotDate ? (
                        <span className="text-[10px] font-semibold whitespace-nowrap text-[#22AB94]">{formatFreshness(signal.snapshotDate || snapshotDate)}</span>
                      ) : (
                        <span className="text-[10px] text-[#484F58]">Not enough information</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {signals.map((signal, i) => (
                <button key={`${signal.symbol}:mobile:${i}`} onClick={() => signal.symbol && navigate(signal.symbol)} className="rounded-2xl border border-white/5 bg-[#0D1117] p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-base font-bold text-[#E6EDF3]">{signal.symbol}</div>
                      <div className="mt-1 text-xs text-[#8B949E]">{signal.explanation || "No explanation available"}</div>
                    </div>
                    <StatusChip label={signal.severity || "Unknown"} tone={signal.severity === "critical" ? "risk" : signal.severity === "important" ? "warn" : "muted"} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-[#8B949E]">{signal.type || "Signal pending"}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${signal.snapshotDate || snapshotDate ? "border-[#22AB94]/10 text-[#22AB94]" : "border-[#EF9A09]/10 text-[#EF9A09]"}`}>
                      {signal.snapshotDate || snapshotDate ? formatFreshness(signal.snapshotDate || snapshotDate) : "Not enough information"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {symbolsAnalyzed !== null && (
              <div className="border-t border-white/5 px-4 py-2 text-[10px] text-[#484F58]">
                {symbolsAnalyzed.toLocaleString("en-IN")} companies in latest cycle
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <ResearchDisclaimer />
        </div>
      </div>
    </PremiumPage>
  );
}