import React, { useEffect, useState } from "react";
import { ArrowLeftRight, X, Search, BarChart3, Loader2 } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../components/product/ProductUI";

interface CompareCompany {
  symbol: string;
  companyName?: string;
  score?: number | null;
  classification?: string | null;
  confidenceScore?: number | null;
  confidenceLevel?: string | null;
  rank?: number | null;
  predictionDate?: string | null;
  factors?: Record<string, number | null>;
}

function fetchCompanyData(symbol: string): Promise<CompareCompany | null> {
  return fetch(`/api/intelligence/insight/${encodeURIComponent(symbol)}`)
    .then((r) => r.json())
    .then((res) => {
      const d = res?.data;
      if (!d) return null;
      return {
        symbol: symbol.toUpperCase(),
        companyName: d.companyName || d.company_name,
        score: typeof d.healthScore === "number" ? d.healthScore : d.rankingScore ?? null,
        classification: d.classification || null,
        confidenceScore: d.confidence?.score ?? d.confidenceScore ?? null,
        confidenceLevel: d.confidence?.level ?? d.confidenceLevel ?? null,
        predictionDate: d.predictionDate || d.prediction_date || null,
        factors: d.factors ? {
          growth: d.factors.growth?.score ?? null,
          quality: d.factors.quality?.score ?? null,
          stability: d.factors.stability?.score ?? null,
          momentum: d.factors.momentum?.score ?? null,
          valuation: d.factors.value?.score ?? d.factors.valuation?.score ?? null,
          risk: d.factors.risk?.score ?? null,
        } : undefined,
      };
    })
    .catch(() => null);
}

const MAX_COMPANIES = 3;

export const ComparePage: React.FC = () => {
  const [companies, setCompanies] = useState<CompareCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get("ids") || "";
    const idParam = params.get("id") || "";
    const ids = idsParam ? idsParam.split(",").filter(Boolean) : (idParam ? [idParam] : []);
    if (ids.length > 0) {
      setLoading(true);
      Promise.all(ids.map(fetchCompanyData)).then((results) => {
        setCompanies(results.filter(Boolean) as CompareCompany[]);
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || companies.length >= MAX_COMPANIES) { setSearchResults([]); return; }
    setSearching(true);
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const results = Array.isArray(data) ? data.slice(0, 5) : data?.results?.slice(0, 5) || [];
        setSearchResults(results);
        setSearching(false);
      })
      .catch(() => { setSearchResults([]); setSearching(false); });
    return () => ctrl.abort();
  }, [searchQuery, companies.length]);

  const addCompany = async (symbol: string) => {
    if (companies.find((c) => c.symbol === symbol.toUpperCase())) return;
    setSearchQuery("");
    setSearchResults([]);
    const data = await fetchCompanyData(symbol);
    if (data) {
      const updated = [...companies, data];
      setCompanies(updated);
      const params = new URLSearchParams(window.location.search);
      params.set("ids", updated.map((c) => c.symbol).join(","));
      window.history.replaceState({}, "", `?${params.toString()}`);
    }
  };

  const removeCompany = (symbol: string) => {
    const updated = companies.filter((c) => c.symbol !== symbol);
    setCompanies(updated);
    const params = new URLSearchParams(window.location.search);
    if (updated.length > 0) params.set("ids", updated.map((c) => c.symbol).join(","));
    else params.delete("ids");
    window.history.replaceState({}, "", `?${params.toString()}`);
  };

  const factorLabels: Record<string, string> = {
    growth: "Growth",
    quality: "Quality",
    stability: "Stability",
    momentum: "Momentum",
    valuation: "Valuation",
    risk: "Risk",
  };

  const factorKeys = ["growth", "quality", "stability", "momentum", "valuation", "risk"];

  const fmt = (v: number | null | undefined): string | null => {
    if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
    return null;
  };

  const formatDate = (d: string | null | undefined): string => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return "—"; }
  };

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-sm font-semibold text-[#E6EDF3]">Compare research</h1>
          </div>
          <p className="mt-1 text-xs text-[#9AA7B5]">Compare up to {MAX_COMPANIES} companies side by side.</p>
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
                    {r.name && <span className="text-[10px] text-[#64748B]">{r.name}</span>}
                  </button>
                ))}
              </div>
            )}
          </ProductPanel>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#9AA7B5]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
            Loading company data...
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
                      {company.score !== null && company.score !== undefined && (
                        <span className="block text-[10px] tabular-nums text-[#9AA7B5]">{Math.round(Number(company.score))}</span>
                      )}
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
              <div className="flex flex-col items-center gap-5 py-12 text-center">
                <ArrowLeftRight className="h-8 w-8 text-[#64748B]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">No companies to compare</h2>
                  <p className="mt-1 max-w-md text-xs text-[#9AA7B5]">Search for a company above or pick from rankings to compare up to {MAX_COMPANIES} side by side.</p>
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
            )}
          </>
        )}

        {!loading && companies.length >= 2 && companies.every((c) => c.symbol !== "empty") && (
          <div className="space-y-5">
            <ProductPanel className="overflow-hidden">
              <div className="divide-y divide-[rgba(148,163,184,0.08)]">
                {/* Score & Context */}
                <div className="px-4 py-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Score &amp; Context</div>
                  <div className="-mx-2 overflow-x-auto">
                    <div className="min-w-[400px] px-2">
                      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Score</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right font-mono text-xs font-semibold tabular-nums text-[#E6EDF3] py-1.5">{fmt(c.score) ?? "—"}</div>
                        ))}
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Confidence</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">{c.confidenceScore !== null && c.confidenceScore !== undefined ? `${Math.round(c.confidenceScore)}%` : "—"}</div>
                        ))}
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Classification</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right text-xs text-[#E6EDF3] py-1.5">{c.classification || "—"}</div>
                        ))}
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Last update</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right text-[10px] text-[#E6EDF3] py-1.5">{c.predictionDate ? formatDate(c.predictionDate) : "—"}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Factor Breakdown */}
                {companies.some((c) => c.factors) && (
                  <div className="px-4 py-3.5">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Factor Breakdown</div>
                    <div className="-mx-2 overflow-x-auto">
                      <div className="min-w-[400px] px-2">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                          {factorKeys.map((key) => (
                            <React.Fragment key={key}>
                              <div className="text-[10px] font-medium text-[#64748B] py-1.5 capitalize">{factorLabels[key]}</div>
                              {companies.map((c) => (
                                <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">
                                  {c.factors && typeof c.factors[key] === "number" && Number.isFinite(c.factors[key]) ? Math.round(c.factors[key]!) : "—"}
                                </div>
                              ))}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Research date */}
                <div className="px-4 py-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Research date</div>
                  <div className="-mx-2 overflow-x-auto">
                    <div className="min-w-[400px] px-2">
                      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Prediction date</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right text-[10px] text-[#E6EDF3] py-1.5">{c.predictionDate ? formatDate(c.predictionDate) : "—"}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ProductPanel>
          </div>
        )}

        {!loading && companies.length > 0 && (
          <div className="mt-5 border-t border-[rgba(148,163,184,0.08)] pt-4">
            <p className="text-[10px] leading-relaxed text-[#64748B]">
              Compare shows real scores and factors for each company. Missing values are marked as unavailable. Not investment advice.
            </p>
          </div>
        )}
      </ProductPage>
    </ProductShell>
  );
};

export default ComparePage;
