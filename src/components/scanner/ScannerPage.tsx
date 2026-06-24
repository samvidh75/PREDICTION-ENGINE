import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Filter, Lock, Search, TrendingUp, Shield, AlertTriangle, BarChart3, Briefcase, DollarSign, X, SlidersHorizontal, Star } from "lucide-react";
import { productNavigate, ProductAction, ProductPage, ProductPanel, ProductShell } from "../product/ProductUI";
import { api, type ScannerResultItem } from "../../services/api/client";
import { addTrackedCompany, removeTrackedCompany, isTracked } from "../../lib/track/trackStore";
import { scannerResultToResearchListItem } from "../../lib/product/productViewAdapters";
import { signalLabelFromScore } from "../../lib/product/signalLabels";
import CustomSelect from "../ui/CustomSelect";
import { buildScannerViewModel } from "../../lib/product/viewModels/scannerViewModel";
import { SCANNER_CATEGORIES, type ScannerCategory, CATEGORY_SECTIONS } from "../../lib/product/scannerCategories";
import { getCurrentPlan, canViewPremiumScans, UPGRADE_URL } from "../../lib/product/planAccess";
import { toResearchState, assertNoForbiddenScannerCopy } from "../../lib/compliance/scannerPolicy";
import SebiDisclaimer from "../compliance/SebiDisclaimer";
import ScoreRing from "../ui/ScoreRing";
import ClassificationBadge from "../ui/ClassificationBadge";
import type { UnifiedClassification } from "../../prediction-engine/types";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { runCompanyDataPipeline } from "../../services/data/CompanyDataPipeline";
import { NIFTY50_SYMBOLS } from "../../services/universe/StockUniverse";
import { fPrice, fChange } from "../../lib/format";

const categoryIcon = (id: ScannerCategory) => {
  switch (id) {
    case "large_cap_health": return Shield;
    case "mid_cap_health": return Shield;
    case "small_cap_health": return Shield;
    case "quality_leaders": return Star;
    case "low_debt_leaders": return Briefcase;
    case "profitability_leaders": return TrendingUp;
    case "financial_strength": return Shield;
    case "valuation_comfort": return DollarSign;
    case "momentum_improving": return TrendingUp;
    case "dividend_stability": return Shield;
    case "risk_rising": return AlertTriangle;
    case "good_business_out_of_favour": return DollarSign;
  }
};

const SCORE_RANGES = ["All", "80-100", "60-79", "40-59", "Below 40"];

const SORT_OPTIONS = [
  { value: "score-desc", label: "Score ↓" },
  { value: "score-asc", label: "Score ↑" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
] as const;

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{label}</label>
      <div className="relative">
        <CustomSelect
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full cursor-pointer rounded-lg border border-white/[0.08] bg-[var(--color-surface)] px-3 py-1.5 pr-8 text-xs text-[var(--color-text-primary)] outline-none transition-colors hover:border-[#2962FF]/50 focus:border-[#2962FF] focus:outline-none focus:ring-1 focus:ring-[#2962FF]"
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </CustomSelect>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{title}</h4>
      {children}
    </div>
  );
}

function scannerSignalLabel(score: number | null): { label: string; color: string } | null {
  const t = signalLabelFromScore(score);
  if (!t) return null;
  return { label: toResearchState(t.label), color: t.color };
}

function complianceExplanation(entry: ScannerResultItem): string {
  const score = entry.score ?? 50;
  const riskMarker = (entry.riskMarker || "").toLowerCase();
  if (riskMarker.includes("risk") || riskMarker.includes("weak")) {
    return "Risk signals present — closer review recommended.";
  }
  if (score >= 75) {
    return "Strong business quality and lower balance-sheet risk.";
  }
  if (score >= 60) {
    return "Improving profitability with reasonable valuation context.";
  }
  if (score >= 45) {
    return "Healthy financial strength, but valuation needs review.";
  }
  return "Momentum is improving, but risk should be reviewed.";
}

export default function ScannerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScannerResultItem[]>([]);
  const [allEntries, setAllEntries] = useState<ScannerResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("large_cap_health");
  const [classificationFilter, setClassificationFilter] = useState("All");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [sortValue, setSortValue] = useState("score-desc");
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);

  const [pipelineResults, setPipelineResults] = useState<Map<string, { symbol: string; companyName: string; score: number; classification: UnifiedClassification; price: string; change: string; qualityValue: number | null; growthValue: number | null; momentumValue: number | null }>>(new Map());
  const [skeletonCount, setSkeletonCount] = useState(0);
  const [pipeLoading, setPipeLoading] = useState(false);
  const pipelineRef = useRef(false);

  const [filters, setFilters] = useState({
    scoreRange: "All",
  });

  const plan = getCurrentPlan();
  const isPremium = canViewPremiumScans(plan);

  const viewModel = useMemo(() => {
    return buildScannerViewModel(
      query,
      results.map((r) => ({
        symbol: r.symbol,
        companyName: r.companyName || "",
        sector: r.sector || "",
        score: typeof r.score === "number" ? r.score : null,
        rank: r.rank ?? 0,
        conviction: r.conviction || "",
        keyReason: r.keyReason || "",
        riskMarker: r.riskMarker || "",
        hasRealData: true,
      })),
      loading,
      activeCategory
    );
  }, [query, results, loading, activeCategory]);

  const registryFallback = useCallback((): ScannerResultItem[] => StockRegistry.getAllStocks().slice(0, 24).map((stock, index) => ({
    symbol: stock.symbol,
    companyName: stock.companyName,
    sector: stock.sector,
    rank: index + 1,
    conviction: "Awaiting engine score",
    score: null,
    oneLineThesis: "Company profile is available; the latest engine score is still loading.",
    keyReason: "Registry-backed company profile",
    riskMarker: null,
  })), []);

  const fetchScanner = useCallback(async (preset: string) => {
    setLoading(true);
    setScannerMessage(null);
    try {
      const res = await api.getScanner(preset, 200);
      const data = res.data?.length ? res.data : registryFallback();
      setAllEntries(data);
      setResults(data);
      setScannerMessage(res.message ?? null);
    } catch {
      const fallback = registryFallback();
      setAllEntries(fallback);
      setResults(fallback);
      setScannerMessage("Live rankings are temporarily unavailable. Showing the NSE/BSE company directory without fabricated scores.");
    }
    setLoading(false);
  }, [registryFallback]);

  useEffect(() => {
    if (activeCategory) {
      const cat = SCANNER_CATEGORIES.find((c) => c.id === activeCategory);
      if (cat && cat.filterPreset) {
        fetchScanner(cat.filterPreset);
        return;
      }
    }
    if (!activeCategory) {
      setLoading(false);
    }
  }, [activeCategory, fetchScanner]);

  const runBatchPipeline = useCallback(async (catId: string) => {
    if (pipelineRef.current) return;
    pipelineRef.current = true;
    setPipeLoading(true);
    setSkeletonCount(10);
    setPipelineResults(new Map());
    setScannerMessage(null);

    const symbols = NIFTY50_SYMBOLS.slice(0, 15);
    const isLargeCap = catId === "large_cap_health";
    const resultsMap = new Map<string, { symbol: string; companyName: string; score: number; classification: UnifiedClassification; price: string; change: string; qualityValue: number | null; growthValue: number | null; momentumValue: number | null }>();

    for (const sym of symbols) {
      try {
        const p = await runCompanyDataPipeline(sym);
        if (isLargeCap) {
          const mc = p.price.marketCap;
          if (mc !== null && mc < 5e11) continue;
        }
        const score = p.prediction?.rankingScore ?? p.prediction?.healthScore ?? 50;
        if (isLargeCap && score < 65) continue;
        const cls: UnifiedClassification = score >= 80 ? "EXCELLENT" : score >= 65 ? "HEALTHY" : score >= 50 ? "STABLE" : score >= 35 ? "WEAKENING" : "AT_RISK";
        const qv = p.prediction?.factorScores?.find(f => f.group === 'quality')?.value ?? null;
        const gv = p.prediction?.factorScores?.find(f => f.group === 'growth')?.value ?? null;
        const mv = p.prediction?.factorScores?.find(f => f.group === 'momentum')?.value ?? null;
        resultsMap.set(sym, {
          symbol: sym,
          companyName: p.companyName ?? sym,
          score,
          classification: cls,
          price: fPrice(p.price.current),
          change: fChange(p.price.change),
          qualityValue: qv,
          growthValue: gv,
          momentumValue: mv,
        });
      } catch {
        // skip failing symbols
      }
      setPipelineResults(new Map(resultsMap));
      setSkeletonCount(Math.max(0, 10 - resultsMap.size));
    }

    setSkeletonCount(0);
    setPipeLoading(false);
    pipelineRef.current = false;
  }, []);

  const handleCategoryClick = useCallback((catId: string, isFree: boolean) => {
    if (!isFree && !isPremium) {
      productNavigate("pricing");
      return;
    }
    if (activeCategory === catId) {
      setActiveCategory("");
      setAllEntries([]);
      setResults([]);
      setPipelineResults(new Map());
      setSkeletonCount(0);
      return;
    }
    setActiveCategory(catId);
    runBatchPipeline(catId);
  }, [activeCategory, isPremium, runBatchPipeline]);

  const handleQuerySubmit = useCallback(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setResults(allEntries);
      return;
    }
    const filtered = allEntries.filter((e) =>
      e.companyName?.toLowerCase().includes(trimmed) ||
      e.symbol?.toLowerCase().includes(trimmed) ||
      e.sector?.toLowerCase().includes(trimmed)
    );
    setResults(filtered);
  }, [query, allEntries]);

  const hasRiskFlag = useCallback((entry: ScannerResultItem): boolean => {
    return entry.riskMarker !== null && entry.riskMarker !== "Risk review normal";
  }, []);

  const filteredResults = useMemo(() => {
    let filtered = activeCategory ? results : [];
    const seen = new Set<string>();
    filtered = filtered.filter((r) => {
      if (!r.symbol) return false;
      if (seen.has(r.symbol)) return false;
      seen.add(r.symbol);
      return true;
    });

    if (filters.scoreRange !== "All") {
      filtered = filtered.filter((e) => {
        if (e.score === null || e.score === undefined) return false;
        if (filters.scoreRange === "80-100") return e.score >= 80;
        if (filters.scoreRange === "60-79") return e.score >= 60 && e.score < 80;
        if (filters.scoreRange === "40-59") return e.score >= 40 && e.score < 60;
        if (filters.scoreRange === "Below 40") return e.score < 40;
        return true;
      });
    }
    if (classificationFilter !== "All") {
      filtered = filtered.filter((entry) => {
        const score = entry.score ?? -1;
        if (classificationFilter === "Excellent") return score >= 80;
        if (classificationFilter === "Healthy") return score >= 65 && score < 80;
        if (classificationFilter === "Stable") return score >= 50 && score < 65;
        return score >= 0 && score < 50;
      });
    }
    return filtered;
  }, [results, filters, activeCategory, classificationFilter]);

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    const [field, dir] = sortValue.split("-") as [string, string];
    sorted.sort((a, b) => {
      if (field === "score") {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        return dir === "desc" ? sb - sa : sa - sb;
      }
      const na = (a.companyName ?? a.symbol ?? "").toLowerCase();
      const nb = (b.companyName ?? b.symbol ?? "").toLowerCase();
      if (na < nb) return dir === "asc" ? -1 : 1;
      if (na > nb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredResults, sortValue]);

  const handleResearch = useCallback((symbol: string) => productNavigate("stock", symbol), []);
  const handleCompare = useCallback((symbol: string) => productNavigate("compare", symbol), []);
  const handleTrack = useCallback((symbol: string) => {
    const entry = results.find((r) => r.symbol === symbol);
    if (!entry) return;
    if (isTracked(symbol)) {
      removeTrackedCompany(symbol);
    } else {
      addTrackedCompany({ symbol, companyName: entry.companyName || symbol, addedAt: new Date().toISOString(), source: "scanner" });
    }
    setResults((prev) => [...prev]);
  }, [results]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuerySubmit();
  }, [handleQuerySubmit]);

  const sectionsByTitle: Record<string, { id: string; label: string }> = {};
  for (const s of CATEGORY_SECTIONS) {
    sectionsByTitle[s.id] = s;
  }

  const categoriesBySection = useMemo(() => {
    const map: Record<string, typeof SCANNER_CATEGORIES> = {};
    for (const cat of SCANNER_CATEGORIES) {
      if (!map[cat.section]) map[cat.section] = [];
      map[cat.section].push(cat);
    }
    return map;
  }, []);

  return (
    <ProductShell>
      <ProductPage>
        <div className="flex flex-col gap-6">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-[28px] border border-blue-100/80 bg-[linear-gradient(125deg,rgba(255,255,255,.98),rgba(239,246,255,.88)_58%,rgba(245,243,255,.82))] px-5 py-7 shadow-[0_24px_65px_rgba(30,64,175,.10)] sm:px-7 sm:py-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-400/14 blur-3xl" />
            <div className="relative">
              <h1 className="text-[32px] font-semibold leading-none tracking-[-.045em] text-[var(--color-text-primary)] sm:text-[40px]">Stock Scanner — Indian Equities</h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--color-text-secondary)]">Ranked by StockStory engine score · Updated daily</p>
            </div>
          </div>

          <SebiDisclaimer variant="banner" />
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Classification filter">
            {["All", "Excellent", "Healthy", "Stable", "Weakening"].map((item) => <button key={item} type="button" role="tab" aria-selected={classificationFilter === item} onClick={() => setClassificationFilter(item)} className={`rounded-full px-4 py-2 text-xs font-bold ${classificationFilter === item ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item}</button>)}
          </div>

          {/* Natural-language search */}
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,.07)] focus-within:border-blue-300 focus-within:shadow-[0_16px_38px_rgba(41,98,255,.12)]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Search className="h-4 w-4" /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Try: low-debt large caps with improving profitability"
              className="h-10 w-full min-w-0 bg-transparent text-[15px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
              aria-label="Search companies by name, symbol, or sector"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults(allEntries); }}
                className="mr-1 shrink-0 rounded p-0.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleQuerySubmit}
              className="shrink-0 rounded-xl bg-[#2962FF] px-5 py-3 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(41,98,255,.24)] hover:bg-[#3B71FF] transition"
            >
              Run scanner
            </button>
          </div>

          {/* Category sections */}
          {CATEGORY_SECTIONS.map((section) => {
            const cats = categoriesBySection[section.id] || [];
            if (cats.length === 0) return null;
            return (
              <section key={section.id} aria-labelledby={`section-${section.id}`}>
                <div className="mb-3">
                  <h2 id={`section-${section.id}`} className="text-sm font-bold uppercase tracking-[.12em] text-[var(--color-text-muted)]">{section.label}</h2>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {cats.map((cat) => {
                    const active = activeCategory === cat.id;
                    const Icon = categoryIcon(cat.id);
                    const isLocked = !cat.free && !isPremium;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryClick(cat.id, cat.free)}
                        className={`group flex min-h-[80px] items-start gap-3 rounded-2xl border p-3 text-left text-xs font-semibold transition duration-200 ${
                          active
                            ? "-translate-y-0.5 border-[#2962FF] bg-[linear-gradient(145deg,#fff,#eef4ff)] text-[#1D4ED8] shadow-[0_12px_28px_rgba(41,98,255,.13)]"
                            : isLocked
                              ? "border-dashed border-[var(--color-border)] bg-white/60 text-[var(--color-text-muted)]"
                              : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:text-[var(--color-text-primary)] hover:shadow-md"
                        }`}
                        title={cat.description}
                      >
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${active ? "bg-blue-100 text-blue-600" : isLocked ? "bg-slate-50/60 text-slate-400" : "bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"}`}>
                          {isLocked ? (
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </span>
                        <span className="leading-4">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Upgrade prompt for non-premium users */}
          {!isPremium && (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-gradient-to-br from-blue-50/50 to-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Unlock deeper scanner views with Investor</h3>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Get mid-cap, small-cap, profitability, and financial strength categories.</p>
                </div>
                <button
                  type="button"
                  onClick={() => productNavigate("pricing")}
                  className="shrink-0 rounded-xl bg-[#2962FF] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(41,98,255,.24)] hover:bg-[#3B71FF] transition"
                >
                  View plans
                </button>
              </div>
            </div>
          )}

          {/* Results toolbar */}
          {activeCategory && !loading && sortedResults.length > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border-light)] bg-slate-50/70 px-3 py-2">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors md:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {advancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">Sort</span>
                <div className="relative">
                  <CustomSelect
                    aria-label="Sort results"
                    value={sortValue}
                    onChange={(e) => setSortValue(e.target.value)}
                    className="h-8 cursor-pointer rounded-lg border border-white/[0.08] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-text-primary)] outline-none transition-colors hover:border-[#2962FF]/50 focus:border-[#2962FF]"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </CustomSelect>
                </div>
              </div>
              <div className="md:hidden flex-1" />
              <div className="hidden md:block flex-1" />
              <span className="text-[11px] text-[var(--color-text-muted)]">{sortedResults.length} result{sortedResults.length === 1 ? "" : "s"}</span>
            </div>
          )}

          {/* Advanced filters - desktop */}
          {activeCategory && !loading && sortedResults.length > 0 && (
            <div className="hidden md:block">
              <ProductPanel className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" aria-hidden="true" />
                    Advanced filters
                  </span>
                  {advancedOpen ? <ChevronUp className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" /> : <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />}
                </button>
                {advancedOpen && (
                  <div className="border-t border-[rgba(148,163,184,0.08)] px-4 py-4">
                    <FilterSection title="Score">
                      <div className="grid gap-3 sm:max-w-xs">
                        <FilterSelect label="Score range" value={filters.scoreRange} options={SCORE_RANGES} onChange={(v) => setFilters((p) => ({ ...p, scoreRange: v }))} />
                      </div>
                    </FilterSection>
                  </div>
                )}
              </ProductPanel>
            </div>
          )}

          {/* Results heading */}
          {activeCategory && !loading && sortedResults.length > 0 && (
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Companies worth reviewing</h2>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Healthy companies to research further based on your selected category.</p>
              </div>
              <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] shadow-sm">{sortedResults.length} companies</span>
            </div>
          )}

          {/* Pipeline skeleton loading */}
          {pipeLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading pipeline results">
              {Array.from({ length: Math.max(1, skeletonCount) }, (_, index) => (
                <div key={`skel-${index}`} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between">
                    <div><div className="h-4 w-16 rounded bg-slate-100" /><div className="mt-2 h-5 w-32 rounded bg-slate-100" /></div>
                    <div className="h-10 w-10 rounded-full bg-slate-100" />
                  </div>
                  <div className="mt-4 h-3 w-20 rounded bg-slate-100" />
                  <div className="mt-3 flex gap-2"><div className="h-2 flex-1 rounded bg-slate-100" /><div className="h-2 flex-1 rounded bg-slate-100" /><div className="h-2 flex-1 rounded bg-slate-100" /></div>
                  <div className="mt-4 h-10 w-full rounded bg-slate-100" />
                </div>
              ))}
            </div>
          )}

          {/* Pipeline results */}
          {!pipeLoading && pipelineResults.size > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from(pipelineResults.values()).map((pr) => (
                <div key={pr.symbol} className="group relative min-h-[200px] overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => productNavigate("stock", pr.symbol)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[13px] font-semibold text-[var(--color-text-muted)] tracking-[.08em]">{pr.symbol}</span>
                      <h3 className="mt-1 truncate text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)]">{pr.companyName}</h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{pr.price}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{pr.change}</span>
                      </div>
                    </div>
                    <ScoreRing score={pr.score} size="sm" />
                  </div>
                  <div className="mt-3">
                    <ClassificationBadge classification={pr.classification} />
                  </div>
                  {pr.qualityValue !== null && pr.growthValue !== null && (
                    <div className="mt-4 space-y-2">
                      <div><div className="flex items-center justify-between text-[10px]"><span className="text-[var(--color-text-muted)]">Quality</span><span className="font-semibold text-[var(--color-text-primary)]">{pr.qualityValue}</span></div><div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pr.qualityValue}%` }} /></div></div>
                      <div><div className="flex items-center justify-between text-[10px]"><span className="text-[var(--color-text-muted)]">Growth</span><span className="font-semibold text-[var(--color-text-primary)]">{pr.growthValue}</span></div><div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pr.growthValue}%` }} /></div></div>
                      <div><div className="flex items-center justify-between text-[10px]"><span className="text-[var(--color-text-muted)]">Momentum</span><span className="font-semibold text-[var(--color-text-primary)]">{pr.momentumValue ?? '—'}</span></div><div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pr.momentumValue ?? 0}%` }} /></div></div>
                    </div>
                  )}
                  <div className="mt-4 text-right"><span className="text-xs font-semibold text-[#2962FF]">Research →</span></div>
                </div>
              ))}
            </div>
          )}

          {/* Fallback: legacy scanner loading (only if not using pipeline) */}
          {!pipeLoading && pipelineResults.size === 0 && loading && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading scanner results">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"><div className="h-10 w-10 rounded-full bg-slate-100" /><div className="mt-5 h-4 w-1/2 rounded bg-slate-100" /><div className="mt-3 h-3 w-full rounded bg-slate-100" /></div>)}</div>}

          {scannerMessage && !loading && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">{scannerMessage}</div>
          )}

          {!loading && activeCategory && sortedResults.length === 0 && !loading && pipelineResults.size === 0 && !pipeLoading && (
            <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
              <Search className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Not enough companies match this view yet.</h3>
              <p className="mt-2 max-w-md text-xs leading-5 text-[var(--color-text-secondary)]">Try a different category or check back when more data is available.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ProductAction variant="secondary" onClick={() => setActiveCategory("")}>Browse categories</ProductAction>
                <ProductAction variant="ghost" onClick={() => productNavigate("search")}>Search company</ProductAction>
              </div>
            </ProductPanel>
          )}

          {!loading && !activeCategory && sortedResults.length === 0 && (
            <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
              <BarChart3 className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Select a category to begin</h3>
              <p className="mt-2 max-w-md text-xs leading-5 text-[var(--color-text-secondary)]">Choose a research lens above to discover companies worth reviewing.</p>
            </ProductPanel>
          )}

          {!loading && !pipeLoading && pipelineResults.size === 0 && sortedResults.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedResults.slice(0, 100).map((entry) => {
                const fullSymbol = entry.symbol;
                const item = scannerResultToResearchListItem(entry);
                const score = entry.score;
                const risky = hasRiskFlag(entry);
                const sector = item.sector;
                const signalInfo = scannerSignalLabel(score);
                const signalColor = signalInfo?.color ?? "#64748B";
                const explanation = complianceExplanation(entry);
                const performanceShadow = score !== null && score >= 65
                  ? "shadow-[0_18px_44px_rgba(22,163,74,.11)] hover:shadow-[0_24px_54px_rgba(22,163,74,.17)]"
                  : score !== null && score < 45
                    ? "shadow-[0_18px_44px_rgba(220,38,38,.10)] hover:shadow-[0_24px_54px_rgba(220,38,38,.16)]"
                    : "shadow-[0_16px_40px_rgba(30,64,175,.08)] hover:shadow-[0_22px_50px_rgba(30,64,175,.13)]";
                return (
                  <ProductPanel key={fullSymbol} as="article" className={`group relative min-h-[250px] overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition duration-300 hover:-translate-y-1 ${performanceShadow}`}>
                    <div className="absolute inset-x-5 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg,transparent,${signalColor},transparent)` }} />
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[13px] font-semibold text-[var(--color-text-muted)] tracking-[.08em]">{fullSymbol}</span>
                          <h3 className="mt-1 truncate text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)]">{item.company}</h3>
                        </div>
                        <ScoreRing score={score} size="sm" />
                      </div>

                      {sector && (
                        <div className="mt-2">
                          <span className="inline-flex rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{sector}</span>
                        </div>
                      )}

                      {item.thesis && (
                        <p className="mt-4 text-[13px] leading-5 text-[var(--color-text-secondary)] line-clamp-2">{item.thesis}</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {signalInfo && (
                          <span className="inline-flex items-center gap-1 rounded bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 text-[10px] text-[var(--color-text-primary)]">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: signalColor }} aria-hidden="true" />
                            {signalInfo.label}
                          </span>
                        )}
                        <ClassificationBadge classification={(score === null ? "INSUFFICIENT_DATA" : score >= 80 ? "EXCELLENT" : score >= 65 ? "HEALTHY" : score >= 50 ? "STABLE" : score >= 35 ? "WEAKENING" : "AT_RISK") as UnifiedClassification} />
                        {risky && (
                          <span className="inline-flex rounded bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#EF4444]">Risk rising</span>
                        )}
                      </div>

                      {/* Compliance-safe explanation */}
                      <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{explanation}</p>

                      {item.riskMarker && (
                        <p className="mt-1 text-[10px] leading-relaxed text-[#EF4444]">{item.riskMarker}</p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border-light)] pt-4">
                      <button
                        type="button"
                        onClick={() => handleResearch(fullSymbol)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2962FF] hover:gap-2 hover:text-[#1D4ED8] transition-all"
                      >
                        Research &rarr;
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCompare(fullSymbol)}
                          className="text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          Compare
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTrack(fullSymbol)}
                          className="text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                  </ProductPanel>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile filter drawer */}
        {filterDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="absolute inset-0 bg-black/60" onClick={() => setFilterDrawerOpen(false)} />
            <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--color-surface)] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Filters</h2>
                <button type="button" onClick={() => setFilterDrawerOpen(false)} className="rounded-md p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors" aria-label="Close filters">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FilterSection title="Score">
                <div className="grid gap-3 sm:max-w-xs">
                  <FilterSelect label="Score range" value={filters.scoreRange} options={SCORE_RANGES} onChange={(v) => setFilters((p) => ({ ...p, scoreRange: v }))} />
                </div>
              </FilterSection>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="mt-5 w-full rounded-lg bg-[#2962FF] py-3 text-sm font-semibold text-white hover:bg-[#3B71FF] transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        )}
      </ProductPage>
    </ProductShell>
  );
}
