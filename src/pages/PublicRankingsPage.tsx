import React, { useEffect, useState, useMemo, useCallback } from "react";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import ScorePill from "../components/ui/ScorePill";
import { EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, ResearchDisclaimer } from "../components/ui/PageHeader";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { formatRank, formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type LeaderboardEntry } from "../services/api/client";
import { AppScreen, DataSourcePill, MetricCard, PremiumPage, Surface } from "../components/premium/PremiumUI";
import { IntelligenceModal } from "../components/intelligence/IntelligenceModal";
import { PredictionConfidenceBar } from "../components/intelligence/PredictionConfidenceBar";
import { FactorDriverCard } from "../components/intelligence/FactorDriverCard";
import { DataFreshnessLine } from "../components/intelligence/DataFreshnessLine";
import { ModelRunBadge } from "../components/intelligence/ModelRunBadge";
import { MethodologyLink } from "../components/intelligence/MethodologyLink";

interface ExplanationState {
  symbol: string;
  companyName?: string;
  rankingScore: number | null;
  confidenceScore: number | null;
  predictionDate?: string | null;
}

export const PublicRankingsPage: React.FC = () => {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [symbolCount, setSymbolCount] = useState<number | null>(null);
  const [registryRowCount, setRegistryRowCount] = useState<number | null>(null);
  const [latestPredictionDate, setLatestPredictionDate] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplanationState | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api.getLeaderboard(100)
      .then((res) => { if (ctrl.signal.aborted) return; setRankings(res.data ?? []); setLoading(false); })
      .catch((err) => { if (ctrl.signal.aborted) return; setError(err instanceof ApiError ? err.message : "Rankings unavailable"); setRankings([]); setLoading(false); });
    api.getDataCoverage()
      .then((cov) => { if (ctrl.signal.aborted) return; setSymbolCount(cov.coverage?.symbols?.count ?? null); setRegistryRowCount(cov.coverage?.predictionRegistry?.rowCount ?? null); setLatestPredictionDate(cov.coverage?.predictionRegistry?.latestPredictionDate ?? null); })
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
      const matchSearch = r.symbol.toLowerCase().includes(searchText.toLowerCase()) || (r.sector && r.sector.toLowerCase().includes(searchText.toLowerCase()));
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

  const openExplanation = useCallback((entry: LeaderboardEntry) => {
    setExplanation({
      symbol: entry.symbol,
      companyName: entry.companyName || undefined,
      rankingScore: entry.rankingScore ?? null,
      confidenceScore: entry.confidenceScore ?? null,
      predictionDate: entry.predictionDate || null,
    });
  }, []);

  const freshnessDate = rankings[0]?.predictionDate ?? null;

  return (
    <PremiumPage>
      <TopNav />
      <MobileNav />
      <div className="w-full px-6 pb-16 pt-20 md:px-10 md:pt-24 lg:px-16 xl:px-24">
        <AppScreen>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Research rankings</span>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-[#E6EDF3] md:text-3xl">Research rankings</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8B949E]">
              Ranked companies from the latest verified scoring cycle. Scores, confidence, and freshness are visible and missing values are labelled.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DataSourcePill label={`${rankings.length.toLocaleString("en-IN")} rows loaded`} tone="muted" />
            {freshnessDate ? <DataSourcePill label={`Fresh ${formatFreshness(freshnessDate)}`} tone="ok" /> : <DataSourcePill label="Freshness pending" tone="warn" />}
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Rows loaded" value={rankings.length.toLocaleString("en-IN")} detail="From leaderboard API." />
          <MetricCard label="Covered symbols" value={symbolCount !== null ? symbolCount.toLocaleString("en-IN") : "Unavailable"} detail="Coverage endpoint." />
          <MetricCard label="Scored records" value={registryRowCount !== null ? registryRowCount.toLocaleString("en-IN") : "Pending"} detail={latestPredictionDate ? "Latest verified cycle available." : "Latest date unavailable."} tone={registryRowCount ? "ok" : "warn"} />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[#EF9A09]/20 bg-[#EF9A09]/[0.03] p-4 text-xs text-[#EF9A09]" role="status">
            <p className="font-semibold">Some data is temporarily unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Rank explanation panel */}
        {explanation && (
          <div className="mb-6 rounded-[22px] border border-[#2962FF]/10 bg-[#2962FF]/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#E6EDF3]">{explanation.symbol}</span>
                {explanation.companyName && <span className="ml-2 text-xs text-[#8B949E]">{explanation.companyName}</span>}
              </div>
              <button
                type="button"
                onClick={() => setExplanation(null)}
                className="text-[10px] font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Score</span>
                <span className="ml-2 font-mono text-sm font-bold text-[#E6EDF3]">
                  {typeof explanation.rankingScore === "number" && Number.isFinite(explanation.rankingScore) ? Math.round(explanation.rankingScore) : "—"}
                </span>
              </div>
              <PredictionConfidenceBar score={explanation.confidenceScore} />
              {explanation.predictionDate && <ModelRunBadge runDate={explanation.predictionDate} />}
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => { setPage("stock", explanation.symbol); }}>
                Open company research
              </Button>
              <MethodologyLink label="View methodology and trust metrics" />
            </div>
          </div>
        )}

        <Surface className="my-6 flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="w-full sm:w-72">
            <Input aria-label="Search rankings by symbol or sector" placeholder="Search symbol or sector..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="whitespace-nowrap text-xs font-medium text-muted">Sector:</span>
            <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="surface surface-raised h-10 w-full rounded-xl px-3 text-sm sm:w-48">
              {sectors.map((sec) => (<option key={sec} value={sec}>{sec === "all" ? "All Sectors" : sec}</option>))}
            </select>
          </div>
        </Surface>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted" role="status" aria-live="polite">Loading rankings…</div>
        ) : filteredRankings.length === 0 && rankings.length === 0 ? (
          <div className="flex flex-col gap-5">
            <EmptyState title="Rankings pending" description="Rankings appear after verified scoring has completed for the latest cycle." />
            {(symbolCount !== null || registryRowCount !== null) && (
              <div className="surface surface-raised rounded-xl p-5">
                <h4 className="label mb-3">Data coverage</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted text-[10px] font-medium">Companies covered</span>
                    <span className="block text-lg font-bold tabular-nums text">{symbolCount !== null ? symbolCount.toLocaleString() : "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] font-medium">Scored records</span>
                    <span className="block text-lg font-bold tabular-nums text">{registryRowCount !== null ? registryRowCount.toLocaleString() : "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] font-medium">Latest update</span>
                    <span className="block text-lg font-bold tabular-nums text">{latestPredictionDate || "—"}</span>
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
            <button onClick={() => { setSearchText(""); setSectorFilter("all"); }} className="btn btn-sm btn-ghost">Clear filters</button>
          </div>
        ) : (
          <>
          <div className="hidden md:block">
            <Table headers={["Rank", "Symbol", "Company", "Score", "Confidence", "Sector", "Freshness", ""]}>
              {filteredRankings.map((r) => (
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
                  <td className="p-4">{typeof r.rankingScore === "number" && Number.isFinite(r.rankingScore) ? <ScorePill score={Math.round(r.rankingScore)} /> : <MissingDataBadge />}</td>
                  <td className="p-4">{typeof r.confidenceScore === "number" && Number.isFinite(r.confidenceScore) ? <ScorePill score={Math.round(r.confidenceScore)} /> : <MissingDataBadge />}</td>
                  <td className="p-4"><Badge variant="info">{r.sector || "Not available"}</Badge></td>
                    <td className="p-4">{r.predictionDate ? <span className="text-[10px] font-medium whitespace-nowrap text-[var(--color-active)]">{formatFreshness(r.predictionDate)}</span> : <span className="text-[10px] text-[var(--color-text-muted)]">Pending</span>}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openExplanation(r); }}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-[#8B949E] hover:bg-white/[0.08] hover:text-[#E6EDF3] transition-colors"
                    >
                      Explain
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
          <div className="grid gap-4 md:hidden">
            {filteredRankings.map((r) => (
              <div key={r.symbol} className="rounded-[22px] border border-white/5 bg-[#0D1117] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#484F58]">{formatRank(r.rank)}</div>
                    <button onClick={() => setPage("stock", r.symbol)} className="mt-1 font-mono text-base font-bold text-[#E6EDF3] hover:underline">{r.symbol}</button>
                    <div className="mt-1 text-xs text-[#8B949E]">{r.companyName || "Unavailable"}</div>
                  </div>
                  {typeof r.rankingScore === "number" && Number.isFinite(r.rankingScore) ? <ScorePill score={Math.round(r.rankingScore)} /> : <MissingDataBadge />}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-[#8B949E]">{r.sector || "Sector unavailable"}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${r.predictionDate ? "border-[#22AB94]/10 text-[#22AB94]" : "border-[#EF9A09]/10 text-[#EF9A09]"}`}>
                    {r.predictionDate ? formatFreshness(r.predictionDate) : "Freshness pending"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openExplanation(r)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-[10px] font-medium text-[#8B949E] hover:bg-white/[0.08] hover:text-[#E6EDF3] transition-colors"
                  >
                    Open explanation
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage("stock", r.symbol)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-[10px] font-medium text-[#8B949E] hover:bg-white/[0.08] hover:text-[#E6EDF3] transition-colors"
                  >
                    View company
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        <div className="mt-6">
          <ResearchDisclaimer />
        </div>
        </AppScreen>
      </div>

      {/* Intelligence Modal for explanation */}
      <IntelligenceModal
        open={explanation !== null}
        onClose={() => setExplanation(null)}
        title={explanation ? `${explanation.symbol} — rank explanation` : ""}
        subtitle="Model score, confidence, and factor context from the latest scoring cycle."
      >
        {explanation && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Score</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-[#E6EDF3]">
                    {typeof explanation.rankingScore === "number" && Number.isFinite(explanation.rankingScore) ? Math.round(explanation.rankingScore) : "—"}
                  </span>
                  <span className="text-xs text-[#8B949E]">/ 100</span>
                </div>
              </div>
              <PredictionConfidenceBar score={explanation.confidenceScore} />
            </div>

            {explanation.predictionDate && (
              <ModelRunBadge runDate={explanation.predictionDate} />
            )}

            <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <p className="text-[11px] leading-relaxed text-[#8B949E]">
                <strong>Factor context</strong> — The composite score is derived from quality, growth, valuation, momentum, risk, and sector strength factor inputs. Factor breakdowns are available on the company research page.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => { setPage("stock", explanation.symbol); setExplanation(null); }}>
                Open company research
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => { setPage("methodology"); setExplanation(null); }}>
                View methodology
              </Button>
            </div>

            <p className="text-[10px] leading-relaxed text-[#484F58]">
              Research only. Scores are derived from verified market data and model calculations. This is not investment advice.
            </p>
          </div>
        )}
      </IntelligenceModal>
    </PremiumPage>
  );
};

export default PublicRankingsPage;
