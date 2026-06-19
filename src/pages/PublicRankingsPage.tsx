import React, { useEffect, useState, useMemo, useCallback } from "react";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import ScorePill from "../components/ui/ScorePill";
import { EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, ResearchDisclaimer } from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { formatRank, formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type LeaderboardEntry } from "../services/api/client";
import { ProductShell, ProductPage, ProductPanel, ProductEmptyState, productNavigate } from "../components/product/ProductUI";

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

  const [explanation, setExplanation] = useState<ExplanationState | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api.getLeaderboard(100)
      .then((res) => { if (ctrl.signal.aborted) return; setRankings(res.data ?? []); setLoading(false); })
      .catch((err) => { if (ctrl.signal.aborted) return; setError(err instanceof ApiError ? err.message : "Rankings are being calculated"); setRankings([]); setLoading(false); });
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

  const openExplanation = useCallback((entry: LeaderboardEntry) => {
    setExplanation({
      symbol: entry.symbol,
      companyName: entry.companyName || undefined,
      rankingScore: entry.rankingScore ?? null,
      confidenceScore: entry.confidenceScore ?? null,
      predictionDate: entry.predictionDate || null,
    });
  }, []);

  return (
    <ProductShell>
      <ProductPage>
        {error && (
          <div className="mb-4 rounded-lg border border-[#EF4444]/20 bg-[rgba(239,68,68,0.06)] p-4 text-xs text-[#EF4444]" role="status">
            <p className="font-semibold">Some rankings are being refreshed</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {explanation && (
          <ProductPanel className="mb-6 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#E6EDF3]">{explanation.symbol}</span>
                {explanation.companyName && <span className="ml-2 text-xs text-[#9AA7B5]">{explanation.companyName}</span>}
              </div>
              <button
                type="button"
                onClick={() => setExplanation(null)}
                className="text-[10px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Score</span>
                <span className="ml-2 font-mono text-sm font-bold text-[#E6EDF3]">
                  {typeof explanation.rankingScore === "number" && Number.isFinite(explanation.rankingScore) ? Math.round(explanation.rankingScore) : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Confidence</span>
                <span className="ml-2 font-mono text-sm font-bold text-[#E6EDF3]">
                  {typeof explanation.confidenceScore === "number" && Number.isFinite(explanation.confidenceScore) ? `${Math.round(explanation.confidenceScore)}%` : "—"}
                </span>
              </div>
              {explanation.predictionDate && (
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Run date</span>
                  <span className="ml-2 text-sm font-bold text-[#E6EDF3]">{explanation.predictionDate}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => { productNavigate("stock", explanation.symbol); }}>
                Open company research
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => { productNavigate("methodology"); }}>
                View methodology
              </Button>
            </div>
          </ProductPanel>
        )}

        <ProductPanel className="mb-6 flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="w-full sm:w-72">
            <Input aria-label="Search rankings by symbol or sector" placeholder="Search symbol or sector..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="whitespace-nowrap text-xs font-medium text-[#9AA7B5]">Sector:</span>
            <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="h-10 w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] sm:w-48">
              {sectors.map((sec) => (<option key={sec} value={sec}>{sec === "all" ? "All Sectors" : sec}</option>))}
            </select>
          </div>
        </ProductPanel>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#9AA7B5]" role="status" aria-live="polite">Loading...</div>
        ) : filteredRankings.length === 0 && rankings.length === 0 ? (
          <div className="flex flex-col gap-5">
            <ProductEmptyState title="Rankings pending" body="Rankings appear after verified scoring has completed for the latest cycle." />

            <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <Button type="button" onClick={() => productNavigate("signup")} className="h-10 px-4 text-xs">Create free account</Button>
              <Button type="button" onClick={() => productNavigate("methodology")} variant="secondary" className="h-10 px-4 text-xs">View scoring methodology</Button>
            </div>
          </div>
        ) : filteredRankings.length === 0 && rankings.length > 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#9AA7B5]">No rankings match your search or sector filter.</p>
            <button onClick={() => { setSearchText(""); setSectorFilter("all"); }} className="mt-3 text-xs font-medium text-[#2962FF] hover:text-[#3B71FF] transition-colors">Clear filters</button>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table headers={["Rank", "Symbol", "Company", "Score", "Confidence", "Sector", "Freshness", ""]}>
                {filteredRankings.map((r) => (
                  <tr
                    key={r.symbol}
                    className="cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => productNavigate("stock", r.symbol)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); productNavigate("stock", r.symbol); } }}
                  >
                    <td className="p-4 text-sm font-semibold text-[#9AA7B5]">{formatRank(r.rank)}</td>
                    <td className="p-4 font-mono text-sm font-bold text-[#E6EDF3] hover:underline">{r.symbol}</td>
                    <td className="max-w-[200px] truncate p-4 text-sm text-[#9AA7B5]">{r.companyName || <span className="text-[#64748B]">Unavailable</span>}</td>
                    <td className="p-4">{typeof r.rankingScore === "number" && Number.isFinite(r.rankingScore) ? <ScorePill score={Math.round(r.rankingScore)} /> : <MissingDataBadge />}</td>
                    <td className="p-4">{typeof r.confidenceScore === "number" && Number.isFinite(r.confidenceScore) ? <ScorePill score={Math.round(r.confidenceScore)} /> : <MissingDataBadge />}</td>
                    <td className="p-4"><Badge variant="info">{r.sector || "Not available"}</Badge></td>
                    <td className="p-4">{r.predictionDate ? <span className="text-[11px] font-medium whitespace-nowrap text-[#16A34A]">{formatFreshness(r.predictionDate)}</span> : <span className="text-[11px] text-[#64748B]">Pending</span>}</td>
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openExplanation(r); }}
                          className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[#9AA7B5] hover:border-[#2962FF]/60 hover:text-[#E6EDF3] transition-colors"
                        >
                          Explain
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); productNavigate("stock", r.symbol); }}
                          className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[#9AA7B5] hover:border-[#2962FF]/60 hover:text-[#E6EDF3] transition-colors"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); productNavigate("compare", r.symbol); }}
                          className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[#9AA7B5] hover:border-[#2962FF]/60 hover:text-[#E6EDF3] transition-colors"
                        >
                          Compare
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="grid gap-4 md:hidden">
              {filteredRankings.map((r) => (
                <ProductPanel key={r.symbol} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{formatRank(r.rank)}</span>
                      <button onClick={() => productNavigate("stock", r.symbol)} className="font-mono text-base font-bold text-[#E6EDF3] hover:underline">{r.symbol}</button>
                    </div>
                    {typeof r.rankingScore === "number" && Number.isFinite(r.rankingScore) ? <ScorePill score={Math.round(r.rankingScore)} /> : <MissingDataBadge />}
                  </div>
                  <div className="mt-1 text-xs text-[#9AA7B5]">{r.companyName || "Unavailable"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[10px] font-medium text-[#9AA7B5]">{r.sector || "Sector unavailable"}</span>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${r.predictionDate ? "border-[rgba(22,163,74,0.2)] text-[#16A34A]" : "border-[rgba(245,158,11,0.2)] text-[#F59E0B]"}`}>
                      {r.predictionDate ? formatFreshness(r.predictionDate) : "Freshness pending"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { openExplanation(r); }}
                      className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] py-2 text-[10px] font-medium text-[#9AA7B5] hover:border-[#2962FF]/60 hover:text-[#E6EDF3] transition-colors"
                    >
                      Trace
                    </button>
                    <button
                      type="button"
                      onClick={() => productNavigate("compare", r.symbol)}
                      className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] py-2 text-[10px] font-medium text-[#9AA7B5] hover:border-[#2962FF]/60 hover:text-[#E6EDF3] transition-colors"
                    >
                      Compare
                    </button>
                    <Button type="button" size="sm" onClick={() => productNavigate("stock", r.symbol)}>
                      Open
                    </Button>
                  </div>
                </ProductPanel>
              ))}
            </div>
          </>
        )}

        <div className="mt-6">
          <ResearchDisclaimer />
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default PublicRankingsPage;
