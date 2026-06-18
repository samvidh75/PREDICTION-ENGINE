import React, { useEffect, useState, useMemo } from "react";
import { ArrowLeftRight, X, Search, TrendingUp, Database, BarChart3, ExternalLink } from "lucide-react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { PremiumPage, navigatePage } from "../components/premium/PremiumUI";
import { RoundedDepthPanel } from "../components/intelligence/RoundedDepthPanel";
import { PredictionConfidenceBar } from "../components/intelligence/PredictionConfidenceBar";
import { ModelRunBadge } from "../components/intelligence/ModelRunBadge";
import { FactorDriverCard } from "../components/intelligence/FactorDriverCard";
import { DataFreshnessLine } from "../components/intelligence/DataFreshnessLine";
import { MethodologyLink } from "../components/intelligence/MethodologyLink";
import { ResearchAuditDrawer } from "../components/intelligence/SourceTraceTimeline";

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
  const [auditSymbol, setAuditSymbol] = useState<string | null>(null);

  // Hydrate from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = (params.get("ids") || "").split(",").filter(Boolean);
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
      // Update URL
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

  const displayedCompanies = [...companies];
  while (displayedCompanies.length < MAX_COMPANIES) {
    displayedCompanies.push({ symbol: "empty", companyName: "Add company" });
  }

  return (
    <PremiumPage nav={<><TopNav /><MobileNav /></>}>
      <div className="w-full px-6 pb-16 pt-20 md:px-10 md:pt-28 lg:px-16 xl:px-24">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#E6EDF3]">Compare research</h1>
          </div>
          <p className="mt-1 text-xs text-[#8B949E]">Compare up to {MAX_COMPANIES} companies by score, factors, and data coverage.</p>
        </div>

        {/* Search to add */}
        {companies.length < MAX_COMPANIES && (
          <RoundedDepthPanel padding="sm" className="mb-6">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 shrink-0 text-[#484F58]" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a company to add..."
                className="w-full bg-transparent text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none"
                aria-label="Search company to compare"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 divide-y divide-white/[0.04] border-t border-white/[0.04] pt-2">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    type="button"
                    onClick={() => addCompany(r.symbol)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs text-[#8B949E] hover:bg-white/[0.04] hover:text-[#E6EDF3] transition-colors"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#484F58]" aria-hidden="true" />
                    <span className="font-mono font-semibold">{r.symbol}</span>
                    {r.name && <span className="text-[10px] text-[#484F58]">{r.name}</span>}
                  </button>
                ))}
              </div>
            )}
          </RoundedDepthPanel>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-[#484F58]">Loading company data...</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayedCompanies.map((company, i) => {
              if (company.symbol === "empty") {
                return (
                  <RoundedDepthPanel key={`empty-${i}`} padding="lg" variant="elevated" className="flex flex-col items-center justify-center min-h-[280px]">
                    <Database className="h-7 w-7 text-[#484F58]" aria-hidden="true" />
                    <p className="mt-3 text-xs text-[#484F58]">Search above to add a company</p>
                  </RoundedDepthPanel>
                );
              }
              return (
                <RoundedDepthPanel key={company.symbol} padding="md" className="relative">
                  <button
                    type="button"
                    onClick={() => removeCompany(company.symbol)}
                    className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.04] text-[#484F58] hover:bg-white/[0.08] hover:text-[#E6EDF3] transition-colors"
                    aria-label={`Remove ${company.symbol}`}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-sm font-semibold text-[#E6EDF3]">{company.symbol}</span>
                      {company.companyName && <span className="ml-2 text-xs text-[#8B949E]">{company.companyName}</span>}
                    </div>
                    {company.score !== null && company.score !== undefined && (
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-semibold tabular-nums text-[#E6EDF3]">{Math.round(Number(company.score))}</span>
                        {company.classification && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">{company.classification}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {company.predictionDate && <ModelRunBadge runDate={company.predictionDate} className="mt-3" />}

                  <div className="mt-3">
                    <PredictionConfidenceBar score={company.confidenceScore ?? null} level={company.confidenceLevel ?? null} />
                  </div>

                  {company.factors && (
                    <div className="mt-3">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Factors</span>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {Object.entries(company.factors).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5">
                            <span className="text-[10px] text-[#8B949E] capitalize">{key}</span>
                            <span className="font-mono text-[10px] font-semibold tabular-nums text-[#E6EDF3]">
                              {typeof val === "number" && Number.isFinite(val) ? Math.round(val) : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => navigatePage("stock", company.symbol)} className="flex-1 text-[10px]">
                      <ExternalLink className="h-3 w-3" aria-hidden="true" /> Open
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setAuditSymbol(company.symbol)} className="flex-1 text-[10px]">
                      <Database className="h-3 w-3" aria-hidden="true" /> Trace
                    </Button>
                  </div>
                </RoundedDepthPanel>
              );
            })}
          </div>
        )}

        {/* Comparison matrix — only when ≥ 2 companies are loaded */}
        {!loading && companies.length >= 2 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">
                  <th className="px-4 py-3">Metric</th>
                  {companies.map((c) => (
                    <th key={c.symbol} className="px-4 py-3 text-right font-mono text-[#E6EDF3]">{c.symbol}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Score", values: companies.map((c) => c.score) },
                  { label: "Confidence", values: companies.map((c) => c.confidenceScore) },
                  { label: "Growth", values: companies.map((c) => c.factors?.growth ?? null) },
                  { label: "Quality", values: companies.map((c) => c.factors?.quality ?? null) },
                  { label: "Momentum", values: companies.map((c) => c.factors?.momentum ?? null) },
                  { label: "Valuation", values: companies.map((c) => c.factors?.valuation ?? null) },
                  { label: "Stability", values: companies.map((c) => c.factors?.stability ?? null) },
                  { label: "Risk", values: companies.map((c) => c.factors?.risk ?? null) },
                  { label: "Classification", values: companies.map((c) => c.classification) },
                  { label: "Last update", values: companies.map((c) => c.predictionDate) },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-[#8B949E]">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-2.5 text-right font-mono text-[11px] text-[#E6EDF3]">
                        {typeof v === "number" && Number.isFinite(v) ? Math.round(v) : (v ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {companies.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <ArrowLeftRight className="h-10 w-10 text-[#484F58]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">No companies to compare</h2>
            <p className="max-w-md text-xs text-[#8B949E]">Search for a company above or pick from rankings to compare up to {MAX_COMPANIES} side by side.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => navigatePage("rankings")}>
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Open rankings
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => navigatePage("search")}>
                <Search className="h-3.5 w-3.5" aria-hidden="true" /> Search companies
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-white/[0.04] pt-4">
          <p className="text-[10px] leading-relaxed text-[#484F58]">
            Compare shows real scores, factors, and data coverage for each company. Missing values are marked as unavailable. Not investment advice.
          </p>
        </div>
      </div>

      <ResearchAuditDrawer open={auditSymbol !== null} onClose={() => setAuditSymbol(null)} symbol={auditSymbol || ""} />
    </PremiumPage>
  );
};

export default ComparePage;
