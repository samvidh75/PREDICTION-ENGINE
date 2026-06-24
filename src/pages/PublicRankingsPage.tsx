import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Sparkles, ArrowUpRight, TrendingUp, TrendingDown, Star, Lock, ChevronRight, Bookmark, GitCompare, RefreshCw, AlertCircle, Shield, Check } from "lucide-react";
import { PremiumCard, ScoreRing, ScorePill, FactorChip, MiniSparkline, FactorBar, EmptyProductState, ProductPageHeader, PremiumAppShell, MobileProductNav, CommandSearch } from "../premium/PremiumComponents";
import { productNavigate } from "../components/product/ProductUI";
import { runCompanyDataPipeline, PipelineResult } from "../services/data/CompanyDataPipeline";
import { globalPipelineQueue } from "../services/data/PipelineQueue";
import { fPrice, fChange } from "../lib/format";
import { getTrackedCompanies, addTrackedCompany, removeTrackedCompany, isTracked } from "../lib/track/trackStore";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";

const S = {
  bg: "var(--ss-bg)", bgSoft: "var(--ss-bg-soft)", surface: "var(--ss-surface)",
  ink: "var(--ss-ink)", ink2: "var(--ss-ink-2)", ink3: "var(--ss-ink-3)", ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)", borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)", positiveSoft: "var(--ss-positive-soft)",
  negative: "var(--ss-negative)", negativeSoft: "var(--ss-negative-soft)",
  caution: "var(--ss-caution)", cautionSoft: "var(--ss-caution-soft)",
  action: "var(--ss-action)",
  radiusXs: "var(--ss-radius-xs)", radiusSm: "var(--ss-radius-sm)", radiusMd: "var(--ss-radius-md)",
  radiusLg: "var(--ss-radius-lg)", radiusXl: "var(--ss-radius-xl)",
  shadowCard: "var(--ss-shadow-card)", shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
};

function scoreColor(v: number | null): string {
  if (v === null) return S.ink4;
  if (v >= 75) return S.positive;
  if (v >= 55) return S.ink;
  if (v >= 35) return S.caution;
  return S.negative;
}

const NIFTY30_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "LT",
  "KOTAKBANK", "BAJFINANCE", "AXISBANK", "WIPRO", "MARUTI",
  "TITAN", "ASIANPAINT", "SUNPHARMA", "NTPC", "ONGC",
  "POWERGRID", "ULTRACEMCO", "HCLTECH", "M&M", "TATAMOTORS",
  "NESTLE", "HDFCLIFE", "SBILIFE", "TATASTEEL",
];

const TABS = [
  { key: "all", label: "All" },
  { key: "quality", label: "Quality compounders" },
  { key: "undervalued", label: "Undervalued quality" },
  { key: "momentum", label: "Improving momentum" },
  { key: "lowrisk", label: "Low risk" },
  { key: "review", label: "Needs review" },
];

function matchesTab(pred: PipelineResult["prediction"] | null, tab: string): boolean {
  if (tab === "all") return true;
  if (!pred) return false;
  const cls = pred.classification;
  const factor = (g: string) => pred.factorScores.find(f => f.group === g)?.value ?? 0;
  switch (tab) {
    case "quality": return cls === "EXCELLENT" || factor("quality") >= 70;
    case "undervalued": return cls === "HEALTHY" && factor("valuation") >= 55;
    case "momentum": return factor("momentum") >= 55;
    case "lowrisk": return factor("risk") >= 55;
    case "review": return cls === "WEAKENING" || cls === "AT_RISK" || cls === "INSUFFICIENT_DATA";
    default: return true;
  }
}

function clsBadge(cls: string | null): { label: string; color: string; bg: string } {
  switch (cls) {
    case "EXCELLENT": return { label: "High Conviction", color: S.positive, bg: S.positiveSoft };
    case "HEALTHY": return { label: "Research", color: S.ink, bg: S.bgSoft };
    case "STABLE": return { label: "Watch", color: S.ink3, bg: S.bgSoft };
    case "WEAKENING": return { label: "Needs Review", color: S.caution, bg: S.cautionSoft };
    case "AT_RISK": return { label: "Risk Rising", color: S.negative, bg: S.negativeSoft };
    default: return { label: "—", color: S.ink4, bg: S.bgSoft };
  }
}

function useMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

function RankingRow({
  symbol, rank, result, tracked,
  onTrack, onNavigate, onCompare,
}: {
  symbol: string; rank: number;
  result: PipelineResult | null;
  tracked: boolean;
  onTrack: () => void;
  onNavigate: () => void;
  onCompare: () => void;
}) {
  const pred = result?.prediction ?? null;
  const score = pred?.rankingScore ?? null;
  const cls = pred?.classification ?? null;
  const companyName = result?.companyName;
  const sector = result?.sector;
  const price = result?.price.current ?? null;
  const change = result?.price.change ?? null;
  const closePrices = result?.technicals?.closePrices ?? [];
  const badge = clsBadge(cls);

  if (!result) {
    return (
      <PremiumCard padding="12px 20px">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, textAlign: "right", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: S.ink4, fontVariantNumeric: "tabular-nums" }}>—</span>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: S.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RefreshCw size={14} color={S.ink4} className="animate-spin" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, fontFamily: "monospace" }}>{symbol}</div>
            <div style={{ fontSize: 10, color: S.ink4 }}>Loading data…</div>
          </div>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard padding="12px 20px">
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
        <div style={{ width: 24, textAlign: "right", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: S.ink4, fontVariantNumeric: "tabular-nums" }}>{rank}</span>
        </div>

        <div style={{ flexShrink: 0 }}>
          <ScoreRing score={score} size={40} showLabel={false} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: S.ink, fontFamily: "monospace" }}>{symbol}</span>
            {companyName && (
              <span style={{ fontSize: 11, color: S.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{companyName}</span>
            )}
            {sector && (
              <span style={{ fontSize: 9, fontWeight: 600, color: S.ink4, textTransform: "uppercase", letterSpacing: "0.3px" }}>{sector}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <ScorePill score={score} size="sm" />
            <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: S.radiusXs, color: badge.color, background: badge.bg, lineHeight: 1 }}>
              {badge.label}
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums" }}>
            {price !== null ? fPrice(price) : "—"}
          </div>
          {change !== null && (
            <div style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: change >= 0 ? S.positive : S.negative }}>
              {fChange(change)}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0 }}>
          <MiniSparkline data={closePrices} width={56} height={18} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          {["quality", "valuation", "growth", "momentum", "risk"].map(g => {
            const v = pred?.factorScores.find(f => f.group === g)?.value ?? null;
            return <FactorChip key={g} group={g} value={v} />;
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onNavigate(); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: S.radiusXs, background: S.action, color: "white", cursor: "pointer", whiteSpace: "nowrap" }}>
            Research <ArrowUpRight size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onCompare(); }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, border: `1px solid ${S.border}`, borderRadius: S.radiusXs, background: "none", color: S.ink3, cursor: "pointer" }}
            title="Compare">
            <GitCompare size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onTrack(); }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, border: `1px solid ${tracked ? S.positive : S.border}`, borderRadius: S.radiusXs, background: tracked ? S.positiveSoft : "none", color: tracked ? S.positive : S.ink3, cursor: "pointer" }}
            title={tracked ? "Unwatch" : "Watch"}>
            {tracked ? <Check size={13} /> : <Bookmark size={13} />}
          </button>
        </div>
      </div>
    </PremiumCard>
  );
}

export const PublicRankingsPage: React.FC = () => {
  const mobile = useMobile();
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [trackedSet, setTrackedSet] = useState<Set<string>>(() => new Set(getTrackedCompanies().map(c => c.symbol)));
  const loadingRef = useRef(false);

  useEffect(() => {
    const loadAll = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      for (let i = 0; i < NIFTY30_SYMBOLS.length; i += 5) {
        const batch = NIFTY30_SYMBOLS.slice(i, i + 5);
        await Promise.allSettled(batch.map(sym =>
          globalPipelineQueue.enqueue(() => runCompanyDataPipeline(sym)).then(
            r => setResults(prev => ({ ...prev, [sym]: r })),
            () => setResults(prev => ({ ...prev, [sym]: null })),
          )
        ));
      }
      loadingRef.current = false;
    };
    loadAll();
  }, []);

  const filteredSymbols = useMemo(() => {
    let list = NIFTY30_SYMBOLS;
    if (activeTab !== "all") {
      list = list.filter(s => {
        const r = results[s];
        return r?.prediction ? matchesTab(r.prediction, activeTab) : false;
      });
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(s => {
        const r = results[s];
        return s.toLowerCase().includes(q) ||
          r?.companyName?.toLowerCase().includes(q) ||
          r?.sector?.toLowerCase().includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const sa = results[a]?.prediction?.rankingScore ?? -1;
      const sb = results[b]?.prediction?.rankingScore ?? -1;
      return sb - sa;
    });
  }, [results, activeTab, searchText]);

  const handleTrack = useCallback((symbol: string, name: string | null) => {
    if (isTracked(symbol)) {
      removeTrackedCompany(symbol);
      setTrackedSet(prev => { const n = new Set(prev); n.delete(symbol); return n; });
    } else {
      addTrackedCompany({ symbol, companyName: name ?? symbol, addedAt: new Date().toISOString(), source: "stock_page" });
      setTrackedSet(prev => { const n = new Set(prev); n.add(symbol); return n; });
    }
  }, []);

  const allLoading = NIFTY30_SYMBOLS.every(s => results[s] === undefined);

  const content = (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: mobile ? "0 16px" : "0 52px", width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 28, paddingBottom: 40 }}>
        <ProductPageHeader
          title="Rankings"
          description="AI-ranked Indian equities by conviction, quality, valuation, risk, and momentum."
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: activeTab === tab.key ? 600 : 500,
                borderRadius: S.radiusXs, border: "none",
                background: activeTab === tab.key ? S.ink : S.bgSoft,
                color: activeTab === tab.key ? "white" : S.ink3,
                cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: S.surface, borderRadius: S.radiusMd,
          border: `1px solid ${S.borderSoft}`, padding: "0 16px",
          height: 48, boxShadow: S.shadowCard,
        }}>
          <Search size={16} color={S.ink4} style={{ flexShrink: 0 }} />
          <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder="Filter by symbol or company name…"
            style={{
              flex: 1, border: "none", outline: "none", background: "none",
              fontSize: 13, color: S.ink, fontFamily: "Inter, sans-serif",
            }}
          />
          {searchText && (
            <button onClick={() => setSearchText("")}
              style={{ border: "none", background: "none", cursor: "pointer", color: S.ink4, padding: 4 }}>
              <AlertCircle size={14} />
            </button>
          )}
        </div>

        {allLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 0" }}>
            <RefreshCw size={24} color={S.ink4} className="animate-spin" />
            <span style={{ fontSize: 13, color: S.ink3 }}>Computing research scores…</span>
          </div>
        )}

        {!allLoading && filteredSymbols.length === 0 && (
          <EmptyProductState
            icon={<Search size={24} color={S.ink4} />}
            title="No results found"
            body="Try adjusting your filter or search query."
          />
        )}

        {filteredSymbols.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredSymbols.map((sym, idx) => (
              <RankingRow
                key={sym}
                symbol={sym}
                rank={idx + 1}
                result={results[sym] ?? null}
                tracked={trackedSet.has(sym)}
                onTrack={() => handleTrack(sym, results[sym]?.companyName ?? null)}
                onNavigate={() => productNavigate("stock", sym)}
                onCompare={() => productNavigate("compare", sym)}
              />
            ))}
          </div>
        )}

        <div style={{ paddingTop: 8 }}>
          <SebiDisclaimer variant="footer" />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: S.bg }}>
      {content}
      {mobile && <MobileProductNav activePage="research" />}
    </div>
  );
}

export default PublicRankingsPage;
