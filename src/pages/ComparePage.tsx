import React, { useEffect, useState } from "react";
import { ArrowLeftRight, X, Search, BarChart3, Loader2, ExternalLink, Bookmark, Copy } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../components/product/ProductUI";
import { CompareShareRecap } from "../components/share/CompareShareRecap";
import { SpatialSheet } from "../components/intelligence/SpatialSheet";
import { PRODUCT_EVENTS, trackEvent } from "../lib/analytics/productEvents";
import { api, type SearchResult } from "../services/api/client";

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

async function fetchCompanyData(symbol: string): Promise<CompareCompany | null> {
  try {
    const res = await api.getInsight(symbol);
    const d = res?.data;
    if (!d) return null;
    return {
      symbol: symbol.toUpperCase(),
      companyName: (d as any).companyName || (d as any).company_name,
      score: typeof (d as any).healthScore === "number" ? (d as any).healthScore : (d as any).rankingScore ?? null,
      classification: (d as any).classification || null,
      confidenceScore: (d as any).confidence?.score ?? (d as any).confidenceScore ?? null,
      confidenceLevel: (d as any).confidence?.level ?? (d as any).confidenceLevel ?? null,
      predictionDate: (d as any).predictionDate || (d as any).prediction_date || null,
      factors: (d as any).factors ? {
        growth: (d as any).factors.growth?.score ?? null,
        quality: (d as any).factors.quality?.score ?? null,
        stability: (d as any).factors.stability?.score ?? null,
        momentum: (d as any).factors.momentum?.score ?? null,
        valuation: (d as any).factors.value?.score ?? (d as any).factors.valuation?.score ?? null,
        risk: (d as any).factors.risk?.score ?? null,
      } : undefined,
    };
  } catch {
    return null;
  }
}

const MAX_COMPANIES = 3;

export const ComparePage: React.FC = () => {
  const [companies, setCompanies] = useState<CompareCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareRecapOpen, setShareRecapOpen] = useState(false);

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

  const hasFactor = (key: string): boolean =>
    companies.some((c) => typeof c.factors?.[key] === "number");

  function getDecisionLabels(company: CompareCompany): string[] {
    const labels: string[] = [];
    const scores = companies.map((c) => c.score ?? -Infinity);
    const maxScore = Math.max(...scores);
    const qualityScores = companies.map((c) => c.factors?.quality ?? -Infinity);
    const maxQuality = Math.max(...qualityScores);
    const valuationScores = companies.map((c) => c.factors?.valuation ?? -Infinity);
    const maxValuation = Math.max(...valuationScores);
    const riskScores = companies.map((c) => c.factors?.risk ?? Infinity);
    const minRisk = Math.min(...riskScores);

    if (company.score === maxScore) labels.push("Highest research score");
    else labels.push("Needs review");
    if (company.factors?.quality === maxQuality && qualityScores.some((s) => s !== maxQuality && s !== -Infinity)) labels.push("Better quality profile");
    if (company.factors?.valuation === maxValuation && valuationScores.some((s) => s !== maxValuation && s !== -Infinity)) labels.push("Better valuation context");
    if (company.factors?.risk === minRisk && riskScores.some((s) => s !== minRisk && s !== Infinity)) labels.push("Lower risk score");

    return labels;
  }

  const decisionLabelColors: Record<string, string> = {
    "Highest research score": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Needs review": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Better quality profile": "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "Better valuation context": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "Lower risk score": "bg-sky-500/10 text-sky-400 border-sky-500/20",
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
              <div className="flex flex-col items-center gap-5 py-16 text-center">
                <ArrowLeftRight className="h-10 w-10 text-[#2D333B]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Search companies above to compare</h2>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#9AA7B5]">
                    Add up to {MAX_COMPANIES} companies to see a side-by-side breakdown of scores, factors, and
                    research narratives. Use this to decide which company deserves deeper investigation.
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
            )}
          </>
        )}

        {!loading && companies.length >= 2 && (
          <div className="space-y-5">
            <ProductPanel className="overflow-hidden">
              <div className="divide-y divide-[rgba(148,163,184,0.08)]">
                {/* Summary */}
                <div className="px-4 py-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Summary</div>
                  <div className="-mx-2 overflow-x-auto">
                    <div className="min-w-[400px] px-2">
                      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Score</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right font-mono text-xs font-semibold tabular-nums text-[#E6EDF3] py-1.5">{fmt(c.score) ?? "—"}</div>
                        ))}
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Conviction</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">{c.confidenceScore !== null && c.confidenceScore !== undefined ? `${Math.round(c.confidenceScore)}%` : "—"}</div>
                        ))}
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Classification</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right text-xs text-[#E6EDF3] py-1.5">{c.classification || "—"}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thesis Comparison */}
                <div className="px-4 py-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Thesis Comparison</div>
                  <div className="-mx-2 overflow-x-auto">
                    <div className="min-w-[400px] px-2">
                      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                        <div className="text-[10px] font-medium text-[#64748B] py-1.5">Narrative</div>
                        {companies.map((c) => (
                          <div key={c.symbol} className="text-right text-[10px] text-[#9AA7B5] py-1.5 italic">
                            {c.classification
                              ? `${c.symbol} classified as ${c.classification.toLowerCase()} with a score of ${fmt(c.score) ?? "—"}`
                              : "Narrative not available in compare mode"}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality Comparison */}
                {hasFactor("quality") && (
                  <div className="px-4 py-3.5">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Quality Comparison</div>
                    <div className="-mx-2 overflow-x-auto">
                      <div className="min-w-[400px] px-2">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                          <div className="text-[10px] font-medium text-[#64748B] py-1.5">Quality</div>
                          {companies.map((c) => (
                            <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">
                              {c.factors && typeof c.factors.quality === "number" && Number.isFinite(c.factors.quality) ? Math.round(c.factors.quality) : "—"}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Valuation Comparison */}
                {hasFactor("valuation") && (
                  <div className="px-4 py-3.5">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Valuation Comparison</div>
                    <div className="-mx-2 overflow-x-auto">
                      <div className="min-w-[400px] px-2">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                          <div className="text-[10px] font-medium text-[#64748B] py-1.5">Valuation</div>
                          {companies.map((c) => (
                            <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">
                              {c.factors && typeof c.factors.valuation === "number" && Number.isFinite(c.factors.valuation) ? Math.round(c.factors.valuation) : "—"}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Growth Comparison */}
                {hasFactor("growth") && (
                  <div className="px-4 py-3.5">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Growth Comparison</div>
                    <div className="-mx-2 overflow-x-auto">
                      <div className="min-w-[400px] px-2">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                          <div className="text-[10px] font-medium text-[#64748B] py-1.5">Growth</div>
                          {companies.map((c) => (
                            <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">
                              {c.factors && typeof c.factors.growth === "number" && Number.isFinite(c.factors.growth) ? Math.round(c.factors.growth) : "—"}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Risk Comparison */}
                {hasFactor("risk") && (
                  <div className="px-4 py-3.5">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Risk Comparison</div>
                    <div className="-mx-2 overflow-x-auto">
                      <div className="min-w-[400px] px-2">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                          <div className="text-[10px] font-medium text-[#64748B] py-1.5">Risk</div>
                          {companies.map((c) => (
                            <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">
                              {c.factors && typeof c.factors.risk === "number" && Number.isFinite(c.factors.risk) ? Math.round(c.factors.risk) : "—"}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Momentum Comparison (if available) */}
                {hasFactor("momentum") && (
                  <div className="px-4 py-3.5">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Momentum Comparison</div>
                    <div className="-mx-2 overflow-x-auto">
                      <div className="min-w-[400px] px-2">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                          <div className="text-[10px] font-medium text-[#64748B] py-1.5">Momentum</div>
                          {companies.map((c) => (
                            <div key={c.symbol} className="text-right font-mono text-xs tabular-nums text-[#E6EDF3] py-1.5">
                              {c.factors && typeof c.factors.momentum === "number" && Number.isFinite(c.factors.momentum) ? Math.round(c.factors.momentum) : "—"}
                            </div>
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

            {/* Decision helper */}
            <ProductPanel className="overflow-hidden">
              <div className="px-4 py-3.5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Research cues</div>
                <div className="-mx-2 overflow-x-auto">
                  <div className="min-w-[400px] px-2">
                    <div className="grid" style={{ gridTemplateColumns: `120px repeat(${companies.length}, 1fr)` }}>
                      <div className="text-[10px] font-medium text-[#64748B] py-1.5">Labels</div>
                      {companies.map((c) => (
                        <div key={c.symbol} className="flex flex-col items-end gap-1 py-1.5">
                          {getDecisionLabels(c).map((label) => (
                            <span
                              key={label}
                              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${decisionLabelColors[label] || "bg-[rgba(148,163,184,0.08)] text-[#9AA7B5] border-[rgba(148,163,184,0.16)]"}`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ProductPanel>

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

        {!loading && companies.length > 0 && (
          <div className="mt-5 border-t border-[rgba(148,163,184,0.08)] pt-4">
            <p className="text-[10px] leading-relaxed text-[#64748B]">
              Compare shows recorded scores and factors for each company. Missing values are marked as pending. Research cues are reading aids based on available values, not investment advice.
            </p>
          </div>
        )}

        <SpatialSheet open={shareRecapOpen} onClose={() => setShareRecapOpen(false)} title="Comparison Summary">
          {companies.length >= 2 ? (
            <CompareShareRecap
              companyA={{ symbol: companies[0].symbol, companyName: companies[0].companyName, score: companies[0].score }}
              companyB={{ symbol: companies[1].symbol, companyName: companies[1].companyName, score: companies[1].score }}
              decisionLabels={[...new Set(companies.flatMap((c) => getDecisionLabels(c)))]}
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
