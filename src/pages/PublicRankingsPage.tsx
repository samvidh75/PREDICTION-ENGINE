import React, { useEffect, useState, useMemo } from "react";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import ScorePill from "../components/ui/ScorePill";
import { EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer, DataFreshnessBadge } from "../components/ui/PageHeader";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import tokens from "../components/ui/tokens";
import { formatRank, formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type LeaderboardEntry } from "../services/api/client";

export const PublicRankingsPage: React.FC = () => {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [symbolCount, setSymbolCount] = useState<number | null>(null);
  const [registryRowCount, setRegistryRowCount] = useState<number | null>(null);
  const [latestPredictionDate, setLatestPredictionDate] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    api.getLeaderboard(100)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setRankings(res.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Rankings unavailable");
        setRankings([]);
        setLoading(false);
      });

    api.getDataCoverage()
      .then((cov) => {
        if (ctrl.signal.aborted) return;
        setSymbolCount(cov.coverage?.symbols?.count ?? null);
        setRegistryRowCount(cov.coverage?.predictionRegistry?.rowCount ?? null);
        setLatestPredictionDate(cov.coverage?.predictionRegistry?.latestPredictionDate ?? null);
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, []);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    rankings.forEach((r) => {
      if (r.sector) set.add(r.sector);
    });
    return ["all", ...Array.from(set)];
  }, [rankings]);

  const filteredRankings = useMemo(() => {
    return rankings.filter((r) => {
      const matchSearch =
        r.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
        (r.sector && r.sector.toLowerCase().includes(searchText.toLowerCase()));
      const matchSector = sectorFilter === "all" || r.sector === sectorFilter;
      return matchSearch && matchSector;
    });
  }, [rankings, searchText, sectorFilter]);

  const setPage = (pageKey: string, symbol?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    if (symbol) params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const freshnessDate = rankings[0]?.predictionDate ?? null;

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <TopNav />
      <MobileNav />
      <div className={`${tokens.layout.container} pt-[76px] md:pt-28`}>
        <PageHeader
          title="Research rankings"
          subtitle="Company rankings from the latest verified scoring cycle."
          primaryAction={freshnessDate ? <DataFreshnessBadge date={freshnessDate} /> : <MissingDataBadge />}
        />

      {error && (
        <div className="mb-4 rounded-xl bg-amber-50/60 backdrop-blur-sm border border-amber-200/50 p-4 text-sm text-amber-800" role="status">
          <p className="font-semibold text-xs">Some data is temporarily unavailable</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      )}

      <div className="my-6 flex flex-col items-center justify-between gap-4 rounded-xl glass-panel p-4 sm:flex-row">
        <div className="w-full sm:w-72">
          <Input
            aria-label="Search rankings by symbol or sector"
            placeholder="Search symbol or sector..."
            glass
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="whitespace-nowrap text-xs font-medium text-slate-500">
            Sector:
          </span>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="h-10 w-full rounded-xl glass-panel px-3 text-sm text-slate-900 transition focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 sm:w-48"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "all" ? "All Sectors" : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading rankings…</div>
      ) : filteredRankings.length === 0 && rankings.length === 0 ? (
        <div className="flex flex-col gap-5">
          <EmptyState
            title="Rankings pending"
            description="Rankings appear after verified scoring has completed for the latest cycle."
          />
          {(symbolCount !== null || registryRowCount !== null) && (
            <div className="rounded-xl glass-panel p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Data coverage
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Companies covered</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {symbolCount !== null ? symbolCount.toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Scored records</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {registryRowCount !== null ? registryRowCount.toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Latest update</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {latestPredictionDate || "—"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Rankings appear once verified scoring data is available.
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
      ) : filteredRankings.length === 0 && rankings.length > 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500">No rankings match your search or sector filter.</p>
          <button onClick={() => { setSearchText(""); setSectorFilter("all"); }} className="mt-2 text-xs text-emerald-700 hover:underline bg-transparent border-none cursor-pointer">
            Clear filters
          </button>
        </div>
      ) : (
        <Table glass headers={["Rank", "Symbol", "Company", "Score", "Confidence", "Sector", "Freshness"]}>
          {filteredRankings.map((r) => {
            const rankingScore = r.rankingScore;
            const confidenceScore = r.confidenceScore;

            return (
              <tr
                key={r.symbol}
                className="cursor-pointer transition-colors hover:bg-white/40"
                onClick={() => setPage("stock", r.symbol)}
              >
                <td className="p-4 font-semibold text-slate-500">{formatRank(r.rank)}</td>
                <td className="p-4 font-mono font-bold text-slate-950 hover:underline">
                  {r.symbol}
                </td>
                <td className="max-w-[200px] truncate p-4 text-slate-700">
                  {r.companyName || "Unavailable"}
                </td>
                <td className="p-4">
                  {typeof rankingScore === "number" && Number.isFinite(rankingScore) ? (
                    <ScorePill score={Math.round(rankingScore)} />
                  ) : (
                    <MissingDataBadge />
                  )}
                </td>
                <td className="p-4">
                  {typeof confidenceScore === "number" && Number.isFinite(confidenceScore) ? (
                    <ScorePill score={Math.round(confidenceScore)} />
                  ) : (
                    <MissingDataBadge />
                  )}
                </td>
                <td className="p-4">
                  <Badge variant="info">{r.sector || "Not available"}</Badge>
                </td>
                <td className="p-4">
                  {r.predictionDate ? (
                    <span className="text-[10px] text-emerald-700 font-semibold whitespace-nowrap">
                      {formatFreshness(r.predictionDate)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pending</span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <div className="mt-6">
        <ResearchDisclaimer />
      </div>
      </div>
    </main>
  );
};

export default PublicRankingsPage;
