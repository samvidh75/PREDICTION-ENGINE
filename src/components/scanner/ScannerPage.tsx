import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Filter, Search, TrendingUp, Shield, AlertTriangle, Activity, BarChart3, Briefcase, DollarSign, X, SlidersHorizontal, ArrowUpDown, Info, ExternalLink, Bookmark, TrendingUp as InvestIcon } from "lucide-react";
import { productNavigate, ProductAction, ProductPage, ProductPanel, ProductShell, ProductStatusPill } from "../product/ProductUI";
import { api, type ScannerResultItem } from "../../services/api/client";
import { scannerResultToResearchListItem } from "../../lib/product/productViewAdapters";
import { HelpPopover } from "../ui/HelpPopover";
import { signalToneToStatusColor, toneToSeverityClass } from "../../lib/research/researchSignalModel";
import CustomSelect from "../ui/CustomSelect";
import { buildScannerViewModel } from "../../lib/product/viewModels/scannerViewModel";

function scannerSignalLabel(score: number | null): { label: string; color: string; toneClass: string } | null {
  if (score === null) return null;
  if (score >= 75) return { label: "Very Healthy", color: "#16A34A", toneClass: "status-dot-active" };
  if (score >= 55) return { label: "Healthy", color: "#2962FF", toneClass: "status-dot-active" };
  if (score >= 40) return { label: "Unhealthy", color: "#F59E0B", toneClass: "status-dot-partial" };
  return { label: "Very Unhealthy", color: "#EF4444", toneClass: "status-dot-blocked" };
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
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">{label}</label>
      <div className="relative">
        <CustomSelect
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full cursor-pointer rounded-lg border border-white/[0.08] bg-[#0D1117] px-3 py-1.5 pr-8 text-xs text-[#E6EDF3] outline-none transition-colors hover:border-[#2962FF]/50 focus:border-[#2962FF] focus:outline-none focus:ring-1 focus:ring-[#2962FF]"
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
      <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B]">{title}</h4>
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
  const [activePreset, setActivePreset] = useState<string>("Quality compounders");
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

  const handlePresetClick = useCallback((label: string) => {
    if (activePreset === label) {
      fetchScanner(label);
      return;
    }
    setActivePreset(label);
    setFilters({ marketCap: "All", scoreRange: "All", valuation: "Any", growth: "Any", profitability: "Any", balanceSheet: "Any", momentum: "Any", volatility: "Any", dividendYield: "Any" });
  }, [activePreset, fetchScanner]);

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
    const score = entry.score ?? null;
    if (score === null) return "";
    if (score >= 75) return "Very Healthy";
    if (score >= 55) return "Healthy";
    if (score >= 40) return "Unhealthy";
    return "Very Unhealthy";
  }, []);

  const convictionTone = useCallback((_entry: ScannerResultItem): "verified" | "blue" | "warning" | "muted" => {
    const label = convictionLabel(_entry);
    if (label === "Very Healthy") return "verified";
    if (label === "Healthy") return "blue";
    if (label === "Unhealthy") return "warning";
    return "muted";
  }, [convictionLabel]);

  const hasRiskFlag = useCallback((entry: ScannerResultItem): boolean => {
    return entry.riskMarker !== null && entry.riskMarker !== "Risk review normal";
  }, []);

  const filteredResults = useMemo(() => {
    let filtered = [...results];
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
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[#E6EDF3]">Research scanner</h1>
              <p className="mt-1 text-sm text-[#9AA7B5]">Discover companies worth researching. Select a strategy, search by name, or filter by fundamentals.</p>
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

          {/* Command-style search */}
          <div className="flex items-center gap-3 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[#9AA7B5]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search symbol, company, or sector..."
              className="h-9 w-full min-w-0 bg-transparent text-sm text-[#E6EDF3] outline-none placeholder:text-[#9AA7B5]"
              aria-label="Search symbol, company, or sector"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults(allEntries); }}
                className="mr-1 shrink-0 rounded p-0.5 text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleQuerySubmit}
              className="shrink-0 rounded-md bg-[#2962FF] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3B71FF] transition-colors"
            >
              Scan
            </button>
          </div>

          {/* Strategy presets - dark styled horizontal chip rail with hidden scrollbar */}
          <div className="scrollbar-none -mx-4 flex items-center gap-1.5 overflow-x-auto px-4">
            {SCANNER_PRESETS.map((preset) => {
              const active = activePreset === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset.label)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    active
                      ? "border-[#2962FF] bg-[rgba(41,98,255,0.12)] text-[#E6EDF3]"
                      : "border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] text-[#9AA7B5] hover:border-[rgba(148,163,184,0.3)] hover:text-[#E6EDF3]"
                  }`}
                >
                  <preset.icon className="h-3 w-3" aria-hidden="true" />
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors md:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {advancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Sort</span>
              <div className="relative">
                <CustomSelect
                  value={sortValue}
                  onChange={(e) => setSortValue(e.target.value)}
                  className="h-8 cursor-pointer rounded-lg border border-white/[0.08] bg-[#0D1117] px-2.5 py-1 text-xs text-[#E6EDF3] outline-none transition-colors hover:border-[#2962FF]/50 focus:border-[#2962FF]"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </CustomSelect>
              </div>
            </div>
            <div className="hidden md:block flex-1" />
            {!loading && (
              <span className="text-[11px] text-[#64748B]">{sortedResults.length} result{sortedResults.length === 1 ? "" : "s"}</span>
            )}
          </div>

          {/* Advanced filters - desktop */}
          <div className="hidden md:block">
            <ProductPanel className="overflow-hidden">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-[#E6EDF3] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-[#9AA7B5]" aria-hidden="true" />
                  Advanced filters
                </span>
                {advancedOpen ? <ChevronUp className="h-3.5 w-3.5 text-[#9AA7B5]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#9AA7B5]" />}
              </button>
              {advancedOpen && (
                <div className="border-t border-[rgba(148,163,184,0.08)] px-4 py-4">
                  {filterContent}
                </div>
              )}
            </ProductPanel>
          </div>

          {/* Results */}
          {loading ? (
            <div className="py-12 text-center text-sm text-[#9AA7B5]" role="status" aria-live="polite">Scanning companies...</div>
          ) : sortedResults.length === 0 ? (
            <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
              <Search className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">No results found</h3>
              <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">Adjust your filters or try a different search.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ProductAction variant="secondary" onClick={() => productNavigate("rankings")}>View rankings</ProductAction>
                <ProductAction variant="ghost" onClick={() => productNavigate("search")}>Search company</ProductAction>
              </div>
            </ProductPanel>
          ) : (
            <div className="space-y-2">
              <div className="hidden max-md:flex text-xs text-[#9AA7B5]">
                {sortedResults.length} result{sortedResults.length === 1 ? "" : "s"} found
              </div>
              {sortedResults.slice(0, 50).map((entry) => {
                const fullSymbol = entry.symbol;
                const item = scannerResultToResearchListItem(entry);
                const score = entry.score;
                const convLabel = convictionLabel(entry);
                const convTone = convictionTone(entry);
                const risky = hasRiskFlag(entry);
                const sector = item.sector;
                const signalInfo = scannerSignalLabel(score);
                const signalColor = signalInfo?.color ?? "#64748B";
                return (
                  <ProductPanel key={fullSymbol} as="article" className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-base font-semibold text-[#E6EDF3]">{fullSymbol}</span>
                          {entry.rank && (
                            <span className="text-[10px] font-medium text-[#64748B]">#{entry.rank}</span>
                          )}
                        </div>
                        <p className="truncate text-sm text-[#9AA7B5]">{item.company}</p>
                        {item.thesis && (
                          <p className="mt-1.5 text-xs leading-5 text-[#E6EDF3]">{item.thesis}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {sector && (
                            <span className="rounded-sm bg-[rgba(148,163,184,0.08)] px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">{sector}</span>
                          )}
                          {signalInfo && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: `${signalColor}33`, backgroundColor: `${signalColor}15`, color: signalColor }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: signalColor }} aria-hidden="true" />
                              {signalInfo.label}
                            </span>
                          )}
                          {score !== null && (
                            <ProductStatusPill tone="blue">{Math.round(score)}</ProductStatusPill>
                          )}
                          {risky && (
                            <ProductStatusPill tone="warning">Risk rising</ProductStatusPill>
                          )}
                        </div>
                        {item.keyReason && (
                          <p className="mt-1 text-[11px] leading-4 text-[#64748B]">{item.keyReason}</p>
                        )}
                        {item.riskMarker && (
                          <p className="mt-1 text-[11px] leading-4 text-[#EF4444]">{item.riskMarker}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[rgba(148,163,184,0.08)] pt-3">
                      <button
                        type="button"
                        onClick={() => handleResearch(fullSymbol)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#2962FF] bg-[rgba(41,98,255,0.12)] px-3 text-[11px] font-semibold text-white hover:bg-[rgba(41,98,255,0.2)] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        Research
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompare(fullSymbol)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                      >
                        Compare
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTrack(fullSymbol)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                      >
                        <Bookmark className="h-3 w-3" aria-hidden="true" />
                        Track
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInvest(fullSymbol)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                      >
                        Invest
                      </button>
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
            <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-[#0D1117] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#E6EDF3]">Filters</h2>
                <button type="button" onClick={() => setFilterDrawerOpen(false)} className="rounded-md p-1 text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors" aria-label="Close filters">
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
