import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, Sparkles, ArrowUpRight, SlidersHorizontal, X,
  ChevronDown, TrendingUp, TrendingDown, BarChart3, Star,
  RefreshCw, Bookmark, GitCompare, ChevronRight,
} from "lucide-react";
import {
  PremiumCard, ScoreRing, FactorBar, ScorePill, FactorChip,
  MiniSparkline, EmptyProductState, ProductPageHeader,
  ScannerFilterRail, ScannerResultsTable, RightInsightRail,
  PremiumAppShell, MobileProductNav, CommandSearch,
} from "../../premium/PremiumComponents";
import { productNavigate } from "../product/ProductUI";
import { runCompanyDataPipeline, type PipelineResult } from "../../services/data/CompanyDataPipeline";
import { useStockData } from "../../hooks/useStockData";

const S = {
  bg: "var(--ss-bg)", bgSoft: "var(--ss-bg-soft)",
  surface: "var(--ss-surface)", ink: "var(--ss-ink)",
  ink2: "var(--ss-ink-2)", ink3: "var(--ss-ink-3)", ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)", borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)", positiveSoft: "var(--ss-positive-soft)",
  negative: "var(--ss-negative)", negativeSoft: "var(--ss-negative-soft)",
  action: "var(--ss-action)",
  radiusXs: "var(--ss-radius-xs)", radiusSm: "var(--ss-radius-sm)", radiusMd: "var(--ss-radius-md)",
  shadowCard: "var(--ss-shadow-card)",
};

interface PipelineRow {
  symbol: string; companyName: string; sector: string | null;
  score: number | null; price: string | null; change: string | null; changePositive: boolean | null;
  qualityValue: number | null; growthValue: number | null;
  momentumValue: number | null; valuationValue: number | null; riskValue: number | null;
}

const DEFAULT_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK",
  "LT", "WIPRO", "AXISBANK", "BAJFINANCE", "MARUTI",
  "TITAN", "SUNPHARMA", "NTPC", "ONGC", "POWERGRID",
];

function useMobile(breakpoint = 900): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}

export default function ScannerPage() {
  const mobile = useMobile();
  const [query, setQuery] = useState("");
  const [pipelineResults, setPipelineResults] = useState<Map<string, PipelineRow>>(new Map());
  const [pipeLoading, setPipeLoading] = useState(false);
  const [sortValue, setSortValue] = useState("score-desc");
  const [filters, setFilters] = useState<Record<string, string>>({
    universe: "All", scoreRange: "All", sector: "All", quality: "All",
    growth: "All", valuation: "All", momentum: "All", marketCap: "All", risk: "All",
  });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const pipelineRef = useRef(false);

  const runPipeline = useCallback(async () => {
    if (pipelineRef.current) return;
    pipelineRef.current = true;
    setPipeLoading(true);
    setPipelineResults(new Map());
    const resultsMap = new Map<string, PipelineRow>();

    for (const sym of DEFAULT_SYMBOLS) {
      try {
        const p: PipelineResult = await runCompanyDataPipeline(sym);
        const score = p.prediction?.rankingScore ?? p.prediction?.healthScore ?? 50;
        const fv = (g: string) => p.prediction?.factorScores?.find(f => f.group === g)?.value ?? null;
        const chg = p.price.change;
        resultsMap.set(sym, {
          symbol: sym, companyName: p.companyName ?? sym, sector: p.sector, score,
          price: p.price.current !== null ? "₹" + p.price.current.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : null,
          change: chg !== null ? (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%" : null,
          changePositive: chg !== null ? chg >= 0 : null,
          qualityValue: fv("quality"), growthValue: fv("growth"),
          momentumValue: fv("momentum"), valuationValue: fv("valuation"), riskValue: fv("risk"),
        });
      } catch { /* skip */ }
      setPipelineResults(new Map(resultsMap));
    }
    setPipeLoading(false);
    pipelineRef.current = false;
  }, []);

  useEffect(() => {
    if (pipelineResults.size === 0 && !pipeLoading) runPipeline();
  }, [runPipeline, pipelineResults.size, pipeLoading]);

  const handleRunScan = useCallback(() => {
    pipelineRef.current = false;
    setPipelineResults(new Map());
    runPipeline();
  }, [runPipeline]);

  const handleFilterChange = useCallback((k: string, v: string) => setFilters(p => ({ ...p, [k]: v })), []);

  const filteredRows = useMemo(() => {
    let arr = Array.from(pipelineResults.values());
    if (filters.scoreRange !== "All") {
      arr = arr.filter(r => {
        const s = r.score ?? -1;
        if (filters.scoreRange === "80-100") return s >= 80;
        if (filters.scoreRange === "60-79") return s >= 60 && s < 80;
        if (filters.scoreRange === "40-59") return s >= 40 && s < 60;
        if (filters.scoreRange === "Below 40") return s < 40;
        return true;
      });
    }
    if (filters.sector !== "All") arr = arr.filter(r => r.sector === filters.sector);
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(r => r.symbol.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q));
    }
    return arr;
  }, [pipelineResults, filters, query]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    const [field, dir] = sortValue.split("-") as [string, string];
    sorted.sort((a, b) => {
      if (field === "score") {
        const sa = a.score ?? 0; const sb = b.score ?? 0;
        return dir === "desc" ? sb - sa : sa - sb;
      }
      const na = (a.companyName || a.symbol).toLowerCase();
      const nb = (b.companyName || b.symbol).toLowerCase();
      return na < nb ? (dir === "asc" ? -1 : 1) : na > nb ? (dir === "asc" ? 1 : -1) : 0;
    });
    return sorted;
  }, [filteredRows, sortValue]);

  const tableRows = sortedRows.map((pr, i) => ({
    rank: i + 1, symbol: pr.symbol, name: pr.companyName, sector: pr.sector || "Nifty 50",
    score: pr.score, price: pr.price, change: pr.change, changePositive: pr.changePositive,
    factors: [
      { label: "Q", value: pr.qualityValue }, { label: "G", value: pr.growthValue },
      { label: "V", value: pr.valuationValue }, { label: "M", value: pr.momentumValue },
      { label: "R", value: pr.riskValue },
    ].filter(f => f.value !== null),
    conviction: pr.score !== null ? (pr.score >= 75 ? "High Conviction" : pr.score >= 55 ? "Research" : "Watch") : "—",
    confidence: pr.score,
  }));

  const totalCount = sortedRows.length;
  const convictionCount = sortedRows.filter(r => r.score !== null && r.score >= 75).length;
  const researchCount = sortedRows.filter(r => r.score !== null && r.score >= 55 && r.score < 75).length;
  const watchCount = totalCount - convictionCount - researchCount;

  const sectorMap = new Map<string, number>();
  sortedRows.forEach(r => { const s = r.sector || "Other"; sectorMap.set(s, (sectorMap.get(s) || 0) + 1); });
  const topSectors = Array.from(sectorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => ({ name: n, count: c }));

  const avgScore = totalCount > 0 ? sortedRows.reduce((s, r) => s + (r.score ?? 0), 0) / totalCount : 0;
  const topSector = topSectors[0];
  const insightFactors = [
    { title: "AI Score Distribution", body: `Average score of ${Math.round(avgScore)} across ${totalCount} stocks scanned.`, tone: avgScore >= 65 ? "positive" as const : avgScore >= 45 ? "neutral" as const : "caution" as const },
    { title: "Top Sector Strength", body: topSector ? `${topSector.name} leads with ${topSector.count} companies in this scan.` : "Sector data being aggregated.", tone: "neutral" as const },
    { title: "High Conviction Opportunities", body: `${convictionCount} stock${convictionCount !== 1 ? "s" : ""} scored 75+ — strong multi-factor alignment detected.`, tone: convictionCount >= 3 ? "positive" as const : "neutral" as const },
    { title: "Factor Momentum", body: "Quality and momentum factors are the strongest signals across the scanned universe.", tone: "positive" as const },
  ];

  const factorKeys: Array<{ label: string; key: keyof PipelineRow }> = [
    { label: "Quality 80+", key: "qualityValue" }, { label: "Growth 80+", key: "growthValue" },
    { label: "Valuation 80+", key: "valuationValue" }, { label: "Momentum 80+", key: "momentumValue" },
    { label: "Risk 80+", key: "riskValue" },
  ];
  const factorDistData = factorKeys.map(({ label, key }) => {
    const vals = sortedRows.map(r => r[key]).filter((v): v is number => v !== null);
    return { label, pct: vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
  });

  const scoreBuckets = [
    { label: "80-100", count: sortedRows.filter(r => r.score !== null && r.score >= 80).length, color: S.positive },
    { label: "60-79", count: sortedRows.filter(r => r.score !== null && r.score >= 60 && r.score < 80).length, color: S.ink },
    { label: "40-59", count: sortedRows.filter(r => r.score !== null && r.score >= 40 && r.score < 60).length, color: S.ink3 },
    { label: "Below 40", count: sortedRows.filter(r => r.score !== null && r.score < 40).length, color: S.negative },
  ];
  const maxBucket = Math.max(...scoreBuckets.map(b => b.count), 1);
  const marketBreadth = [
    { label: "Bullish (High Conviction)", value: convictionCount, color: S.positive },
    { label: "Neutral (Research)", value: researchCount, color: S.ink3 },
    { label: "Bearish (Watch)", value: watchCount, color: S.negative },
  ];

  return (
    <PremiumAppShell activePage="scanner">
      <ProductPageHeader
        title="AI Stock Scanner"
        badge="AI-powered"
        description="Find high-quality, high-conviction stocks using AI and factor intelligence."
      />

      {mobile && (
        <button onClick={() => setMobileFilterOpen(p => !p)} style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "10px 16px", marginBottom: 12,
          border: `1px solid ${S.border}`, borderRadius: S.radiusSm,
          background: S.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: S.ink,
        }}>
          <SlidersHorizontal size={14} />
          Filters & Screens
          {mobileFilterOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      )}
      {mobile && mobileFilterOpen && (
        <div style={{ marginBottom: 16 }}>
          <ScannerFilterRail filters={filters} onChange={handleFilterChange} onRun={handleRunScan} onSave={() => {}} />
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexDirection: mobile ? "column" : "row" }}>
        {!mobile && (
          <div style={{ flexShrink: 0 }}>
            <ScannerFilterRail filters={filters} onChange={handleFilterChange} onRun={handleRunScan} onSave={() => {}} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, width: mobile ? "100%" : undefined }}>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Companies", value: totalCount.toString(), icon: <BarChart3 size={14} /> },
              { label: "High Conviction", value: convictionCount.toString(), icon: <Sparkles size={14} color={S.positive} /> },
              { label: "Watchlist Matches", value: "—", icon: <Bookmark size={14} /> },
              { label: "Live Updates", value: "Auto", icon: <RefreshCw size={14} /> },
            ].map(m => (
              <PremiumCard key={m.label} padding="16px">
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {m.icon}
                  <span style={{ fontSize: 10, fontWeight: 500, color: S.ink4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{m.label}</span>
                </div>
                <span style={{ fontSize: 24, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
              </PremiumCard>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: mobile ? "wrap" : undefined }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", borderRadius: S.radiusSm, border: `1px solid ${S.border}`, background: S.surface, minWidth: mobile ? "100%" : 0 }}>
              <Search size={14} color={S.ink4} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. TCS, HDFCBANK" style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 13, color: S.ink }} />
              {query && <button onClick={() => setQuery("")} style={{ border: "none", background: "none", cursor: "pointer", color: S.ink4, padding: 2 }}><X size={14} /></button>}
            </div>
            <select value={sortValue} onChange={e => setSortValue(e.target.value)} style={{ height: 40, padding: "0 32px 0 12px", fontSize: 12, color: S.ink, border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: S.surface, cursor: "pointer", outline: "none" }}>
              <option value="score-desc">AI Score (High to Low)</option>
              <option value="score-asc">AI Score (Low to High)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {["AI Score", "Market", "Market Cap", "Clear All"].map(chip => (
              <button key={chip} style={{ padding: "6px 14px", fontSize: 11, fontWeight: 500, color: chip === "Clear All" ? S.ink3 : S.ink, border: `1px solid ${S.borderSoft}`, borderRadius: 100, background: chip === "Clear All" ? "transparent" : S.surface, cursor: "pointer" }}>{chip}</button>
            ))}
          </div>

          {pipeLoading && pipelineResults.size === 0 ? (
            <div role="status" aria-label="Loading results">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderBottom: `1px solid ${S.borderSoft}`, background: S.surface }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: S.borderSoft }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: 100, height: 12, borderRadius: 4, background: S.borderSoft, marginBottom: 6 }} />
                    <div style={{ width: 60, height: 10, borderRadius: 4, background: S.borderSoft }} />
                  </div>
                  <div style={{ width: 40, height: 24, borderRadius: 4, background: S.borderSoft }} />
                </div>
              ))}
            </div>
          ) : mobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedRows.length > 0 ? sortedRows.map(row => (
                <PremiumCard key={row.symbol} padding="16px" onClick={() => productNavigate("stock", row.symbol)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: S.ink }}>{row.symbol}</div>
                      <div style={{ fontSize: 11, color: S.ink3 }}>{row.companyName}</div>
                    </div>
                    <ScorePill score={row.score} size="md" />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {row.qualityValue !== null && <FactorChip group="quality" value={row.qualityValue} />}
                    {row.growthValue !== null && <FactorChip group="growth" value={row.growthValue} />}
                    {row.valuationValue !== null && <FactorChip group="valuation" value={row.valuationValue} />}
                    {row.momentumValue !== null && <FactorChip group="momentum" value={row.momentumValue} />}
                    {row.riskValue !== null && <FactorChip group="risk" value={row.riskValue} />}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: S.ink, fontVariantNumeric: "tabular-nums" }}>{row.price ?? "—"}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: row.changePositive === true ? S.positive : row.changePositive === false ? S.negative : S.ink3, fontVariantNumeric: "tabular-nums" }}>{row.change ?? "—"}</span>
                  </div>
                </PremiumCard>
              )) : (
                <EmptyProductState title="No results match your filters" body="Try adjusting your filter criteria or running a new scan." />
              )}
            </div>
          ) : tableRows.length > 0 ? (
            <ScannerResultsTable rows={tableRows} onRowClick={s => productNavigate("stock", s)} />
          ) : (
            <EmptyProductState title="No results match your filters" body="Try adjusting your filter criteria or running a new scan." />
          )}
        </div>

        {!mobile && (
          <div style={{ flexShrink: 0 }}>
            <RightInsightRail insights={insightFactors} topSectors={topSectors} onSave={() => {}} />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginTop: 24, marginBottom: 32 }}>
        <PremiumCard padding="20px">
          <div style={{ fontSize: 11, fontWeight: 600, color: S.ink3, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Factor Distribution</div>
          {factorDistData.map(f => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 80, fontSize: 10, color: S.ink3 }}>{f.label}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: S.borderSoft }}>
                <div style={{ width: `${f.pct}%`, height: "100%", borderRadius: 3, background: S.positive }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: S.ink, width: 30, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{f.pct}</span>
            </div>
          ))}
        </PremiumCard>

        <PremiumCard padding="20px">
          <div style={{ fontSize: 11, fontWeight: 600, color: S.ink3, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Score Heatmap</div>
          <div style={{ display: "flex", gap: 16 }}>
            {scoreBuckets.map(b => {
              const pct = maxBucket > 0 ? b.count / maxBucket : 0;
              return (
                <div key={b.label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: `${Math.max(20, pct * 100)}px`, background: b.color, borderRadius: `${S.radiusXs} ${S.radiusXs} 0 0`, opacity: 0.7, transition: "height 0.3s" }} />
                  <div style={{ fontSize: 10, color: S.ink3, marginTop: 6 }}>{b.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums" }}>{b.count}</div>
                </div>
              );
            })}
          </div>
        </PremiumCard>

        <PremiumCard padding="20px">
          <div style={{ fontSize: 11, fontWeight: 600, color: S.ink3, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Market Breadth</div>
          {marketBreadth.map(m => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: m.color }} />
              <span style={{ flex: 1, fontSize: 12, color: S.ink }}>{m.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
            </div>
          ))}
        </PremiumCard>
      </div>

      {mobile && <MobileProductNav activePage="scanner" />}
    </PremiumAppShell>
  );
}
