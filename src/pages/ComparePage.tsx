import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, X, Search, BarChart3, Loader2, ExternalLink, Bookmark, Copy, TrendingUp, Star } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../components/product/ProductUI";
import { CompareShareRecap } from "../components/share/CompareShareRecap";
import { SpatialSheet } from "../components/intelligence/SpatialSheet";
import { PRODUCT_EVENTS, trackEvent } from "../lib/analytics/productEvents";
import { api, type SearchResult, type ScannerResultItem } from "../services/api/client";
import ResearchContextLink from "../components/research/ResearchContextLink";
import { buildCompareViewModel } from "../lib/product/viewModels/compareViewModel";

interface CompareCompany {
  symbol: string;
  companyName?: string;
  score?: number | null;
  classification?: string | null;
}

const MAX_COMPANIES = 3;
const SUGGESTED_PAIRS = [
  { label: "Quality vs Value", description: "Compare top quality and top value companies" },
  { label: "Growth vs Stability", description: "Compare growth leaders vs stable compounders" },
  { label: "Large cap vs Mid cap", description: "Compare companies by market cap tier" },
];

export const ComparePage: React.FC = () => {
  const [companies, setCompanies] = useState<CompareCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestedRankings, setSuggestedRankings] = useState<ScannerResultItem[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);

  useEffect(() => {
    api.getScanner("Quality compounders", 10)
      .then((res) => { setSuggestedRankings(res.data ?? []); })
      .catch(() => { setSuggestedRankings([]); })
      .finally(() => setSuggestedLoading(false));
  }, []);

  // Compare route response state
  const [routeData, setRouteData] = useState<{
    factorComparison: Array<{ factor: string; winner: string | null; explanation: string }>;
    recommendation: string | null;
    missingDataCaveat: string | null;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [shareRecapOpen, setShareRecapOpen] = useState(false);

  const companyViews = useMemo(() => {
    return companies.map((c) => ({
      symbol: c.symbol,
      companyName: c.companyName || "",
      score: c.score !== null && c.score !== undefined ? c.score : null,
      classification: c.classification || null,
    }));
  }, [companies]);

  const viewModel = useMemo(() => {
    return buildCompareViewModel(
      companyViews,
      routeData?.factorComparison?.map((c: any) => ({
        factor: c.factor,
        values: c.values ?? [],
        winner: typeof c.winner === "number" ? c.winner : null,
      })) ?? []
    );
  }, [companyViews, routeData]);

  const fetchCompare = useCallback(async (syms: string[]) => {
    setRouteLoading(true);
    try {
      const res = await api.compareCompanies(syms);
      setRouteData(res.data);
    } catch {
      setRouteData(null);
    }
    setRouteLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get("ids") || "";
    const idParam = params.get("id") || "";
    const ids = idsParam ? idsParam.split(",").filter(Boolean) : (idParam ? [idParam] : []);
    if (ids.length > 0) {
      setLoading(true);
      const resolved: CompareCompany[] = ids.map((sym) => ({
        symbol: sym.toUpperCase(),
        companyName: sym,
        score: null,
      }));
      setCompanies(resolved);
      setLoading(false);
      if (resolved.length >= 2) {
        fetchCompare(resolved.map((c) => c.symbol));
      }
    }
  }, [fetchCompare]);

  useEffect(() => {
    if (!searchQuery.trim() || companies.length >= MAX_COMPANIES) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchUniversal(searchQuery.trim());
        const results = res?.data?.results ?? [];
        setSearchResults(results.slice(0, 5));
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, companies.length]);

  const addCompany = async (symbol: string) => {
    if (companies.find((c) => c.symbol === symbol.toUpperCase())) return;
    setSearchQuery("");
    setSearchResults([]);
    const updated = [...companies, { symbol: symbol.toUpperCase(), companyName: symbol, score: null }];
    setCompanies(updated);
    const params = new URLSearchParams(window.location.search);
    params.set("ids", updated.map((c) => c.symbol).join(","));
    window.history.replaceState({}, "", `?${params.toString()}`);
    if (updated.length >= 2) {
      fetchCompare(updated.map((c) => c.symbol));
    }
  };

  const removeCompany = (symbol: string) => {
    const updated = companies.filter((c) => c.symbol !== symbol);
    setCompanies(updated);
    const params = new URLSearchParams(window.location.search);
    if (updated.length > 0) params.set("ids", updated.map((c) => c.symbol).join(","));
    else params.delete("ids");
    window.history.replaceState({}, "", `?${params.toString()}`);
    if (updated.length >= 2) {
      fetchCompare(updated.map((c) => c.symbol));
    } else {
      setRouteData(null);
    }
  };

  const fmt = (v: number | null | undefined): string => {
    if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
    return "—";
  };

  const decisionLabelColors: Record<string, string> = {
    "Highest research score": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Needs review": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Better quality profile": "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "Better valuation context": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "Lower risk score": "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "Stronger research case": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Higher risk": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-sm font-semibold text-[#E6EDF3]">Compare research</h1>
          </div>
          <p className="mt-1 text-xs text-[#9AA7B5]">Compare up to {MAX_COMPANIES} companies side by side to decide which deserves more research.</p>
        </div>

        {companies.length < MAX_COMPANIES && (
          <ProductPanel className="mb-5 p-0">
            <div className="flex items-center gap-3 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a company to add..."
                className="w-full bg-transparent text-xs text-[#E6EDF3] outline-none placeholder:text-[#64748B]"
                aria-label="Search company to compare"
              />
              {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />}
            </div>
            {searchResults.length > 0 && (
              <div className="border-t border-[rgba(148,163,184,0.08)] px-2 pb-2 pt-1">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    type="button"
                    onClick={() => addCompany(r.symbol)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs text-[#9AA7B5] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#E6EDF3] transition-colors"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden="true" />
                    <span className="font-mono font-semibold">{r.symbol}</span>
                    {r.companyName && <span className="text-[10px] text-[#64748B]">{r.companyName}</span>}
                  </button>
                ))}
              </div>
            )}
          </ProductPanel>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#9AA7B5]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
            Loading research comparison...
          </div>
        ) : (
          <>
            {companies.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {companies.map((company) => (
                  <div
                    key={company.symbol}
                    className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => productNavigate("stock", company.symbol)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-mono text-xs font-semibold text-[#E6EDF3] hover:underline">{company.symbol}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCompany(company.symbol)}
                      className="rounded p-1 text-[#64748B] hover:text-[#E6EDF3] transition-colors"
                      aria-label={`Remove ${company.symbol}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {companies.length < MAX_COMPANIES && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-[rgba(148,163,184,0.12)] px-3 py-2 text-xs text-[#64748B]">
                    <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Add company</span>
                  </div>
                )}
              </div>
            )}

            {companies.length === 0 && (
              <div className="flex flex-col gap-6 py-6">
                <div className="flex flex-col items-center gap-5 text-center">
                  <ArrowLeftRight className="h-10 w-10 text-[#2D333B]" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-semibold text-[#E6EDF3]">Search companies above to compare</h2>
                    <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#9AA7B5]">
                      Add up to {MAX_COMPANIES} companies to see a side-by-side breakdown. Use this to decide which company deserves deeper investigation.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ProductAction onClick={() => productNavigate("rankings")}>
                      <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Open rankings
                    </ProductAction>
                    <ProductAction variant="secondary" onClick={() => productNavigate("search")}>
                      <Search className="h-3.5 w-3.5" aria-hidden="true" /> Search companies
                    </ProductAction>
                  </div>
                </div>

                {!suggestedLoading && suggestedRankings.length >= 3 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                      <h3 className="text-xs font-semibold text-[#E6EDF3]">Suggested comparisons</h3>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {suggestedRankings.slice(0, 6).map((r) => (
                        <button
                          key={r.symbol}
                          type="button"
                          onClick={() => addCompany(r.symbol)}
                          className="flex items-center gap-3 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:border-[#2962FF]/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#E6EDF3]">{r.symbol}</span>
                              {r.rank && <span className="text-[10px] text-[#64748B]">#{r.rank}</span>}
                            </div>
                            <p className="truncate text-[10px] text-[#9AA7B5]">{r.companyName}</p>
                          </div>
                          {r.score !== null && (
                            <span className="shrink-0 text-[11px] font-semibold text-[#2962FF]">{Math.round(r.score)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_PAIRS.map((pair) => (
                        <button
                          key={pair.label}
                          type="button"
                          onClick={() => {
                            if (suggestedRankings.length >= 2) {
                              addCompany(suggestedRankings[0].symbol);
                              setTimeout(() => addCompany(suggestedRankings[1].symbol), 100);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[rgba(148,163,184,0.12)] px-2.5 py-1.5 text-[10px] text-[#9AA7B5] hover:border-[#2962FF]/40 hover:text-[#E6EDF3] transition-colors"
                        >
                          <Star className="h-3 w-3" aria-hidden="true" />
                          {pair.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {routeLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#9AA7B5]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
            Loading comparison...
          </div>
        )}

        {!loading && !routeLoading && companies.length >= 2 && routeData && (
          <div className="space-y-5">
            {/* Factor Comparison from Research Engine */}
            {routeData.factorComparison && routeData.factorComparison.length > 0 && (
              <ProductPanel className="overflow-hidden">
                <div className="px-4 py-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Factor Comparison</div>
                  <div className="-mx-2 overflow-x-auto">
                    <div className="min-w-[400px] px-2 space-y-3">
                      {routeData.factorComparison.map((fc) => (
                        <div key={fc.factor} className="rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.02)] p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#E6EDF3]">{fc.factor}</span>
                            {fc.winner && (
                              <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${decisionLabelColors[fc.winner] || "bg-[rgba(148,163,184,0.08)] text-[#9AA7B5] border-[rgba(148,163,184,0.16)]"}`}>
                                {fc.winner}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-[#9AA7B5]">{fc.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ProductPanel>
            )}

            {/* Recommendation */}
            {routeData.recommendation && (
              <ProductPanel className="overflow-hidden">
                <div className="px-4 py-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Research Cue</div>
                  <p className="text-sm leading-5 text-[#E6EDF3]">{routeData.recommendation}</p>
                </div>
              </ProductPanel>
            )}

            {/* Missing data caveat */}
            {routeData.missingDataCaveat && (
              <div className="rounded-lg border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.06)] p-3 text-xs text-[#F59E0B]">
                {routeData.missingDataCaveat}
              </div>
            )}

            {/* Actions per company */}
            <ProductPanel className="overflow-hidden">
              <div className="px-4 py-3.5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Actions</div>
                <div className="-mx-2 overflow-x-auto">
                  <div className="min-w-[400px] px-2">
                    <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                      <div className="text-[10px] font-medium text-[#64748B] py-1.5" />
                      {companies.map((c) => (
                        <div key={c.symbol} className="flex items-center justify-end gap-1.5 py-1.5">
                          <ProductAction onClick={() => productNavigate("stock", c.symbol)}>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" /> Research
                          </ProductAction>
                          <ProductAction variant="secondary" onClick={() => productNavigate("stock", c.symbol)}>
                            <Bookmark className="h-3 w-3" aria-hidden="true" /> Track
                          </ProductAction>
                          <ProductAction variant="secondary" onClick={() => { setShareRecapOpen(true); trackEvent(PRODUCT_EVENTS.COMPARE_SHARE_OPENED); }}>
                            <Copy className="h-3 w-3" aria-hidden="true" /> Recap
                          </ProductAction>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ProductPanel>
          </div>
        )}

        {!loading && !routeLoading && companies.length >= 2 && !routeData && (
          <ProductPanel className="p-6 text-center">
            <p className="text-sm text-[#9AA7B5]">Comparison is being prepared for these companies. Check back shortly.</p>
            <div className="mt-4 flex justify-center gap-2">
              <ProductAction variant="secondary" onClick={() => fetchCompare(companies.map((c) => c.symbol))}>Try again</ProductAction>
            </div>
          </ProductPanel>
        )}

        {!loading && companies.length > 0 && (
          <div className="mt-5 border-t border-[rgba(148,163,184,0.08)] pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] leading-relaxed text-[#64748B]">
                Compare shows structured research output for the selected companies. Missing values are omitted. Research cues are reading aids based on available values, not investment advice.
              </p>
              <ResearchContextLink label="How scores work" />
            </div>
          </div>
        )}

        <SpatialSheet open={shareRecapOpen} onClose={() => setShareRecapOpen(false)} title="Comparison Summary">
          {companies.length >= 2 && routeData ? (
            <CompareShareRecap
              companyA={{ symbol: companies[0].symbol, companyName: companies[0].companyName, score: null }}
              companyB={{ symbol: companies[1].symbol, companyName: companies[1].companyName, score: null }}
              decisionLabels={routeData.factorComparison?.map((fc) => fc.winner).filter((w): w is string => w !== null) ?? []}
            />
          ) : (
            <div className="flex items-center justify-center py-8 text-xs text-[#9AA7B5]">
              Add at least two companies to see a comparison recap.
            </div>
          )}
        </SpatialSheet>
      </ProductPage>
    </ProductShell>
  );
};

export default ComparePage;
