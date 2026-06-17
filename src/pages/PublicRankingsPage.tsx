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

interface RankingEntry {
  symbol: string;
  rankingScore?: number;
  ranking_score?: number;
  confidenceScore?: number;
  confidence_score?: number;
  companyName?: string | null;
  classification?: string;
  sector?: string | null;
  industry?: string | null;
  predictionDate?: string | null;
  prediction_date?: string | null;
  source?: string | null;
}

interface CoverageInfo {
  symbolCount: number | null;
  registryRowCount: number | null;
  latestPredictionDate: string | null;
}

export const PublicRankingsPage: React.FC = () => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [coverageData, setCoverageData] = useState<CoverageInfo | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/intelligence/leaderboard?limit=100", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("LEADERBOARD_UNAVAILABLE");
        const body = await response.json();
        return Array.isArray(body) ? body : [];
      })
      .then((body) => {
        if (!active) return;
        setRankings(body);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setRankings([]);
        setLoading(false);
      });

    fetch("/api/ops/data-coverage", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body?.ok || !active) return;
        const cov = body.coverage;
        setCoverageData({
          symbolCount: cov.symbols?.status === "available" ? (cov.symbols.count ?? 0) : null,
          registryRowCount: cov.predictionRegistry?.status === "available" ? (cov.predictionRegistry.rowCount ?? 0) : null,
          latestPredictionDate: cov.predictionRegistry?.latestPredictionDate ?? null,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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

  const freshnessDate = rankings[0]?.predictionDate ?? rankings[0]?.prediction_date ?? null;

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <TopNav />
      <MobileNav />
      <div className={`${tokens.layout.container} pt-[76px] md:pt-28`}>
        <PageHeader
          title="Research rankings"
          subtitle="Rankings will appear here when source-backed scoring has produced verified company snapshots."
          primaryAction={freshnessDate ? <DataFreshnessBadge date={freshnessDate} /> : <MissingDataBadge />}
        />

      <div className="my-6 flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row">
        <div className="w-full sm:w-72">
          <Input
            aria-label="Search rankings by symbol or sector"
            placeholder="Search symbol or sector..."
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
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/15 sm:w-48"
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
        <div className="py-12 text-center text-sm text-slate-500">Loading rankings...</div>
      ) : filteredRankings.length === 0 ? (
        <div className="flex flex-col gap-5">
          <EmptyState
            title="Verified rankings are being prepared"
            description="Rankings will appear here when source-backed scoring has produced verified company snapshots. No placeholder data or fabricated scores are shown."
          />
          {coverageData && (
            <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Data Coverage Context
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Indexed Symbols</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {coverageData.symbolCount !== null ? coverageData.symbolCount.toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Prediction Rows</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {coverageData.registryRowCount !== null ? coverageData.registryRowCount.toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-slate-400">Latest Prediction</span>
                  <span className="block text-lg font-bold text-slate-950 tabular-nums">
                    {coverageData.latestPredictionDate || "—"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Rankings require verified prediction snapshots. No rankings are fabricated or extrapolated.
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
        <Table headers={["Rank", "Symbol", "Company", "Score", "Confidence", "Sector", "Freshness"]}>
          {filteredRankings.map((r, index) => {
            const rankingScore = r.rankingScore ?? r.ranking_score;
            const confidenceScore = r.confidenceScore ?? r.confidence_score;
            const predictionDate = r.predictionDate ?? r.prediction_date ?? null;

            return (
              <tr
                key={r.symbol}
                className="cursor-pointer transition-colors hover:bg-slate-50"
                onClick={() => setPage("stock", r.symbol)}
              >
                <td className="p-4 font-semibold text-slate-500">{formatRank(index + 1)}</td>
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
                  {predictionDate ? (
                    <span className="text-[10px] text-emerald-700 font-semibold whitespace-nowrap">
                      {formatFreshness(predictionDate)}
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
