import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Filter, Search, TrendingUp, Shield, AlertTriangle, Activity, BarChart3, Briefcase, DollarSign } from "lucide-react";
import { productNavigate, ProductAction, ProductPage, ProductPanel, ProductShell, ProductStatusPill } from "../product/ProductUI";
import { api, type LeaderboardEntry } from "../../services/api/client";
import { TokenStore } from "../../services/brokers/TokenStore";

const SCANNER_PRESETS = [
  { label: "Quality compounders", icon: Shield, filters: { qualityMin: 70, growthMin: 60 } },
  { label: "Undervalued quality", icon: DollarSign, filters: { valueMin: 65, qualityMin: 60 } },
  { label: "Improving momentum", icon: TrendingUp, filters: { momentumMin: 70 } },
  { label: "Low debt leaders", icon: Briefcase, filters: { riskMin: 60, qualityMin: 50 } },
  { label: "Earnings acceleration", icon: BarChart3, filters: { growthMin: 70 } },
  { label: "Turnaround watch", icon: Activity, filters: { qualityMin: 0, valueMin: 50, growthMin: 40 } },
  { label: "Risk rising", icon: AlertTriangle, filters: { riskMax: 35 } },
];

const MARKET_CAP_OPTIONS = ["All", "Large", "Mid", "Small", "Micro"];
const SECTOR_OPTIONS = ["All", "Automobile", "Banking", "Cement", "Chemicals", "Consumer", "Energy", "Financials", "FMCG", "Healthcare", "IT", "Media", "Metals", "Pharmaceuticals", "Power", "Real Estate", "Retail", "Telecom", "Textiles"];
const SCORE_RANGES = ["All", "80-100", "60-79", "40-59", "Below 40"];
const FACTOR_LEVELS = ["Any", "High", "Medium", "Low"];

export default function ScannerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeaderboardEntry[]>([]);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

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
  });

  const [brokerConnected, setBrokerConnected] = useState(false);

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
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = window.localStorage.getItem("ss_uid");
    if (uid) {
      const brokers = TokenStore.getConnectedBrokers(uid);
      setBrokerConnected(brokers.length > 0);
    }
  }, []);

  const handlePresetClick = useCallback((label: string) => {
    if (activePreset === label) {
      setActivePreset(null);
      setFilters({ marketCap: "All", sector: "All", scoreRange: "All", valuation: "Any", growth: "Any", profitability: "Any", balanceSheet: "Any", momentum: "Any", volatility: "Any" });
      setResults(allEntries);
      return;
    }
    setActivePreset(label);
    setFilters({ marketCap: "All", sector: "All", scoreRange: "All", valuation: "Any", growth: "Any", profitability: "Any", balanceSheet: "Any", momentum: "Any", volatility: "Any" });
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

  const generateThesis = useCallback((entry: LeaderboardEntry): string => {
    const sector = entry.sector ?? "diversified";
    const score = entry.rankingScore ?? 50;
    if (score >= 70) return `Leading ${sector} company with strong quality metrics`;
    if (score >= 55) return `Improving momentum in ${sector} sector`;
    if (score >= 40) return `${sector} company with developing fundamentals`;
    return `${sector} company under evaluation`;
  }, []);

  const generateKeyReason = useCallback((entry: LeaderboardEntry): string => {
    const factors = entry.factors;
    const entries = Object.entries(factors).filter(([, v]) => v !== null && v !== undefined) as [string, number][];
    if (entries.length === 0) return "Not enough information";
    entries.sort(([, a], [, b]) => b - a);
    const [topKey, topVal] = entries[0];
    const factorLabel = topKey === "quality" ? "Quality" : topKey === "growth" ? "Growth" : topKey === "value" ? "Valuation" : topKey === "momentum" ? "Momentum" : topKey === "risk" ? "Risk profile" : topKey === "sector" ? "Sector strength" : topKey;
    if (topVal >= 70) return `Strong ${factorLabel.toLowerCase()} score (${Math.round(topVal)})`;
    if (topVal >= 50) return `Adequate ${factorLabel.toLowerCase()} score (${Math.round(topVal)})`;
    return `${factorLabel} at ${Math.round(topVal)}`;
  }, []);

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

  const updateFilter = useCallback((key: string, value: string) => {
    setActivePreset(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResearch = useCallback((symbol: string) => {
    productNavigate("stock", symbol);
  }, []);

  const handleCompare = useCallback((symbol: string) => {
    productNavigate("compare", symbol);
  }, []);

  const handleTrack = useCallback(async (symbol: string) => {
    try {
      const watchlists = await api.getWatchlists();
      if (watchlists.length > 0) {
        await api.addWatchlistTicker(watchlists[0].id, symbol);
      }
    } catch {
    }
  }, []);

  const handleInvest = useCallback((symbol: string) => {
    productNavigate("invest", symbol);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuerySubmit();
  }, [handleQuerySubmit]);

  return (
    <ProductShell>
      <ProductPage>
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-lg font-semibold text-[#E6EDF3]">Scanner</h1>
            <p className="mt-0.5 text-xs text-[#9AA7B5]">Discover companies matching your criteria</p>
          </div>

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
              >
                <Search className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleQuerySubmit}
              className="shrink-0 rounded-md border border-[rgba(148,163,184,0.2)] bg-[#111827] px-3 py-1.5 text-[11px] font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
            >
              Scan
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SCANNER_PRESETS.map((preset) => {
              const active = activePreset === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset.label)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
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
              <div className="grid gap-4 border-t border-[rgba(148,163,184,0.08)] px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Market cap</label>
                  <select
                    value={filters.marketCap}
                    onChange={(e) => updateFilter("marketCap", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {MARKET_CAP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Sector</label>
                  <select
                    value={filters.sector}
                    onChange={(e) => updateFilter("sector", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {SECTOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Score range</label>
                  <select
                    value={filters.scoreRange}
                    onChange={(e) => updateFilter("scoreRange", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {SCORE_RANGES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Valuation</label>
                  <select
                    value={filters.valuation}
                    onChange={(e) => updateFilter("valuation", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {FACTOR_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Growth</label>
                  <select
                    value={filters.growth}
                    onChange={(e) => updateFilter("growth", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {FACTOR_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Profitability</label>
                  <select
                    value={filters.profitability}
                    onChange={(e) => updateFilter("profitability", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {FACTOR_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Balance sheet</label>
                  <select
                    value={filters.balanceSheet}
                    onChange={(e) => updateFilter("balanceSheet", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {FACTOR_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Momentum</label>
                  <select
                    value={filters.momentum}
                    onChange={(e) => updateFilter("momentum", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {FACTOR_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#9AA7B5]">Volatility</label>
                  <select
                    value={filters.volatility}
                    onChange={(e) => updateFilter("volatility", e.target.value)}
                    className="h-9 w-full rounded-md border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 text-[11px] text-[#E6EDF3] outline-none"
                  >
                    {FACTOR_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            )}
          </ProductPanel>

          {loading ? (
            <div className="py-12 text-center text-sm text-[#9AA7B5]" role="status" aria-live="polite">Scanning companies...</div>
          ) : filteredResults.length === 0 ? (
            <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
              <Search className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">No results found</h3>
              <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">Adjust your filters or try a different search</p>
            </ProductPanel>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-[#9AA7B5]">
                {filteredResults.length} result{filteredResults.length === 1 ? "" : "s"} found
              </div>
              {filteredResults.slice(0, 50).map((entry) => {
                const fullSymbol = entry.symbol;
                const label = entry.companyName || fullSymbol;
                const thesis = generateThesis(entry);
                const reason = generateKeyReason(entry);
                const score = entry.rankingScore;
                const convLabel = convictionLabel(entry);
                const convTone = convictionTone(entry);
                return (
                  <ProductPanel key={fullSymbol} as="article" className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-[#E6EDF3]">{fullSymbol}</span>
                          {entry.rank && (
                            <span className="text-[10px] font-medium text-[#64748B]">#{entry.rank}</span>
                          )}
                          <ProductStatusPill tone={convTone}>{convLabel}</ProductStatusPill>
                          {score !== null && (
                            <ProductStatusPill tone="blue">{Math.round(score)}</ProductStatusPill>
                          )}
                        </div>
                        {entry.companyName && (
                          <p className="mt-0.5 truncate text-xs text-[#9AA7B5]">{entry.companyName}</p>
                        )}
                        <p className="mt-2 text-xs leading-5 text-[#E6EDF3]">{thesis}</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-[#64748B]">{reason}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[rgba(148,163,184,0.08)] pt-3">
                      <ProductAction variant="primary" onClick={() => handleResearch(fullSymbol)}>
                        Research
                      </ProductAction>
                      <ProductAction variant="secondary" onClick={() => handleCompare(fullSymbol)}>
                        Compare
                      </ProductAction>
                      <ProductAction variant="ghost" onClick={() => handleTrack(fullSymbol)}>
                        Track
                      </ProductAction>
                      {brokerConnected && (
                        <ProductAction variant="ghost" onClick={() => handleInvest(fullSymbol)}>
                          Invest
                        </ProductAction>
                      )}
                    </div>
                  </ProductPanel>
                );
              })}
            </div>
          )}
        </div>
      </ProductPage>
    </ProductShell>
  );
}
