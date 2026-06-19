import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Trophy, Lock, ArrowRight, Search, Info, ExternalLink, Shield, BookOpen } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductHero, ProductSection, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { useAuth } from "../context/AuthContext";
import { api, type ScannerResultItem } from "../services/api/client";
import Table from "../components/ui/Table";
import Input from "../components/ui/Input";
import CustomSelect from "../components/ui/CustomSelect";
import ScorePill from "../components/ui/ScorePill";
import { formatRank } from "../services/ui/dataFormatting";
import ResearchContextLink from "../components/research/ResearchContextLink";

function rankingsSignalLabel(score: number | null): { label: string; color: string } | null {
  if (score === null) return null;
  if (score >= 75) return { label: "High conviction", color: "#16A34A" };
  if (score >= 55) return { label: "Worth researching", color: "#2962FF" };
  if (score >= 40) return { label: "Track", color: "#F59E0B" };
  return { label: "Needs review", color: "#EF4444" };
}

function isRealSector(sector: string | null | undefined): boolean {
  if (!sector) return false;
  const s = sector.trim().toLowerCase();
  return !["not available", "sector pending", "unavailable", "pending", "", "unknown", "n/a"].includes(s);
}

export const PublicRankingsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [rankings, setRankings] = useState<ScannerResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    api.getScanner("Quality compounders", 50)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setRankings(res.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setRankings([]);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  // Derive sectors from real data only — ignore null/empty/bad
  const sectors = useMemo(() => {
    const set = new Set<string>();
    rankings.forEach((r) => {
      if (isRealSector(r.sector)) set.add(r.sector!.trim());
    });
    return Array.from(set);
  }, [rankings]);

  // Show sector filter only if 2+ useful sectors exist
  const showSectorFilter = sectors.length >= 2;

  const filteredRankings = useMemo(() => {
    return rankings.filter((r) => {
      const matchesSearch =
        r.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
        r.companyName.toLowerCase().includes(searchText.toLowerCase()) ||
        (r.sector && r.sector.toLowerCase().includes(searchText.toLowerCase()));

      const matchesSector = sectorFilter === "all" || r.sector === sectorFilter;

      return matchesSearch && matchesSector;
    });
  }, [rankings, searchText, sectorFilter]);

  // Guest users see 3 rows maximum; authenticated users see all matching rows
  const displayedRankings = useMemo(() => {
    if (!isAuthenticated) {
      return rankings.slice(0, 3);
    }
    return filteredRankings;
  }, [rankings, filteredRankings, isAuthenticated]);

  const handleActionRedirect = useCallback(() => {
    productNavigate("signup");
  }, []);

  return (
    <ProductShell>
      <ProductPage>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">Research Rankings</h1>
              <p className="mt-1 text-sm text-[#9AA7B5]">
                {isAuthenticated 
                  ? "Indian equities ranked by verified quantitative research assessment."
                  : "Institutional-grade research models applied to Indian equities."}
              </p>
            </div>
            {!isAuthenticated && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#F59E0B]" />
                <span className="text-xs text-[#9AA7B5]">Teaser preview</span>
              </div>
            )}
          </div>

          {/* Authenticated Controls Panel */}
          {isAuthenticated && rankings.length > 0 && (
            <ProductPanel className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
                <Input
                  className="pl-9 h-10 w-full"
                  aria-label="Search rankings by symbol or sector"
                  placeholder="Search symbol or sector..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              {showSectorFilter && (
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-xs font-medium text-[#9AA7B5]">Sector:</span>
                  <div className="relative">
                    <CustomSelect
                      value={sectorFilter}
                      onChange={(e) => setSectorFilter(e.target.value)}
                      className="appearance-none bg-[#1e1e2f] text-[#E6EDF3] border border-[#2b2b3a] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4c6ef5]"
                    >
                      <option value="all">All Sectors</option>
                      {sectors.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                </div>
              )}
            </ProductPanel>
          )}

          {/* How to read rankings */}
          {isAuthenticated && rankings.length > 0 && (
            <details className="group rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.015)]">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                How to read rankings
                <ArrowRight className="ml-auto h-3 w-3 transition-transform group-open:rotate-90" aria-hidden="true" />
              </summary>
              <div className="border-t border-[rgba(148,163,184,0.08)] px-4 py-3 text-xs leading-relaxed text-[#9AA7B5] space-y-2">
                <p><strong className="text-[#E6EDF3]">Score</strong> — 0-100 rating based on multi-factor research assessment. Higher scores indicate stronger fundamentals.</p>
                <p><strong className="text-[#E6EDF3]">Conviction</strong> — How confident the model is based on data sufficiency. High conviction means more dimensions were verified.</p>
                <p><strong className="text-[#E6EDF3]">No Buy/Sell calls</strong> — StockStory does not issue trading recommendations. Use scores to inform your own research process.</p>
                <p className="pt-1">
                  <ResearchContextLink label="Read full research standards" />
                </p>
              </div>
            </details>
          )}

          {/* Loading & Empty State */}
          {loading ? (
            <div className="py-12 text-center text-sm text-[#9AA7B5]" role="status" aria-live="polite">
              Loading rankings...
            </div>
          ) : rankings.length === 0 ? (
            <div className="py-12 text-center">
              <Info className="mx-auto h-8 w-8 text-[#64748B]" />
              <h2 className="mt-3 text-base font-semibold text-[#E6EDF3]">Rankings are being compiled</h2>
              <p className="mt-2 text-xs text-[#9AA7B5]">
                Rankings appear after verified multi-factor research runs have completed.
              </p>
              {!isAuthenticated && (
                <div className="mt-6 flex justify-center gap-3">
                  <ProductAction onClick={() => productNavigate("signup")}>Create free account</ProductAction>
                  <ProductAction variant="secondary" onClick={() => productNavigate("methodology")}>Read research standards</ProductAction>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Desktop Rankings Table */}
              <div className="hidden md:block">
                <Table headers={["Rank", "Symbol", "Company", "Sector", "Research Score", "Conviction", "Driver", "Actions"]}>
                  {displayedRankings.map((r) => {
                    const realSector = isRealSector(r.sector);

                    return (
                      <tr
                        key={r.symbol}
                        onClick={isAuthenticated ? () => productNavigate("stock", r.symbol) : handleActionRedirect}
                        className="table-row cursor-pointer"
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isAuthenticated) productNavigate("stock", r.symbol);
                            else handleActionRedirect();
                          }
                        }}
                      >
                        {/* Rank */}
                        <td className="px-6 py-4 font-mono text-sm font-semibold text-[#9AA7B5] tabular-nums">
                          {formatRank(r.rank)}
                        </td>

                        {/* Symbol */}
                        <td className="px-6 py-4 font-mono text-sm font-bold text-[#E6EDF3] hover:underline">
                          {r.symbol}
                        </td>

                        {/* Company Name */}
                        <td className="px-6 py-4 text-sm text-[#9AA7B5] truncate max-w-[220px]">
                          {r.companyName}
                        </td>

                        {/* Sector — omit quietly if not available */}
                        <td className="px-6 py-4 text-sm text-[#9AA7B5]">
                          {realSector ? r.sector : "—"}
                        </td>

                        {/* Research Score */}
                        <td className="px-6 py-4 font-mono">
                          {isAuthenticated ? (
                            r.score !== null && r.score !== undefined ? (
                              <ScorePill score={Math.round(r.score)} />
                            ) : (
                              <span className="text-[10px] text-[#64748B]">—</span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-[#F59E0B] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded">
                              <Lock className="h-3 w-3" /> Gated
                            </span>
                          )}
                        </td>

                        {/* Signal label */}
                        <td className="px-6 py-4 text-xs font-medium text-[#9AA7B5]">
                          {isAuthenticated ? (
                            (() => {
                              const sig = rankingsSignalLabel(r.score);
                              if (!sig) return <span className="text-[#64748B] italic">Pending</span>;
                              return (
                                <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: `${sig.color}33`, backgroundColor: `${sig.color}15`, color: sig.color }}>
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sig.color }} aria-hidden="true" />
                                  {sig.label}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-[#64748B] italic">Sign in to view</span>
                          )}
                        </td>

                        {/* Driver column */}
                        <td className="px-6 py-4 text-[11px] text-[#64748B] max-w-[180px] truncate">
                          {isAuthenticated ? (r.keyReason || "—") : "—"}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAuthenticated) productNavigate("stock", r.symbol);
                                else handleActionRedirect();
                              }}
                              className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 text-[10px] font-semibold text-[#E6EDF3] hover:border-[#2962FF] transition-colors"
                            >
                              Research
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAuthenticated) productNavigate("compare", r.symbol);
                                else handleActionRedirect();
                              }}
                              className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 text-[10px] font-semibold text-[#9AA7B5] hover:text-[#E6EDF3] hover:border-[#2962FF] transition-colors"
                            >
                              Compare
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              </div>

              {/* Mobile View Cards */}
              <div className="grid gap-3 md:hidden">
                {displayedRankings.map((r) => {
                  const realSector = isRealSector(r.sector);

                  return (
                    <ProductPanel key={r.symbol} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-[#9AA7B5] tabular-nums">{formatRank(r.rank)}</span>
                            <span className="font-mono text-base font-bold text-[#E6EDF3]">{r.symbol}</span>
                          </div>
                          <p className="text-xs text-[#9AA7B5] mt-0.5">{r.companyName}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isAuthenticated ? (
                            <>
                              {r.score !== null ? <ScorePill score={Math.round(r.score)} /> : <span className="text-[10px] text-[#64748B] italic">Awaiting data</span>}
                              {(rankingsSignalLabel(r.score)) && (
                                <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium" style={{ borderColor: `${rankingsSignalLabel(r.score)!.color}33`, backgroundColor: `${rankingsSignalLabel(r.score)!.color}15`, color: rankingsSignalLabel(r.score)!.color }}>
                                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: rankingsSignalLabel(r.score)!.color }} aria-hidden="true" />
                                  {rankingsSignalLabel(r.score)!.label}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#F59E0B] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded">
                              <Lock className="h-2.5 w-2.5" /> Gated
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] font-medium">
                        {realSector && (
                          <span className="rounded bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.12)] px-1.5 py-0.5 text-[#9AA7B5]">
                            {r.sector}
                          </span>
                        )}
                        <span className="rounded bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.12)] px-1.5 py-0.5 text-[#9AA7B5]">
                          {isAuthenticated ? (r.conviction || "—") : "Sign in to view conviction"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgba(148,163,184,0.06)]">
                        <button
                          type="button"
                          onClick={() => {
                            if (isAuthenticated) productNavigate("stock", r.symbol);
                            else handleActionRedirect();
                          }}
                          className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.02)] py-1.5 text-center text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]"
                        >
                          Research
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAuthenticated) productNavigate("compare", r.symbol);
                            else handleActionRedirect();
                          }}
                          className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.02)] py-1.5 text-center text-xs font-semibold text-[#9AA7B5] hover:text-[#E6EDF3] hover:border-[#2962FF]"
                        >
                          Compare
                        </button>
                      </div>
                    </ProductPanel>
                  );
                })}
              </div>

              {/* Public/Teaser Lock Panel */}
              {!isAuthenticated && (
                <ProductPanel className="p-6 md:p-8 border border-[rgba(245,158,11,0.2)] bg-gradient-to-br from-[#0D1117] via-[#0F141F] to-[#0D1117] rounded-xl flex flex-col items-center text-center space-y-4 shadow-xl">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(245,158,11,0.1)]">
                    <Lock className="h-6 w-6 text-[#F59E0B]" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h2 className="text-lg font-bold tracking-tight text-[#E6EDF3]">Unlock full research rankings</h2>
                    <p className="text-xs leading-5 text-[#9AA7B5]">
                      Create a free account to unlock our complete universe of scored equities, detailed multi-factor parameters, custom filters, and direct broker handoffs.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
                    <ProductAction onClick={() => productNavigate("signup")} className="font-semibold text-xs">
                      Create free account
                    </ProductAction>
                    <ProductAction variant="secondary" onClick={() => productNavigate("methodology")} className="font-semibold text-xs">
                      Read research standards
                    </ProductAction>
                  </div>
                </ProductPanel>
              )}
            </div>
          )}
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default PublicRankingsPage;
