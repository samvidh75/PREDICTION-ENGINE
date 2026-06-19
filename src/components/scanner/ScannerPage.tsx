import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Filter, Search, TrendingUp, Shield, AlertTriangle, Activity, BarChart3, Briefcase, DollarSign, X, SlidersHorizontal, ArrowUpDown, Info } from "lucide-react";
import { productNavigate, ProductAction, ProductPage, ProductPanel, ProductShell, ProductStatusPill } from "../product/ProductUI";
import { api, type LeaderboardEntry } from "../../services/api/client";
import { leaderboardEntryToResearchListItem } from "../../lib/product/productViewAdapters";

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
const SECTOR_OPTIONS = ["All", "Automobile", "Banking", "Cement", "Chemicals", "Consumer", "Energy", "Financials", "FMCG", "Healthcare", "IT", "Media", "Metals", "Pharmaceuticals", "Power", "Real Estate", "Retail", "Telecom", "Textiles"];
const SCORE_RANGES = ["All", "80-100", "60-79", "40-59", "Below 40"];
const FACTOR_LEVELS = ["Any", "High", "Medium", "Low"];
const DIVIDEND_OPTIONS = ["Any", "High (>4%)", "Medium (2-4%)", "Low (<2%)"];

const SORT_OPTIONS = [
  { value: "score-desc", label: "Score \u2193" },
  { value: "score-asc", label: "Score \u2191" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
] as const;

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2 text-[11px] text-[#E6EDF3] outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{title}</h4>
      {children}
    </div>
  );
}

export default function ScannerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeaderboardEntry[]>([]);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState("score-desc");
  const [brokerConnected] = useState(false);

  const [filters, setFilters] = useState({
    marketCap: "All",
    sector: "All",
    scoreRange: "All",
    valuation: "Any",
    growth: "Any",
    profitability: "Any",
    balanceSheet: "Any",
    momentum: "Any",
    volatility: "Any",
    dividendYield: "Any",
  });

  useEffect(() => {
    let cancelled = false;
    api.getLeaderboard(200)
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? [];
        setAllEntries(data);
        setResults(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handlePresetClick = useCallback((label: string) => {
    if (activePreset === label) {
      setActivePreset(null);
      setFilters({ marketCap: "All", sector: "All", scoreRange: "All", valuation: "Any", growth: "Any", profitability: "Any", balanceSheet: "Any", momentum: "Any", volatility: "Any", dividendYield: "Any" });
      setResults(allEntries);
      return;
    }
    setActivePreset(label);
    setFilters({ marketCap: "All", sector: "All", scoreRange: "All", valuation: "Any", growth: "Any", profitability: "Any", balanceSheet: "Any", momentum: "Any", volatility: "Any", dividendYield: "Any" });
    const preset = SCANNER_PRESETS.find((p) => p.label === label);
    if (!preset) return;
    const f = preset.filters;
    const filtered = allEntries.filter((e) => {
      if (f.qualityMin !== undefined && (e.factors.quality ?? 0) < f.qualityMin) return false;
      if (f.growthMin !== undefined && (e.factors.growth ?? 0) < f.growthMin) return false;
      if (f.valueMin !== undefined && (e.factors.value ?? 0) < f.valueMin) return false;
      if (f.momentumMin !== undefined && (e.factors.momentum ?? 0) < f.momentumMin) return false;
      if (f.riskMin !== undefined && (e.factors.risk ?? 0) < f.riskMin) return false;
      if (f.riskMax !== undefined && (e.factors.risk ?? 100) > f.riskMax) return false;
      if (f.valueMax !== undefined && (e.factors.value ?? 100) > f.valueMax) return false;
      return true;
    });
    setResults(filtered);
  }, [activePreset, allEntries]);

  const handleQuerySubmit = useCallback(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setResults(allEntries);
      return;
    }
    const filtered = allEntries.filter((e) =>
      e.companyName?.toLowerCase().includes(trimmed) ||
      e.symbol?.toLowerCase().includes(trimmed) ||
      e.sector?.toLowerCase().includes(trimmed) ||
      e.industry?.toLowerCase().includes(trimmed)
    );
    setResults(filtered);
  }, [query, allEntries]);

  const convictionLabel = useCallback((entry: LeaderboardEntry): string => {
    const score = entry.rankingScore ?? null;
    const confidence = entry.confidenceScore ?? null;
    if (score === null && confidence === null) return "Insufficient data";
    if (score !== null && score >= 75 && confidence !== null && confidence >= 70) return "High conviction";
    if (score !== null && score >= 55 && confidence !== null && confidence >= 50) return "Moderate conviction";
    if (score !== null && score >= 40) return "Developing";
    return "Speculative";
  }, []);

  const convictionTone = useCallback((entry: LeaderboardEntry): "verified" | "blue" | "warning" | "muted" => {
    const label = convictionLabel(entry);
    if (label === "High conviction") return "verified";
    if (label === "Moderate conviction") return "blue";
    if (label === "Developing") return "warning";
    return "muted";
  }, [convictionLabel]);

  const hasRiskFlag = useCallback((entry: LeaderboardEntry): boolean => {
    const risk = entry.factors.risk;
    return risk !== null && risk !== undefined && risk < 40;
  }, []);

  const filteredResults = useMemo(() => {
    let filtered = [...results];
    if (filters.sector !== "All") {
      filtered = filtered.filter((e) => e.sector === filters.sector);
    }
    if (filters.scoreRange !== "All") {
      filtered = filtered.filter((e) => {
        if (e.rankingScore === null || e.rankingScore === undefined) return false;
        if (filters.scoreRange === "80-100") return e.rankingScore >= 80;
        if (filters.scoreRange === "60-79") return e.rankingScore >= 60 && e.rankingScore < 80;
        if (filters.scoreRange === "40-59") return e.rankingScore >= 40 && e.rankingScore < 60;
        if (filters.scoreRange === "Below 40") return e.rankingScore < 40;
        return true;
      });
    }
    const factorFilter = (key: keyof typeof filters, factorKey: keyof LeaderboardEntry["factors"]) => {
      const val = filters[key];
      if (val === "Any") return;
      filtered = filtered.filter((e) => {
        const fv = e.factors[factorKey];
        if (fv === null || fv === undefined) return false;
        if (val === "High") return fv >= 65;
        if (val === "Medium") return fv >= 40 && fv < 65;
        if (val === "Low") return fv < 40;
        return true;
      });
    };
    factorFilter("valuation", "value");
    factorFilter("growth", "growth");
    factorFilter("profitability", "quality");
    factorFilter("balanceSheet", "risk");
    factorFilter("momentum", "momentum");
    return filtered;
  }, [results, filters]);

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    const [field, dir] = sortValue.split("-") as [string, string];
    sorted.sort((a, b) => {
      if (field === "score") {
        const sa = a.rankingScore ?? 0;
        const sb = b.rankingScore ?? 0;
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
    setActivePreset(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResearch = useCallback((symbol: string) => productNavigate("stock", symbol), []);
  const handleCompare = useCallback((symbol: string) => productNavigate("compare", symbol), []);
  const handleTrack = useCallback(async (symbol: string) => {
    try {
      const watchlists = await api.getWatchlists();
      if (watchlists.length > 0) await api.addWatchlistTicker(watchlists[0].id, symbol);
    } catch { /* quiet */ }
  }, []);
  const handleInvest = useCallback((symbol: string) => productNavigate("invest", symbol), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuerySubmit();
  }, [handleQuerySubmit]);

  const filterContent = (
    <div className="space-y-5">
      <FilterSection title="Company">
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterSelect label="Market cap" value={filters.marketCap} options={MARKET_CAP_OPTIONS} onChange={(v) => updateFilter("marketCap", v)} />
          <FilterSelect label="Sector" value={filters.sector} options={SECTOR_OPTIONS} onChange={(v) => updateFilter("sector", v)} />
        </div>
      </FilterSection>
      <FilterSection title="Score">
        <div className="grid gap-3 sm:max-w-xs">
          <FilterSelect label="Score range" value={filters.scoreRange} options={SCORE_RANGES} onChange={(v) => updateFilter("scoreRange", v)} />
        </div>
      </FilterSection>
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
          <div>
            <h1 className="text-lg font-semibold text-[#E6EDF3]">Find companies worth researching.</h1>
            <p className="mt-0.5 text-xs text-[#9AA7B5]">Describe what you are looking for or browse by strategy.</p>
          </div>

          {/* Micro-guide */}
          <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.02)]">
            <button
              type="button"
              onClick={() => setGuideOpen(!guideOpen)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-medium text-[#9AA7B5]">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                How to use the scanner
              </span>
              {guideOpen ? <ChevronUp className="h-3 w-3 text-[#9AA7B5]" /> : <ChevronDown className="h-3 w-3 text-[#9AA7B5]" />}
            </button>
            {guideOpen && (
              <div className="border-t border-[rgba(148,163,184,0.08)] px-3 py-3 text-[11px] leading-5 text-[#9AA7B5] space-y-2">
                <p><strong className="text-[#E6EDF3]">Search</strong> — Type a name, symbol, or sector to find specific companies.</p>
                <p><strong className="text-[#E6EDF3]">Strategies</strong> — Click a preset to instantly filter by theme. Click again to clear.</p>
                <p><strong className="text-[#E6EDF3]">Filters</strong> — Narrow by market cap, sector, scores, and fundamental factors.</p>
                <p><strong className="text-[#E6EDF3]">Sort</strong> — Reorder results by score or name.</p>
                <p><strong className="text-[#E6EDF3]">Actions</strong> — Research in detail, Compare across peers, Track in watchlist, or Invest.</p>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[#9AA7B5]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you're looking for..."
              className="h-9 w-full min-w-0 bg-transparent text-sm text-[#E6EDF3] outline-none placeholder:text-[#9AA7B5]"
              aria-label="Describe what you're looking for"
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

          {/* Presets - scrollable row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
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
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors md:hidden"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort & Filter
            </button>
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B] font-medium uppercase tracking-wider">Sort</span>
              <select
                value={sortValue}
                onChange={(e) => setSortValue(e.target.value)}
                className="h-7 rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2 text-[11px] text-[#E6EDF3] outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
                  Advanced Filters
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
            </ProductPanel>
          ) : (
            <div className="space-y-2">
              <div className="hidden max-md:flex text-xs text-[#9AA7B5]">
                {sortedResults.length} result{sortedResults.length === 1 ? "" : "s"} found
              </div>
              {sortedResults.slice(0, 50).map((entry) => {
                const fullSymbol = entry.symbol;
                const item = leaderboardEntryToResearchListItem(entry);
                const score = entry.rankingScore;
                const convLabel = convictionLabel(entry);
                const convTone = convictionTone(entry);
                const risky = hasRiskFlag(entry);
                const sector = item.sector;
                return (
                  <ProductPanel key={fullSymbol} as="article" className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-sm font-semibold text-[#E6EDF3]">{fullSymbol}</span>
                          {sector && (
                            <span className="rounded-sm bg-[rgba(148,163,184,0.08)] px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">{sector}</span>
                          )}
                          {entry.rank && (
                            <span className="text-[10px] font-medium text-[#64748B]">#{entry.rank}</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-[#9AA7B5]">{item.company}</p>
                        <p className="mt-1.5 text-xs leading-5 text-[#E6EDF3]">{item.thesis}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <ProductStatusPill tone={convTone}>{convLabel}</ProductStatusPill>
                          {score !== null && (
                            <ProductStatusPill tone="blue">{Math.round(score)}</ProductStatusPill>
                          )}
                          {risky && (
                            <ProductStatusPill tone="warning">Risk flag</ProductStatusPill>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-4 text-[#64748B]">{item.keyReason}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[rgba(148,163,184,0.08)] pt-2">
                      <ProductAction variant="primary" onClick={() => handleResearch(fullSymbol)}>Research</ProductAction>
                      <ProductAction variant="secondary" onClick={() => handleCompare(fullSymbol)}>Compare</ProductAction>
                      <ProductAction variant="ghost" onClick={() => handleTrack(fullSymbol)}>Track</ProductAction>
                      <ProductAction variant="ghost" onClick={() => handleInvest(fullSymbol)} disabled={!brokerConnected} disabledReason={!brokerConnected ? "Broker handoff being prepared" : undefined}>Invest</ProductAction>
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
