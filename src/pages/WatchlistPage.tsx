import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bookmark, Search, ArrowUpRight, TrendingUp, TrendingDown, ChevronRight, RefreshCw, AlertTriangle, Check, X, Clock, GitCompare, Star, Sparkles, Eye } from "lucide-react";
import {
  PremiumAppShell, PremiumCard, ScorePill, FactorChip, MiniSparkline,
  EmptyProductState, ProductPageHeader, InvestmentReviewSheet,
  BrokerHandoffSheet, MobileProductNav,
} from "../premium/PremiumComponents";
import { productNavigate } from "../components/product/ProductUI";
import { runCompanyDataPipeline, PipelineResult } from "../services/data/CompanyDataPipeline";
import { fPrice } from "../lib/format";
import { getTrackedCompanies, addTrackedCompany, removeTrackedCompany, isTracked } from "../lib/track/trackStore";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";
import { ClassificationBadge } from "../components/ui/ClassificationBadge";


const S = {
  bg: "var(--bg-page)",
  bgSoft: "var(--bg-chip)",
  surface: "var(--bg-card)",
  ink: "var(--text-primary)",
  ink2: "var(--text-body)",
  ink3: "var(--text-secondary)",
  ink4: "var(--text-muted)",
  border: "var(--border)",
  borderSoft: "var(--border)",
  positive: "var(--green)",
  positiveSoft: "var(--green-light)",
  negative: "var(--red)",
  negativeSoft: "var(--red-light)",
  caution: "var(--amber)",
  cautionSoft: "var(--amber-light)",
  action: "var(--brand)",
  radiusXs: "var(--radius-sm)",
  radiusSm: "var(--radius-sm)",
  radiusMd: "var(--radius-md)",
  radiusLg: "var(--radius-lg)",
  shadowCard: "var(--shadow-card)",
  shadowFloating: "var(--shadow-raised)",
  container: "1080px",
};

const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 30, height: 30, borderRadius: S.radiusXs,
  border: `1px solid ${S.borderSoft}`, background: "none", cursor: "pointer",
  color: S.ink3, transition: "color 0.15s, background 0.15s", flexShrink: 0,
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", fontSize: 12, fontWeight: 600,
  border: `1px solid ${S.border}`, borderRadius: S.radiusXs,
  background: "none", cursor: "pointer", color: S.ink2,
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "white",
  border: "none", borderRadius: S.radiusXs,
  background: S.action, cursor: "pointer",
};

export default function WatchlistPage() {
  const [tracked, setTracked] = useState(() => getTrackedCompanies());
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [investSheet, setInvestSheet] = useState<{ symbol: string; companyName?: string } | null>(null);
  const [brokerSheet, setBrokerSheet] = useState<{ symbol: string } | null>(null);


  const refresh = useCallback(() => setTracked(getTrackedCompanies()), []);

  useEffect(() => {
    window.addEventListener("trackchange", refresh);
    const handler = (e: StorageEvent) => { if (e.key === "ss_tracked_companies") refresh(); };
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("trackchange", refresh);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const loadData = useCallback(async (syms: string[]) => {
    if (syms.length === 0) return;
    setLoading(prev => { const n = new Set(prev); syms.forEach(s => n.add(s)); return n; });
    await Promise.allSettled(
      syms.map(sym =>
        runCompanyDataPipeline(sym).then(
          r => { setResults(p => ({ ...p, [sym]: r })); },
          () => { setResults(p => ({ ...p, [sym]: null })); },
        )
      ),
    );
    setLoading(prev => { const n = new Set(prev); syms.forEach(s => n.delete(s)); return n; });
  }, []);

  useEffect(() => { loadData(tracked.map(t => t.symbol)); }, [tracked, loadData]);

  const handleRefreshAll = useCallback(async () => {
    const syms = tracked.map(t => t.symbol);
    setLoading(prev => { const n = new Set(prev); syms.forEach(s => n.add(s)); return n; });
    for (const sym of syms) {
      await runCompanyDataPipeline(sym).then(
        r => { setResults(p => ({ ...p, [sym]: r })); },
        () => { setResults(p => ({ ...p, [sym]: null })); },
      );
    }
    setLoading(prev => { const n = new Set(prev); syms.forEach(s => n.delete(s)); return n; });
  }, [tracked]);

  const toggleTrack = useCallback((sym: string, name: string) => {
    if (isTracked(sym)) {
      removeTrackedCompany(sym);
    } else {
      addTrackedCompany({ symbol: sym, companyName: name, addedAt: new Date().toISOString(), source: "stock_page" });
    }
    window.dispatchEvent(new Event("trackchange"));
  }, []);

  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'change'>('recent');

  const sortedTracked = useMemo(() => {
    const copy = [...tracked];
    switch (sortBy) {
      case 'score':
        return copy.sort((a, b) => {
          const sa = results[a.symbol]?.prediction?.healthScore ?? -1;
          const sb = results[b.symbol]?.prediction?.healthScore ?? -1;
          return sb - sa;
        });
      case 'change':
        return copy.sort((a, b) => {
          const ca = results[a.symbol]?.price?.change ?? 0;
          const cb = results[b.symbol]?.price?.change ?? 0;
          return Math.abs(cb) - Math.abs(ca);
        });
      default:
        return copy.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
  }, [tracked, results, sortBy]);

  const improving = tracked.filter(t => {
    const r = results[t.symbol];
    return r?.prediction?.healthScore != null && r.prediction.healthScore >= 75;
  });

  const needsReview = tracked.filter(t => {
    const r = results[t.symbol];
    if (r?.prediction?.healthScore == null) return false;
    return r.prediction.healthScore < 55
      || r.prediction.classification === "WEAKENING"
      || r.prediction.classification === "AT_RISK";
  });

  const renderItem = (t: { symbol: string; companyName: string }) => {
    const r = results[t.symbol];
    const isPending = loading.has(t.symbol);
    const closePrices = r?.technicals?.closePrices ?? [];
    const score = r?.prediction?.healthScore ?? null;
    const classification = r?.prediction?.classification ?? "INSUFFICIENT_DATA";
    const sector = r?.sector ?? null;
    const price = r?.price?.current ?? null;
    const change = r?.price?.change ?? null;

    return (
      <div key={t.symbol} style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "14px 0",
        borderBottom: `1px solid ${S.borderSoft}`,
      }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, letterSpacing: "-0.2px", fontVariantNumeric: "tabular-nums" }}>
              {t.symbol}
            </span>
            {(t.companyName || r?.companyName) && (
              <span style={{
                fontSize: 12, color: S.ink3, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {t.companyName || r?.companyName}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            {sector && <span style={{ fontSize: 10, fontWeight: 500, color: S.ink4 }}>{sector}</span>}
            {!isPending && price != null && (
              <>
                <span style={{ fontSize: 10, color: S.ink4 }}>·</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: S.ink2, fontVariantNumeric: "tabular-nums" }}>
                  {fPrice(price)}
                </span>
              </>
            )}
            {!isPending && change != null && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: change >= 0 ? S.positive : S.negative,
                fontVariantNumeric: "tabular-nums",
              }}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)}%
              </span>
            )}
            {isPending && <span style={{ fontSize: 10, color: S.ink4 }}>Loading data...</span>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!isPending && score !== null && <ScorePill score={score} size="sm" />}
          {closePrices.length >= 2 && <MiniSparkline data={closePrices} width={44} height={16} />}
          {!isPending && r?.prediction && (
            <ClassificationBadge classification={classification} size="sm" />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => productNavigate("stock", t.symbol)}
            title="Research"
            style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = S.bgSoft; e.currentTarget.style.color = S.ink; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = S.ink3; }}
          >
            <Search size={13} />
          </button>
          <button
            onClick={() => productNavigate("compare", t.symbol)}
            title="Compare"
            style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = S.bgSoft; e.currentTarget.style.color = S.ink; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = S.ink3; }}
          >
            <GitCompare size={13} />
          </button>
          <button
            onClick={() => toggleTrack(t.symbol, t.companyName)}
            title={isTracked(t.symbol) ? "Remove from watchlist" : "Add to watchlist"}
            style={{
              ...iconBtn,
              color: isTracked(t.symbol) ? S.action : S.ink4,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = S.bgSoft; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <Bookmark size={13} fill={isTracked(t.symbol) ? S.action : "none"} />
          </button>
          <button
            onClick={() => setInvestSheet({ symbol: t.symbol, companyName: t.companyName || r?.companyName || undefined })}
            title="Investment review"
            style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = S.positiveSoft; e.currentTarget.style.color = S.positive; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = S.ink3; }}
          >
            <TrendingUp size={13} />
          </button>
        </div>
      </div>
    );
  };

  const sectionCard = (title: string, icon: React.ReactNode, items: typeof tracked, emptyMsg?: string) => {
    if (items.length === 0 && !emptyMsg) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <PremiumCard padding="14px 20px">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: items.length > 0 ? 0 : 0 }}>
            <span style={{ color: S.ink3, display: "flex" }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{title}</span>
            {items.length > 0 && (
              <span style={{ fontSize: 11, color: S.ink4, marginLeft: "auto", fontWeight: 600 }}>
                {items.length}
              </span>
            )}
          </div>
          {items.length === 0 && emptyMsg && (
            <p style={{ fontSize: 12, color: S.ink3, margin: "6px 0 0 0", lineHeight: 1.6 }}>
              {emptyMsg}
            </p>
          )}
          {items.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {items.map(renderItem)}
            </div>
          )}
        </PremiumCard>
      </div>
    );
  };

  if (tracked.length === 0) {
    return (
      <PremiumAppShell activePage="watchlist">
        <ProductPageHeader
          title="Watchlist"
          description="Track companies you are researching and review what changed."
        />
        <EmptyProductState
          icon={<Bookmark size={24} color={S.ink4} />}
          title="Track companies you are researching."
          body="Add a company from Scanner or Research to follow thesis changes and risks."
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button onClick={() => productNavigate("scanner")} style={primaryBtn}>
            Open scanner
          </button>
          <button onClick={() => productNavigate("search")} style={secondaryBtn}>
            Search company
          </button>
        </div>
        <MobileProductNav activePage="watchlist" />
        <SebiDisclaimer />
      </PremiumAppShell>
    );
  }

  return (
    <PremiumAppShell activePage="watchlist">
      <ProductPageHeader
        title="Watchlist"
        description="Track companies you are researching and review what changed."
        badge={`${tracked.length} tracked`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {/* Sort controls */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'recent' | 'score' | 'change')}
              style={{
                height: 36, padding: "0 10px", borderRadius: S.radiusSm,
                border: `1px solid ${S.border}`, background: S.surface,
                color: S.ink2, fontSize: 12, fontWeight: 600, outline: "none",
              }}
            >
              <option value="recent">Recently Added</option>
              <option value="score">By Score</option>
              <option value="change">By Change %</option>
            </select>
            <button
              onClick={handleRefreshAll}
              disabled={loading.size > 0}
              style={{
                ...secondaryBtn,
                opacity: loading.size > 0 ? 0.5 : 1,
                pointerEvents: loading.size > 0 ? "none" : "auto",
              }}
            >
              <RefreshCw size={13} />
              {loading.size > 0 ? `Loading ${loading.size}` : "Refresh"}
            </button>
          </div>
        }
      />

      {sectionCard(
        "What changed",
        <Sparkles size={15} />,
        [],
        "Review your tracked companies on their stock pages to detect thesis changes over time. Scores and classifications update with each research session.",
      )}

      {needsReview.length > 0 && sectionCard(
        "Needs review",
        <AlertTriangle size={15} color={S.caution} />,
        needsReview,
      )}

      {improving.length > 0 && sectionCard(
        "Thesis improving",
        <TrendingUp size={15} color={S.positive} />,
        improving,
      )}

      {sectionCard(
        "All tracked companies",
        <Eye size={15} />,
        sortedTracked,
      )}

      <InvestmentReviewSheet
        open={investSheet !== null}
        onClose={() => setInvestSheet(null)}
        symbol={investSheet?.symbol ?? ""}
        companyName={investSheet?.companyName}
      />
      <BrokerHandoffSheet
        open={brokerSheet !== null}
        onClose={() => setBrokerSheet(null)}
        symbol={brokerSheet?.symbol}
      />

      <MobileProductNav activePage="watchlist" />
      <SebiDisclaimer />
    </PremiumAppShell>
  );
}
