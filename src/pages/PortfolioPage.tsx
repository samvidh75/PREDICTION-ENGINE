import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Search, ArrowUpRight, TrendingUp, TrendingDown,
  ChevronRight, RefreshCw, AlertTriangle, Check, Clock,
  GitCompare, Bookmark, Sparkles, Eye, Brain,
} from "lucide-react";
import {
  PremiumAppShell, PremiumCard, ScorePill,
  EmptyProductState, ProductPageHeader, InvestmentReviewSheet,
  MobileProductNav, MiniSparkline,
} from "../premium/PremiumComponents";
import { productNavigate } from "../components/product/ProductUI";
import { runCompanyDataPipeline, type PipelineResult } from "../services/data/CompanyDataPipeline";
import { fPrice } from "../lib/format";
import { getTrackedCompanies, addTrackedCompany } from "../lib/track/trackStore";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";

const S = {
  bg: "var(--ss-bg)", bgSoft: "var(--ss-bg-soft)", surface: "var(--ss-surface)",
  ink: "var(--ss-ink)", ink2: "var(--ss-ink-2)", ink3: "var(--ss-ink-3)", ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)", borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)", positiveSoft: "var(--ss-positive-soft)",
  negative: "var(--ss-negative)", negativeSoft: "var(--ss-negative-soft)",
  caution: "var(--ss-caution)", cautionSoft: "var(--ss-caution-soft)",
  action: "var(--ss-action)", radiusXs: "var(--ss-radius-xs)", radiusSm: "var(--ss-radius-sm)",
};

const st = {
  icon: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: S.radiusXs,
    border: `1px solid ${S.borderSoft}`, background: "none", cursor: "pointer",
    color: S.ink3, flexShrink: 0,
  } as React.CSSProperties,
  secondary: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", fontSize: 12, fontWeight: 600,
    border: `1px solid ${S.border}`, borderRadius: S.radiusXs,
    background: "none", cursor: "pointer", color: S.ink2,
  } as React.CSSProperties,
  primary: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "white",
    border: "none", borderRadius: S.radiusXs, background: S.action, cursor: "pointer",
  } as React.CSSProperties,
  prompt: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 11px", fontSize: 11, fontWeight: 600,
    border: `1px solid ${S.border}`, borderRadius: S.radiusXs,
    background: "none", cursor: "pointer", color: S.ink2,
  } as React.CSSProperties,
};

function daysSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function PortfolioPage() {
  const [tracked, setTracked] = useState(() => getTrackedCompanies());
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [investSheet, setInvestSheet] = useState<{ symbol: string; companyName?: string } | null>(null);

  const refresh = useCallback(() => setTracked(getTrackedCompanies()), []);
  useEffect(() => {
    window.addEventListener("trackchange", refresh);
    const handler = (e: StorageEvent) => { if (e.key === "ss_tracked_companies") refresh(); };
    window.addEventListener("storage", handler);
    return () => { window.removeEventListener("trackchange", refresh); window.removeEventListener("storage", handler); };
  }, [refresh]);

  const loadData = useCallback(async (syms: string[]) => {
    if (syms.length === 0) return;
    setLoading(p => { const n = new Set(p); syms.forEach(s => n.add(s)); return n; });
    await Promise.allSettled(syms.map(sym =>
      runCompanyDataPipeline(sym).then(r => setResults(p => ({ ...p, [sym]: r })), () => setResults(p => ({ ...p, [sym]: null })))
    ));
    setLoading(p => { const n = new Set(p); syms.forEach(s => n.delete(s)); return n; });
  }, []);

  useEffect(() => { loadData(tracked.map(t => t.symbol)); }, [tracked, loadData]);

  const handleRefreshAll = useCallback(async () => {
    const syms = tracked.map(t => t.symbol);
    setLoading(p => { const n = new Set(p); syms.forEach(s => n.add(s)); return n; });
    for (const sym of syms) {
      await runCompanyDataPipeline(sym).then(r => setResults(p => ({ ...p, [sym]: r })), () => setResults(p => ({ ...p, [sym]: null })));
    }
    setLoading(p => { const n = new Set(p); syms.forEach(s => n.delete(s)); return n; });
  }, [tracked]);

  const getScore = (sym: string) => results[sym]?.prediction?.healthScore ?? null;
  const byStatus = (pred: (s: string) => boolean) => tracked.filter(t => pred(t.symbol));
  const onTrack = byStatus(s => { const sc = getScore(s); return sc != null && sc >= 70; });
  const needsReview = byStatus(s => { const sc = getScore(s); return sc != null && sc >= 40 && sc < 70; });
  const riskRising = byStatus(s => { const sc = getScore(s); return sc != null && sc < 40; });
  const pending = byStatus(s => getScore(s) == null);

  function statusLabel(score: number | null, isPending: boolean) {
    if (isPending || score == null) return { label: "Pending", color: S.ink4, bg: S.bgSoft };
    if (score >= 70) return { label: "On track", color: S.positive, bg: S.positiveSoft };
    if (score >= 40) return { label: "Needs review", color: S.caution, bg: S.cautionSoft };
    return { label: "Risk rising", color: S.negative, bg: S.negativeSoft };
  }

  const statusCard = (icon: React.ReactNode, label: string, count: number, color: string) => (
    <div style={{
      flex: 1, minWidth: 120, padding: "14px 16px", borderRadius: S.radiusSm,
      border: `1px solid ${S.borderSoft}`, background: S.surface,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: S.ink3, textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</span>
      </div>
      <span style={{ fontSize: 26, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{count}</span>
    </div>
  );

  const renderCard = (t: { symbol: string; companyName: string; addedAt: string }) => {
    const r = results[t.symbol];
    const score = getScore(t.symbol);
    const classification = r?.prediction?.classification;
    const price = r?.price?.current ?? null;
    const isPending = loading.has(t.symbol);
    const sts = statusLabel(score, isPending);
    const days = daysSince(t.addedAt);
    const closePrices = r?.technicals?.closePrices ?? [];

    return (
      <div key={t.symbol} style={{
        borderRadius: S.radiusSm, border: `1px solid ${S.borderSoft}`,
        background: S.surface, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "14px 16px 8px", borderBottom: `1px solid ${S.borderSoft}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
              <button onClick={() => productNavigate("stock", t.symbol)}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontSize: 15, fontWeight: 700, color: S.ink }}>
                {t.symbol}
              </button>
              {!isPending && score != null && (
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 3, color: sts.color, background: sts.bg, textTransform: "uppercase", letterSpacing: "0.3px" }}>{sts.label}</span>
              )}
            </div>
            {(t.companyName || r?.companyName) && (
              <div style={{ fontSize: 12, color: S.ink3, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.companyName || r?.companyName}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: S.ink4 }}>
              <Clock size={10} /> Tracked {days}d ago{!isPending && price != null && <><span>·</span><span style={{ fontWeight: 600, color: S.ink2 }}>{fPrice(price)}</span></>}
            </div>
          </div>
          <button onClick={() => productNavigate("stock", t.symbol)} title="View research" style={{ ...st.icon, marginTop: 2 }}><ChevronRight size={14} /></button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", minHeight: 34, borderBottom: `1px solid ${S.borderSoft}` }}>
          {isPending ? (
            <div style={{ fontSize: 11, color: S.ink4, display: "flex", alignItems: "center", gap: 5 }}>
              <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> Loading thesis data...
            </div>
          ) : score != null ? (
            <><ScorePill score={score} size="md" />
              {classification != null && classification !== "INSUFFICIENT_DATA" && (
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 3, background: S.bgSoft, color: S.ink2, textTransform: "uppercase", letterSpacing: "0.3px" }}>{classification}</span>
              )}
              {closePrices.length >= 2 && <MiniSparkline data={closePrices} width={44} height={14} />}</>
          ) : (
            <div style={{ fontSize: 11, color: S.ink3, lineHeight: 1.5 }}>Score and risk data will be tracked over time.</div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "10px 16px", borderBottom: `1px solid ${S.borderSoft}` }}>
          <button onClick={() => productNavigate("stock", t.symbol)} style={st.prompt}><Eye size={11} /> Review valuation</button>
          <button onClick={() => productNavigate("compare", t.symbol)} style={st.prompt}><GitCompare size={11} /> Compare peers</button>
          <button onClick={() => productNavigate("stock", t.symbol)} style={st.prompt}><AlertTriangle size={11} /> Check risk</button>
          <button onClick={() => productNavigate("stock", t.symbol)} style={st.prompt}><Brain size={11} /> Update note</button>
        </div>

        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", padding: "8px 16px" }}>
          <button onClick={() => productNavigate("stock", t.symbol)} style={st.icon} title="Research"><Search size={13} /></button>
          <button onClick={() => productNavigate("compare", t.symbol)} style={st.icon} title="Compare"><GitCompare size={13} /></button>
          <button onClick={() => productNavigate("stock", t.symbol)} style={st.icon} title="Track thesis"><Bookmark size={13} /></button>
          <button onClick={() => setInvestSheet({ symbol: t.symbol, companyName: t.companyName || r?.companyName || undefined })}
            style={{ ...st.icon, color: S.positive }} title="Investment review"><TrendingUp size={13} /></button>
        </div>
      </div>
    );
  };

  const section = (title: string, icon: React.ReactNode, items: typeof tracked) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 2px" }}>
          <span style={{ color: S.ink3 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{title}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: S.ink4, marginLeft: "auto" }}>{items.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map(renderCard)}</div>
      </div>
    );
  };

  if (tracked.length === 0) {
    return (
      <PremiumAppShell activePage="portfolio">
        <ProductPageHeader title="Portfolio thesis monitor" description="Review whether the reason you tracked or entered a company still holds." />
        <EmptyProductState icon={<Brain size={24} color={S.ink4} />} title="Monitor the thesis, not just the price."
          body="Track companies you are researching to review what changed over time." />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button onClick={() => productNavigate("scanner")} style={st.primary}><BarChart3 size={14} /> Open scanner</button>
          <button onClick={() => productNavigate("search")} style={st.secondary}><Search size={13} /> Search company</button>
        </div>
        <MobileProductNav activePage="portfolio" />
        <SebiDisclaimer />
      </PremiumAppShell>
    );
  }

  return (
    <PremiumAppShell activePage="portfolio">
      <ProductPageHeader title="Portfolio thesis monitor"
        description="Review whether the reason you tracked or entered a company still holds."
        badge={`${tracked.length} tracked`}
        actions={<button onClick={handleRefreshAll} disabled={loading.size > 0}
          style={{ ...st.secondary, opacity: loading.size > 0 ? 0.5 : 1, pointerEvents: loading.size > 0 ? "none" : "auto" }}>
          <RefreshCw size={13} />{loading.size > 0 ? `Loading ${loading.size}` : "Refresh"}</button>}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {statusCard(<Check size={13} />, "On track", onTrack.length, S.positive)}
        {statusCard(<AlertTriangle size={13} />, "Needs review", needsReview.length, S.caution)}
        {statusCard(<TrendingDown size={13} />, "Risk rising", riskRising.length, S.negative)}
        {pending.length > 0 && statusCard(<Clock size={13} />, "Pending", pending.length, S.ink4)}
      </div>

      {section("On track", <Check size={14} color={S.positive} />, onTrack)}
      {section("Needs review", <AlertTriangle size={14} color={S.caution} />, needsReview)}
      {section("Risk rising", <TrendingDown size={14} color={S.negative} />, riskRising)}
      {section("Pending", <Clock size={14} color={S.ink4} />, pending)}

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderRadius: S.radiusSm, border: `1px solid ${S.borderSoft}`, background: S.surface, marginBottom: 16 }}>
        <Sparkles size={18} color={S.ink3} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, marginBottom: 1 }}>Looking for alternatives?</div>
          <div style={{ fontSize: 11, color: S.ink3 }}>Discover new research ideas and compare companies across sectors.</div>
        </div>
        <button onClick={() => productNavigate("scanner")} style={st.primary}><BarChart3 size={13} /> Open scanner</button>
      </div>

      <InvestmentReviewSheet open={investSheet !== null} onClose={() => setInvestSheet(null)}
        symbol={investSheet?.symbol ?? ""} companyName={investSheet?.companyName} />
      <MobileProductNav activePage="portfolio" />
      <SebiDisclaimer />
    </PremiumAppShell>
  );
}
