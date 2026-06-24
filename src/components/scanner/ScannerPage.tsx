import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, TrendingUp, BarChart3, RefreshCw, Sparkles, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { productNavigate } from "../product/ProductUI";
import { api, type ScannerResultItem } from "../../services/api/client";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { NIFTY50_SYMBOLS } from "../../services/universe/StockUniverse";
import { fPrice, fChange } from "../../lib/format";
import { getCurrentPlan, canViewPremiumScans } from "../../lib/product/planAccess";
import { runCompanyDataPipeline } from "../../services/data/CompanyDataPipeline";
import SebiDisclaimer from "../compliance/SebiDisclaimer";

import {
  PremiumAppShell, PremiumTopNav, MarketTickerStrip, PremiumCard, ScoreRing,
  ScannerFilterRail, ScannerResultsTable, RightInsightRail, FactorBar,
  EmptyProductState, MethodologyNote,
} from "../../premium/PremiumComponents";

const SS = {
  bg: "var(--ss-bg)",
  surface: "var(--ss-surface)",
  ink: "var(--ss-ink)",
  ink2: "var(--ss-ink-2)",
  ink3: "var(--ss-ink-3)",
  ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)",
  borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)",
  positiveSoft: "var(--ss-positive-soft)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
  shadowCard: "var(--ss-shadow-card)",
  container: "var(--ss-container)",
};

interface PipelineRow {
  symbol: string; companyName: string; sector: string | null;
  score: number | null; price: string | null; change: string | null; changePositive: boolean | null;
  qualityValue: number | null; growthValue: number | null;
  momentumValue: number | null; valuationValue: number | null; riskValue: number | null;
}

const DEFAULT_SYMBOLS = NIFTY50_SYMBOLS.slice(0, 20);

function rowClassification(score: number | null): string {
  if (score === null) return "INSUFFICIENT_DATA";
  if (score >= 80) return "EXCELLENT";
  if (score >= 65) return "HEALTHY";
  if (score >= 50) return "STABLE";
  if (score >= 35) return "WEAKENING";
  return "AT_RISK";
}

export default function ScannerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScannerResultItem[]>([]);
  const [allEntries, setAllEntries] = useState<ScannerResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pipelineResults, setPipelineResults] = useState<Map<string, PipelineRow>>(new Map());
  const [pipeLoading, setPipeLoading] = useState(false);
  const [skeletonCount, setSkeletonCount] = useState(0);
  const [sortValue, setSortValue] = useState("score-desc");
  const [filters, setFilters] = useState<Record<string, string>>({
    universe: "All", scoreRange: "All", sector: "All", quality: "All",
    growth: "All", valuation: "All", momentum: "All", marketCap: "All", risk: "All",
  });

  const plan = getCurrentPlan();
  const isPremium = canViewPremiumScans(plan);
  const pipelineRef = useRef(false);
  const defaultLoadedRef = useRef(false);

  const runPipeline = useCallback(async () => {
    if (pipelineRef.current) return;
    pipelineRef.current = true;
    setPipeLoading(true);
    setSkeletonCount(10);
    setPipelineResults(new Map());

    const symbols = DEFAULT_SYMBOLS;
    const resultsMap = new Map<string, PipelineRow>();

    for (const sym of symbols) {
      try {
        const p = await runCompanyDataPipeline(sym);
        const score = p.prediction?.rankingScore ?? p.prediction?.healthScore ?? 50;
        const qv = p.prediction?.factorScores?.find(f => f.group === "quality")?.value ?? null;
        const gv = p.prediction?.factorScores?.find(f => f.group === "growth")?.value ?? null;
        const mv = p.prediction?.factorScores?.find(f => f.group === "momentum")?.value ?? null;
        const vv = p.prediction?.factorScores?.find(f => f.group === "valuation")?.value ?? null;
        const rv = p.prediction?.factorScores?.find(f => f.group === "risk")?.value ?? null;
        const changeVal = p.price.change;
        resultsMap.set(sym, {
          symbol: sym, companyName: p.companyName ?? sym, sector: null,
          score, price: p.price.current !== null ? fPrice(p.price.current) : null,
          change: changeVal !== null ? fChange(changeVal) : null,
          changePositive: changeVal !== null ? changeVal >= 0 : null,
          qualityValue: qv, growthValue: gv, momentumValue: mv,
          valuationValue: vv, riskValue: rv,
        });
      } catch { /* skip */ }
      setPipelineResults(new Map(resultsMap));
      setSkeletonCount(Math.max(0, 10 - resultsMap.size));
    }
    setSkeletonCount(0);
    setPipeLoading(false);
    pipelineRef.current = false;
  }, []);

  useEffect(() => {
    if (!defaultLoadedRef.current && pipelineResults.size === 0 && !pipeLoading) {
      defaultLoadedRef.current = true;
      runPipeline();
    }
  }, [runPipeline, pipelineResults.size, pipeLoading]);

  const handleRunScan = useCallback(() => {
    defaultLoadedRef.current = false;
    setPipelineResults(new Map());
    runPipeline();
  }, [runPipeline]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredRows = useMemo(() => {
    const arr = Array.from(pipelineResults.values());
    let filtered = [...arr];
    if (filters.scoreRange !== "All") {
      filtered = filtered.filter(r => {
        const s = r.score ?? -1;
        if (filters.scoreRange === "80-100") return s >= 80;
        if (filters.scoreRange === "60-79") return s >= 60 && s < 80;
        if (filters.scoreRange === "40-59") return s >= 40 && s < 60;
        if (filters.scoreRange === "Below 40") return s < 40;
        return true;
      });
    }
    if (filters.sector !== "All") {
      filtered = filtered.filter(r => r.sector === filters.sector);
    }
    return filtered;
  }, [pipelineResults, filters]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    const [field, dir] = sortValue.split("-") as [string, string];
    sorted.sort((a, b) => {
      if (field === "score") {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        return dir === "desc" ? sb - sa : sa - sb;
      }
      const na = (a.companyName || a.symbol).toLowerCase();
      const nb = (b.companyName || b.symbol).toLowerCase();
      if (na < nb) return dir === "asc" ? -1 : 1;
      if (na > nb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRows, sortValue]);

  const tableRows = sortedRows.map((pr, idx) => ({
    rank: idx + 1,
    symbol: pr.symbol,
    name: pr.companyName,
    sector: pr.sector || "Nifty 50",
    score: pr.score,
    price: pr.price,
    change: pr.change,
    changePositive: pr.changePositive,
    factors: [
      { label: "Q", value: pr.qualityValue },
      { label: "G", value: pr.growthValue },
      { label: "V", value: pr.valuationValue },
      { label: "M", value: pr.momentumValue },
      { label: "R", value: pr.riskValue },
    ].filter(f => f.value !== null),
    conviction: pr.score !== null ? (pr.score >= 75 ? "High Conviction" : pr.score >= 55 ? "Research" : "Watch") : "—",
    confidence: pr.score,
  }));

  const convictionCount = sortedRows.filter(r => r.score !== null && r.score >= 75).length;
  const totalCount = sortedRows.length;
  const highScoreCount = sortedRows.filter(r => r.score !== null && r.score >= 70).length;

  const insightFactors = [
    { title: "Improving Earnings Quality", body: "Several companies show expanding margins and higher ROE this quarter" },
    { title: "Relative Valuation Edge", body: "Select large caps are trading below their 5-year average PE multiples" },
    { title: "Momentum Strength", body: "Price trend indicators are positive for quality and growth leaders" },
    { title: "Low Risk Profile", body: "Low-debt companies with strong cash flows continue to score well" },
  ];

  const topSectors = [
    { name: "IT", count: 8 },
    { name: "Banking", count: 6 },
    { name: "Auto", count: 4 },
    { name: "Pharma", count: 3 },
    { name: "FMCG", count: 3 },
  ];

  const factorDistData = [
    { label: "Quality 80+", pct: 35 },
    { label: "Growth 80+", pct: 22 },
    { label: "Valuation 80+", pct: 18 },
    { label: "Momentum 80+", pct: 28 },
    { label: "Risk 80+", pct: 42 },
  ];

  const scoreBuckets = [
    { label: "80-100", count: sortedRows.filter(r => r.score !== null && r.score >= 80).length, color: SS.positive },
    { label: "60-79", count: sortedRows.filter(r => r.score !== null && r.score >= 60 && r.score < 80).length, color: SS.ink },
    { label: "40-59", count: sortedRows.filter(r => r.score !== null && r.score >= 40 && r.score < 60).length, color: SS.ink3 },
    { label: "Below 40", count: sortedRows.filter(r => r.score !== null && r.score < 40).length, color: "#B42318" },
  ];
  const maxBucket = Math.max(...scoreBuckets.map(b => b.count), 1);

  const marketBreadth = [
    { label: "High Conviction", value: convictionCount, color: SS.positive },
    { label: "Research", value: totalCount - highScoreCount, color: SS.ink3 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: SS.bg }}>
      <PremiumTopNav activePage="scanner" />
      <MarketTickerStrip />

      <main style={{ maxWidth: SS.container, margin: "0 auto", padding: "0 52px", paddingTop: 24 }}>
        {/* Three-column layout */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Left Rail */}
          <div style={{ flexShrink: 0 }}>
            <ScannerFilterRail
              filters={filters}
              onChange={handleFilterChange}
              onRun={handleRunScan}
              onSave={() => {}}
            />
          </div>

          {/* Center */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Total Companies", value: totalCount.toString() },
                { label: "High Conviction", value: convictionCount.toString(), up: true },
                { label: "Watchlist Matches", value: "—" },
                { label: "Live Updates", value: "Auto", up: true },
              ].map(m => (
                <PremiumCard key={m.label} padding="16px">
                  <div style={{ fontSize: 10, fontWeight: 500, color: SS.ink4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{m.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: SS.ink, fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
                    {m.up && <Sparkles size={12} color={SS.positive} />}
                  </div>
                </PremiumCard>
              ))}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8,
                height: 40, padding: "0 14px", borderRadius: SS.radiusSm,
                border: `1px solid ${SS.border}`, background: SS.surface,
              }}>
                <Search size={14} color={SS.ink4} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. TCS, HDFCBANK"
                  style={{
                    flex: 1, border: "none", background: "none", outline: "none",
                    fontSize: 13, color: SS.ink,
                  }}
                />
                {query && (
                  <button onClick={() => { setQuery(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: SS.ink4 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <select value={sortValue} onChange={e => setSortValue(e.target.value)} style={{
                height: 40, padding: "0 32px 0 12px", fontSize: 12, color: SS.ink,
                border: `1px solid ${SS.border}`, borderRadius: SS.radiusSm, background: SS.surface,
                cursor: "pointer", outline: "none",
              }}>
                <option value="score-desc">AI Score (High to Low)</option>
                <option value="score-asc">AI Score (Low to High)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
              <button style={{
                height: 40, padding: "0 14px", fontSize: 12, fontWeight: 600, color: SS.ink2,
                border: `1px solid ${SS.border}`, borderRadius: SS.radiusSm, background: SS.surface,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <SlidersHorizontal size={14} /> Filters
              </button>
            </div>

            {/* Chips */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {["AI Score", "Market", "Market Cap", "Clear All"].map(chip => (
                <button key={chip} style={{
                  padding: "6px 14px", fontSize: 11, fontWeight: 500, color: chip === "Clear All" ? SS.ink3 : SS.ink,
                  border: `1px solid ${SS.borderSoft}`, borderRadius: 100, background: chip === "Clear All" ? "transparent" : SS.surface,
                  cursor: "pointer",
                }}>
                  {chip}
                </button>
              ))}
            </div>

            {/* Results */}
            {pipeLoading ? (
              <div role="status" aria-label="Loading">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "16px 20px", borderBottom: `1px solid ${SS.borderSoft}`,
                    background: SS.surface, animation: "pulse 1.5s ease-in-out infinite",
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: SS.borderSoft }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: 120, height: 12, borderRadius: 4, background: SS.borderSoft, marginBottom: 6 }} />
                      <div style={{ width: 80, height: 10, borderRadius: 4, background: SS.borderSoft }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : tableRows.length > 0 ? (
              <ScannerResultsTable rows={tableRows} onRowClick={symbol => productNavigate("stock", symbol)} />
            ) : (
              <EmptyProductState
                title="No results match your filters"
                body="Try adjusting your filter criteria or running a new scan."
              />
            )}
          </div>

          {/* Right Rail */}
          <div style={{ flexShrink: 0 }}>
            <RightInsightRail
              insights={insightFactors}
              topSectors={topSectors}
              onSave={() => {}}
            />
          </div>
        </div>

        {/* Bottom Analytics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 24, marginBottom: 32 }}>
          <PremiumCard padding="20px">
            <div style={{ fontSize: 11, fontWeight: 600, color: SS.ink3, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Factor Distribution
            </div>
            {factorDistData.map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 80, fontSize: 10, color: SS.ink3 }}>{f.label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: SS.borderSoft }}>
                  <div style={{ width: `${f.pct}%`, height: "100%", borderRadius: 3, background: SS.positive }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink, width: 30, textAlign: "right" }}>{f.pct}%</span>
              </div>
            ))}
          </PremiumCard>

          <PremiumCard padding="20px">
            <div style={{ fontSize: 11, fontWeight: 600, color: SS.ink3, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Score Heatmap
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {scoreBuckets.map(b => {
                const pct = b.count / maxBucket;
                return (
                  <div key={b.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      height: `${Math.max(20, pct * 100)}px`,
                      background: b.color,
                      borderRadius: `${SS.radiusXs} ${SS.radiusXs} 0 0`,
                      opacity: 0.7, transition: "height 0.3s",
                    }} />
                    <div style={{ fontSize: 10, color: SS.ink3, marginTop: 6 }}>{b.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: SS.ink }}>{b.count}</div>
                  </div>
                );
              })}
            </div>
          </PremiumCard>

          <PremiumCard padding="20px">
            <div style={{ fontSize: 11, fontWeight: 600, color: SS.ink3, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Market Breadth
            </div>
            {marketBreadth.map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: m.color }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: SS.ink }}>{m.label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: SS.ink }}>{m.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <MethodologyNote>
                Scores are based on multi-factor analysis of available data.
              </MethodologyNote>
            </div>
          </PremiumCard>
        </div>

        <SebiDisclaimer variant="footer" />
      </main>
    </div>
  );
}
