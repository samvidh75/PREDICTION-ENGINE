import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Filter, Lock, Search, TrendingUp, Shield, AlertTriangle, Activity, BarChart3, Briefcase, DollarSign, X, SlidersHorizontal, ArrowUpDown, Info, ExternalLink, Bookmark, TrendingUp as InvestIcon } from "lucide-react";
import { productNavigate, ProductAction, ProductPage, ProductPanel, ProductShell, ProductStatusPill } from "../product/ProductUI";
import { api, type ScannerResultItem } from "../../services/api/client";
import { scannerResultToResearchListItem } from "../../lib/product/productViewAdapters";
import { HelpPopover } from "../ui/HelpPopover";
import { signalLabelFromScore } from "../../lib/product/signalLabels";
import { signalToneToStatusColor, toneToSeverityClass } from "../../lib/research/researchSignalModel";
import CustomSelect from "../ui/CustomSelect";
import { buildScannerViewModel } from "../../lib/product/viewModels/scannerViewModel";
import { FREE_SCANS, PREMIUM_SCANS, type ScanCatalogueEntry } from "../../lib/product/scanCatalogue";

function scannerSignalLabel(score: number | null): { label: string; color: string; toneClass: string } | null {
  const t = signalLabelFromScore(score);
  if (!t) return null;
  return { label: t.label, color: t.color, toneClass: t.toneClass === 'constructive' || t.toneClass === 'affirmative' ? 'status-dot-active' : t.toneClass === 'warning' ? 'status-dot-partial' : 'status-dot-blocked' };
}

const SCANNER_PRESETS = [
  { label: "Quality compounders", icon: Shield, filters: { qualityMin: 70, growthMin: 60 } },
  { label: "Undervalued quality", icon: DollarSign, filters: { valueMin: 65, qualityMin: 60 } },
  { label: "Improving momentum", icon: TrendingUp, filters: { momentumMin: 70 } },
  { label: "Low debt leaders", icon: Briefcase, filters: { riskMin: 60, qualityMin: 50 } },
  { label: "Earnings acceleration", icon: BarChart3, filters: { growthMin: 70 } },
  { label: "Dividend stability", icon: Shield, filters: { riskMin: 50, qualityMin: 50 } },
  { label: "Risk rising", icon: AlertTriangle, filters: { riskMax: 35 } },
  { label: "Turnaround watch", icon: Activity, filters: { qualityMin: 0, valueMin: 50, growthMin: 40 } },
  { label: "Good businesses out of favour", icon: DollarSign, filters: { qualityMin: 60, valueMin: 65 } },
  { label: "High quality, expensive", icon: BarChart3, filters: { qualityMin: 70, valueMax: 40 } },
];

const MARKET_CAP_OPTIONS = ["All", "Large", "Mid", "Small", "Micro"];
const SCORE_RANGES = ["All", "80-100", "60-79", "40-59", "Below 40"];
const FACTOR_LEVELS = ["Any", "High", "Medium", "Low"];
const DIVIDEND_OPTIONS = ["Any", "High (>4%)", "Medium (2-4%)", "Low (<2%)"];

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

export default function ScannerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScannerResultItem[]>([]);
  const [allEntries, setAllEntries] = useState<ScannerResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [scanMode, setScanMode] = useState<"free" | "premium">("free");
  const [activePreset, setActivePreset] = useState<string>("");
  const [sortValue, setSortValue] = useState("score-desc");

  const [filters, setFilters] = useState({
    marketCap: "All",
    scoreRange: "All",
    valuation: "Any",
    growth: "Any",
    profitability: "Any",
    balanceSheet: "Any",
    momentum: "Any",
    volatility: "Any",
    dividendYield: "Any",
  });

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
      activePreset
    );
  }, [query, results, loading, activePreset]);

  // Derive sectors from real data only, excluding pending/not available
  const sectors = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach((r) => {
      const sec = r.sector?.trim();
      if (
        sec &&
        sec.toLowerCase() !== "not available" &&
        sec.toLowerCase() !== "sector pending" &&
        sec.toLowerCase() !== "unavailable" &&
        sec.toLowerCase() !== "pending"
      ) {
        set.add(sec);
      }
    });
    return Array.from(set);
  }, [allEntries]);

  const fetchScanner = useCallback(async (preset: string) => {
    setLoading(true);
    try {
      const res = await api.getScanner(preset, 200);
      const data = res.data ?? [];
      setAllEntries(data);
      setResults(data);
    } catch {
      setAllEntries([]);
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchScanner(activePreset);
  }, [fetchScanner, activePreset]);

  const handleScanClick = useCallback((scan: ScanCatalogueEntry) => {
    const label = scan.title;
    if (activePreset === label) {
      fetchScanner(label);
      return;
    }
    setActivePreset(label);
    setFilters({ marketCap: "All", scoreRange: "All", valuation: "Any", growth: "Any", profitability: "Any", balanceSheet: "Any", momentum: "Any", volatility: "Any", dividendYield: "Any" });
  }, [activePreset, fetchScanner]);

  const handleTabChange = useCallback((mode: "free" | "premium") => {
    setScanMode(mode);
    setActivePreset("");
  }, []);

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

  const convictionLabel = useCallback((entry: ScannerResultItem): string => {
    const labelInfo = signalLabelFromScore(entry.score ?? null);
    return labelInfo?.label ?? "";
  }, []);

  const convictionTone = useCallback((_entry: ScannerResultItem): "verified" | "blue" | "warning" | "muted" => {
    const labelInfo = signalLabelFromScore(_entry.score ?? null);
    if (!labelInfo) return "muted";
    if (labelInfo.toneClass === 'constructive') return "verified";
    if (labelInfo.toneClass === 'affirmative') return "blue";
    if (labelInfo.toneClass === 'warning') return "warning";
    return "muted";
  }, [convictionLabel]);

  const hasRiskFlag = useCallback((entry: ScannerResultItem): boolean => {
    return entry.riskMarker !== null && entry.riskMarker !== "Risk review normal";
  }, []);

  const filteredResults = useMemo(() => {
    let filtered = [...results];
    
    // Deduplicate on symbol to satisfy uniqueness requirement
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
    return filtered;
  }, [results, filters]);

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

  const updateFilter = useCallback((key: string, value: string) => {
    setActivePreset("");
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResearch = useCallback((symbol: string) => productNavigate("stock", symbol), []);
  const handleCompare = useCallback((symbol: string) => productNavigate("compare", symbol), []);
  const handleTrack = useCallback(async (_symbol: string) => {}, []);
  const handleInvest = useCallback((symbol: string) => productNavigate("invest", symbol), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuerySubmit();
  }, [handleQuerySubmit]);

  const filterContent = (
    <div className="space-y-5">
      <FilterSection title="Score">
        <div className="grid gap-3 sm:max-w-xs">
          <FilterSelect label="Score range" value={filters.scoreRange} options={SCORE_RANGES} onChange={(v) => updateFilter("scoreRange", v)} />
        </div>
      </FilterSection>
      {sectors.length > 1 && (
        <FilterSection title="Sector">
          <FilterSelect label="Sector" value={filters.marketCap} options={["All", ...sectors]} onChange={(v) => updateFilter("marketCap", v)} />
        </FilterSection>
      )}
      <FilterSection title="Factors">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterSelect label="Valuation" value={filters.valuation} options={FACTOR_LEVELS} onChange={(v) => updateFilter("valuation", v)} />
          <FilterSelect label="Growth" value={filters.growth} options={FACTOR_LEVELS} onChange={(v) => updateFilter("growth", v)} />
          <FilterSelect label="Profitability" value={filters.profitability} options={FACTOR_LEVELS} onChange={(v) => updateFilter("profitability", v)} />
          <FilterSelect label="Balance sheet" value={filters.balanceSheet} options={FACTOR_LEVELS} onChange={(v) => updateFilter("balanceSheet", v)} />
          <FilterSelect label="Momentum" value={filters.momentum} options={FACTOR_LEVELS} onChange={(v) => updateFilter("momentum", v)} />
          <FilterSelect label="Volatility / Risk" value={filters.volatility} options={FACTOR_LEVELS} onChange={(v) => updateFilter("volatility", v)} />
        </div>
      </FilterSection>
      <FilterSection title="Dividend">
        <div className="grid gap-3 sm:max-w-xs">
          <FilterSelect label="Dividend yield" value={filters.dividendYield} options={DIVIDEND_OPTIONS} onChange={(v) => updateFilter("dividendYield", v)} />
        </div>
      </FilterSection>
    </div>
  );

  return (
    <ProductShell>
      <ProductPage>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-[28px] border border-blue-100/80 bg-[linear-gradient(125deg,rgba(255,255,255,.98),rgba(239,246,255,.88)_58%,rgba(245,243,255,.82))] px-5 py-7 shadow-[0_24px_65px_rgba(30,64,175,.10)] sm:px-7 sm:py-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-400/14 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 max-w-3xl">
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-600">Discover · step 1 of 3</div>
              <h1 className="mt-3 text-[30px] font-semibold leading-none tracking-[-.045em] text-[var(--color-text-primary)] sm:text-[38px]">Find your next research question.</h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--color-text-secondary)]">Choose one lens. We’ll organise the companies; you decide which thesis deserves a closer look.</p>
            </div>
            <div className="hidden sm:block shrink-0">
              <HelpPopover title="How to use the scanner" storageKey="scanner-help-dismissed">
                <ul className="list-inside space-y-1.5">
                  <li>• Select a strategy preset to scan by research theme</li>
                  <li>• Search by symbol, company name, or sector</li>
                  <li>• Use filters to narrow by score, valuation, or growth</li>
                  <li>• Click Research to open a company's full thesis</li>
                  <li>• Use Compare to evaluate companies side by side</li>
                </ul>
              </HelpPopover>
            </div>
            </div>
          </div>

          {/* Command-style search */}
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,.07)] focus-within:border-blue-300 focus-within:shadow-[0_16px_38px_rgba(41,98,255,.12)]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Search className="h-4 w-4" /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search symbol, company, or sector..."
              className="h-10 w-full min-w-0 bg-transparent text-[15px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
              aria-label="Search symbol, company, or sector"
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
              Scan
            </button>
          </div>

          {/* Free / Premium tab bar */}
          <div className="flex gap-0.5 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleTabChange("free")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-center text-xs font-semibold transition-all ${
                scanMode === "free"
                  ? "bg-white text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Free scans ({FREE_SCANS.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("premium")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-center text-xs font-semibold transition-all ${
                scanMode === "premium"
                  ? "bg-white text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Premium scans ({PREMIUM_SCANS.length})
              </span>
            </button>
          </div>

          {/* One guided lens grid — no competing horizontal rail. */}
          <section aria-labelledby="research-lens-title">
            <div className="mb-3 flex items-end justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--color-text-muted)]">Step 2</div><h2 id="research-lens-title" className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Choose a research lens</h2></div><span className="hidden text-xs text-[var(--color-text-muted)] sm:block">One lens at a time</span></div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            {(scanMode === "free" ? FREE_SCANS : PREMIUM_SCANS).map((scan) => {
              const active = activePreset === scan.title;
              return (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => scan.free ? handleScanClick(scan) : productNavigate("pricing")}
                  className={`group flex min-h-[76px] items-start gap-3 rounded-2xl border p-3 text-left text-xs font-semibold transition duration-200 ${
                    active
                      ? "-translate-y-0.5 border-[#2962FF] bg-[linear-gradient(145deg,#fff,#eef4ff)] text-[#1D4ED8] shadow-[0_12px_28px_rgba(41,98,255,.13)]"
                      : scan.free
                        ? "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:text-[var(--color-text-primary)] hover:shadow-md"
                        : "border-dashed border-[var(--color-border)] bg-white/60 text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${active ? "bg-blue-100 text-blue-600" : scan.free ? "bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600" : "bg-slate-50/60 text-slate-400"}`}>
                    {scan.free ? (
                      <span className="text-xs font-bold">{scan.title.charAt(0)}</span>
                    ) : (
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <span className="leading-4">{scan.title}</span>
                </button>
              );
            })}
          </div></section>

          {/* Toolbar */}
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
            <div className="hidden md:block flex-1" />
            {!loading && (
              <span className="text-[11px] text-[var(--color-text-muted)]">{sortedResults.length} result{sortedResults.length === 1 ? "" : "s"}</span>
            )}
          </div>

          {/* Advanced filters - desktop */}
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
                  {filterContent}
                </div>
              )}
            </ProductPanel>
          </div>

          <div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--color-text-muted)]">Step 3</div><h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">Review the shortlist</h2></div>{!loading && <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] shadow-sm">{sortedResults.length} companies</span>}</div>

          {/* Results */}
          {loading ? (
            <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]" role="status" aria-live="polite">Scanning companies...</div>
          ) : sortedResults.length === 0 ? (
            <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
              <Search className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">No results found</h3>
              <p className="mt-2 max-w-md text-xs leading-5 text-[var(--color-text-secondary)]">Adjust your filters or try a different search.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ProductAction variant="secondary" onClick={() => productNavigate("rankings")}>View rankings</ProductAction>
                <ProductAction variant="ghost" onClick={() => productNavigate("search")}>Search company</ProductAction>
              </div>
            </ProductPanel>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedResults.slice(0, 100).map((entry) => {
                const fullSymbol = entry.symbol;
                const item = scannerResultToResearchListItem(entry);
                const score = entry.score;
                const convLabel = convictionLabel(entry);
                const convTone = convictionTone(entry);
                const risky = hasRiskFlag(entry);
                const sector = item.sector;
                const signalInfo = scannerSignalLabel(score);
                const signalColor = signalInfo?.color ?? "#64748B";
                const performanceShadow = score !== null && score >= 65
                  ? "shadow-[0_18px_44px_rgba(22,163,74,.11)] hover:shadow-[0_24px_54px_rgba(22,163,74,.17)]"
                  : score !== null && score < 45
                    ? "shadow-[0_18px_44px_rgba(220,38,38,.10)] hover:shadow-[0_24px_54px_rgba(220,38,38,.16)]"
                    : "shadow-[0_16px_40px_rgba(30,64,175,.08)] hover:shadow-[0_22px_50px_rgba(30,64,175,.13)]";
                return (
                  <ProductPanel key={fullSymbol} as="article" className={`group relative min-h-[250px] overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-white p-5 transition duration-300 hover:-translate-y-1 ${performanceShadow}`}>
                    <div className="absolute inset-x-5 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg,transparent,${signalColor},transparent)` }} />
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[13px] font-semibold text-[var(--color-text-muted)] tracking-[.08em]">{fullSymbol}</span>
                          <h3 className="mt-1 truncate text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)]">{item.company}</h3>
                        </div>
                        {score !== null && (
                          <div className="flex flex-col items-end shrink-0">
                            <span className="grid h-11 min-w-11 place-items-center rounded-2xl bg-slate-50 px-2 font-mono text-base font-semibold tabular-nums text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_var(--color-border)]">{Math.round(score)}</span>
                          </div>
                        )}
                      </div>

                      {sector && (
                        <div className="mt-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{sector}</span>
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
                        {risky && (
                          <span className="inline-flex rounded bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#EF4444]">Risk rising</span>
                        )}
                      </div>

                      {item.keyReason && (
                        <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{item.keyReason}</p>
                      )}
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
              {filterContent}
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
