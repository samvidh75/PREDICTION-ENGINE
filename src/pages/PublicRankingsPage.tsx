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
import { formatRank, formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type LeaderboardEntry } from "../services/api/client";
import { AppScreen, DataSourcePill, MetricCard, MobilePageHeader, PremiumPage, ResearchHeroCard, SectionHeader, StatusChip, Surface } from "../components/premium/PremiumUI";

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
    rankings.forEach((r) => { if (r.sector) set.add(r.sector); });
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
    <PremiumPage>
      <TopNav />
      <MobileNav />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-[76px] sm:px-6 md:pt-28">
        <AppScreen>

        <MobilePageHeader eyebrow="AI scanner" title="Research rankings" body="Today's research scanner uses verified scoring rows from the latest cycle. Tap any stock to inspect the evidence before making your own decision." />
        <ResearchHeroCard eyebrow="Source-backed" title="Ranked companies without fabricated calls." body="Scores are shown only when available from the leaderboard API. Missing confidence, sector, or freshness data remains labelled.">
          <div className="flex flex-wrap gap-2">
            <DataSourcePill label={`${rankings.length.toLocaleString("en-IN")} rows loaded`} tone="muted" />
            {freshnessDate ? <DataSourcePill label={`Fresh ${formatFreshness(freshnessDate)}`} tone="ok" /> : <DataSourcePill label="Freshness pending" tone="warn" />}
          </div>
        </ResearchHeroCard>

        <Surface dark className="ss-grid-texture relative mb-6 hidden overflow-hidden p-6 md:p-8">
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <SectionHeader eyebrow="Leaderboard" title="Research rankings" body="Company rankings from the latest verified scoring cycle, with source freshness visible and missing values labelled." />
            {freshnessDate ? <DataFreshnessBadge date={freshnessDate} /> : <MissingDataBadge />}
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
          <MetricCard label="Rows loaded" value={rankings.length.toLocaleString("en-IN")} detail="From leaderboard API." />
          <MetricCard label="Covered symbols" value={symbolCount !== null ? symbolCount.toLocaleString("en-IN") : "Unavailable"} detail="Coverage endpoint." />
          <MetricCard label="Scored records" value={registryRowCount !== null ? registryRowCount.toLocaleString("en-IN") : "Pending"} detail={latestPredictionDate ? "Latest verified cycle available." : "Latest date unavailable."} tone={registryRowCount ? "ok" : "warn"} />
        </div>

        <Surface className="my-6 flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
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
            <span className="whitespace-nowrap text-xs font-medium text-muted">Sector:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="surface surface-raised h-10 w-full rounded-xl px-3 text-sm sm:w-48"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>{sec === "all" ? "All Sectors" : sec}</option>
              ))}
            </select>
          </div>
        </Surface>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted" role="status" aria-live="polite">Loading rankings…</div>
        ) : filteredRankings.length === 0 && rankings.length === 0 ? (
          <div className="flex flex-col gap-5">
            <EmptyState
              title="Rankings pending"
              description="Rankings appear after verified scoring has completed for the latest cycle."
            />
            {(symbolCount !== null || registryRowCount !== null) && (
              <div className="surface surface-raised rounded-xl p-5">
                <h4 className="label mb-3">Data coverage</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted text-[10px] font-medium">Companies covered</span>
                    <span className="block text-lg font-bold tabular-nums text">
                      {symbolCount !== null ? symbolCount.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] font-medium">Scored records</span>
                    <span className="block text-lg font-bold tabular-nums text">
                      {registryRowCount !== null ? registryRowCount.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] font-medium">Latest update</span>
                    <span className="block text-lg font-bold tabular-nums text">
                      {latestPredictionDate || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <Button type="button" onClick={() => setPage("signup")} className="h-10 px-4 text-xs">Create free account</Button>
              <Button type="button" onClick={() => setPage("methodology")} variant="secondary" className="h-10 px-4 text-xs">View scoring methodology</Button>
            </div>
          </div>
        ) : filteredRankings.length === 0 && rankings.length > 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted">No rankings match your search or sector filter.</p>
            <button onClick={() => { setSearchText(""); setSectorFilter("all"); }} className="btn btn-sm btn-ghost">
              Clear filters
            </button>
          </div>
        ) : (
          <>
          <div className="hidden md:block">
            <Table glass headers={["Rank", "Symbol", "Company", "Score", "Confidence", "Sector", "Freshness"]}>
              {filteredRankings.map((r) => {
              const rankingScore = r.rankingScore;
              const confidenceScore = r.confidenceScore;

              return (
                <tr
                  key={r.symbol}
                  className="cursor-pointer transition-colors hover:bg-white/40"
                  onClick={() => setPage("stock", r.symbol)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPage("stock", r.symbol); } }}
                >
                  <td className="p-4 font-semibold text-muted">{formatRank(r.rank)}</td>
                  <td className="p-4 font-mono font-bold hover:underline text">{r.symbol}</td>
                  <td className="max-w-[200px] truncate p-4 text-muted">{r.companyName || "Unavailable"}</td>
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
                  <td className="p-4"><Badge variant="info">{r.sector || "Not available"}</Badge></td>
                  <td className="p-4">
                    {r.predictionDate ? (
                      <span className="text-[10px] font-semibold whitespace-nowrap text-[var(--color-active)]">
                        {formatFreshness(r.predictionDate)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--color-text-muted)]">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
            </Table>
          </div>
          <div className="grid gap-4 md:hidden">
            {filteredRankings.map((r) => (
              <Surface key={r.symbol} className="p-4" strong>
                <button onClick={() => setPage("stock", r.symbol)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{formatRank(r.rank)}</div>
                      <div className="mt-1 font-mono text-xl font-bold text-slate-950">{r.symbol}</div>
                      <div className="mt-1 text-sm text-slate-600">{r.companyName || "Unavailable"}</div>
                    </div>
                    {typeof r.rankingScore === "number" && Number.isFinite(r.rankingScore) ? <ScorePill score={Math.round(r.rankingScore)} /> : <MissingDataBadge />}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusChip label={r.sector || "Sector unavailable"} tone="muted" />
                    <StatusChip label={r.predictionDate ? formatFreshness(r.predictionDate) : "Freshness pending"} tone={r.predictionDate ? "ok" : "warn"} />
                  </div>
                </button>
              </Surface>
            ))}
          </div>
          </>
        )}

        <div className="mt-6">
          <ResearchDisclaimer />
        </div>
        </AppScreen>
      </div>
    </PremiumPage>
  );
};

export default PublicRankingsPage;
