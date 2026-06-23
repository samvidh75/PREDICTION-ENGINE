import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, X, Search, Loader2 } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../components/product/ProductUI";
import { SpatialSheet } from "../components/intelligence/SpatialSheet";
import { api, type SearchResult } from "../services/api/client";
import { buildCompareViewModel } from "../lib/product/viewModels/compareViewModel";

interface CompareCompany {
  symbol: string;
  companyName?: string;
  score?: number | null;
  classification?: string | null;
}

const MAX_COMPANIES = 3;

export const ComparePage: React.FC = () => {
  const [companies, setCompanies] = useState<CompareCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

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
    // Exclude duplicates before sending
    const uniqueSyms = Array.from(new Set(syms.map(s => s.toUpperCase())));
    if (uniqueSyms.length < 2) return;
    setRouteLoading(true);
    try {
      const res = await api.compareCompanies(uniqueSyms);
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
      // Deduplicate symbols from URL parameters immediately
      const uniqueIds = Array.from(new Set(ids.map(s => s.toUpperCase())));
      const resolved: CompareCompany[] = uniqueIds.map((sym) => ({
        symbol: sym,
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
    const cleanSym = symbol.toUpperCase();
    if (companies.find((c) => c.symbol === cleanSym)) return; // Duplicate check
    setSearchQuery("");
    setSearchResults([]);
    const updated = [...companies, { symbol: cleanSym, companyName: symbol, score: null }];
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

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Compare companies</h1>
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">Compare up to {MAX_COMPANIES} companies side by side to evaluate key factors and determine which deserves further review.</p>
        </div>

        {companies.length < MAX_COMPANIES && (
          <ProductPanel className="mb-6 border border-white/[0.08]">
            <div className="flex items-center gap-3 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a company to add..."
                className="w-full bg-transparent text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                aria-label="Search company to compare"
              />
              {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />}
            </div>
            {searchResults.length > 0 && (
              <div className="border-t border-white/[0.06] px-2 pb-2 pt-1">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    type="button"
                    onClick={() => addCompany(r.symbol)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                    <span className="font-mono font-semibold">{r.symbol}</span>
                    {r.companyName && <span className="text-[10px] text-[var(--color-text-muted)]">{r.companyName}</span>}
                  </button>
                ))}
              </div>
            )}
          </ProductPanel>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-[var(--color-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin text-[#2962FF]" aria-hidden="true" />
            Loading research comparison...
          </div>
        ) : (
          <>
            {companies.length > 0 && (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {companies.map((company) => (
                  <div
                    key={company.symbol}
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[var(--color-surface)] px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => productNavigate("stock", company.symbol)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-mono text-sm font-semibold text-[var(--color-text-primary)] hover:underline">{company.symbol}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCompany(company.symbol)}
                      className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                      aria-label={`Remove ${company.symbol}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {companies.length < MAX_COMPANIES && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/[0.08] px-3 py-2.5 text-xs text-[var(--color-text-muted)]">
                    <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Add company</span>
                  </div>
                )}
              </div>
            )}

            {companies.length === 0 && (
              <div className="flex flex-col items-center gap-5 py-12 text-center">
                <ArrowLeftRight className="h-12 w-12 text-[#2D333B]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Search companies above to compare</h2>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    Add up to {MAX_COMPANIES} companies to see a side-by-side comparison matrix.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}>Open AI Scanner</ProductAction>
                  <ProductAction variant="ghost" onClick={() => productNavigate("search")}>Search company</ProductAction>
                </div>
              </div>
            )}
          </>
        )}

        {routeLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-[var(--color-text-secondary)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
            Loading comparison...
          </div>
        )}

        {!loading && !routeLoading && companies.length >= 2 && routeData && (
          <div className="space-y-5">
            {/* Factor Comparison Matrix (clean rows, only real non-empty rows) */}
            {routeData.factorComparison && routeData.factorComparison.length > 0 && (
              <ProductPanel className="overflow-hidden border border-white/[0.08] p-4">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Decision matrix</div>
                <div className="space-y-2">
                  {routeData.factorComparison.filter(fc => fc.explanation).map((fc) => (
                    <div key={fc.factor} className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[var(--color-text-primary)]">{fc.factor}</span>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{fc.explanation}</p>
                      </div>
                      {fc.winner && (
                        <div className="shrink-0 text-[10px] font-bold text-[#2962FF] uppercase tracking-wider bg-[#2962FF]/10 px-2 py-0.5 rounded self-start sm:self-center">
                          {fc.winner}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ProductPanel>
            )}

            {/* Recommendation - Genuinely neutral */}
            {routeData.recommendation && (
              <ProductPanel className="overflow-hidden border border-white/[0.08] p-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Summary review prompt</div>
                <p className="text-xs leading-relaxed text-[var(--color-text-primary)]">
                  {routeData.recommendation.toLowerCase().includes("buy")
                    ? "Needs further review"
                    : routeData.recommendation}
                </p>
              </ProductPanel>
            )}

            {/* Actions per company */}
            <div className="flex flex-wrap items-center gap-2">
              {companies.map((c) => (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => productNavigate("stock", c.symbol)}
                  className="rounded-lg border border-[#2962FF] bg-[#2962FF]/10 px-4 py-2 text-xs font-semibold text-white hover:bg-[#2962FF]/20 transition-all"
                >
                  Research {c.symbol} &rarr;
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && !routeLoading && companies.length >= 2 && !routeData && (
          <ProductPanel className="p-6 text-center border border-white/[0.08]">
            <p className="text-xs text-[var(--color-text-secondary)]">Not enough information to draw a direct decision matrix for these selections yet.</p>
          </ProductPanel>
        )}
      </ProductPage>
    </ProductShell>
  );
};

export default ComparePage;

