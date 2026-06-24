import React, { useState, useEffect, useMemo } from "react";
import {
  Bookmark, GitCompare,
  AlertTriangle, Sparkles, ChevronRight, Newspaper, Check, Brain,
} from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { productNavigate } from "../components/product/ProductUI";
import { fPrice } from "../lib/format";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import type { PipelineResult } from "../services/data/CompanyDataPipeline";
import type { UnifiedFactorScore } from "../prediction-engine/types";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";
import {
  PremiumAppShell, PremiumTopNav, MarketTickerStrip, PremiumCard, ScoreRing,
  FactorBar, PerformanceChart, ResearchTabBar, CompanyIdentity,
  InvestmentReviewSheet, BrokerHandoffSheet, MethodologyNote, EmptyProductState,
  HealthometerRing, FactorBreakdownBars,
} from "../premium/PremiumComponents";

const S = {
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
  negative: "var(--ss-negative)",
  negativeSoft: "var(--ss-negative-soft)",
  caution: "var(--ss-caution)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
  radiusLg: "var(--ss-radius-lg)",
  radiusXl: "var(--ss-radius-xl)",
  shadowCard: "var(--ss-shadow-card)",
  shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
};

const CLASS_LABELS: Record<string, string> = {
  EXCELLENT: "High Conviction", HEALTHY: "Research", STABLE: "Watch",
  WEAKENING: "Needs Review", AT_RISK: "Risk Rising", INSUFFICIENT_DATA: "Insufficient Data",
};

const TAB_ITEMS = ["Thesis", "Fundamentals", "Financials", "Risks", "Technicals", "News", "Peers"];

function useResponsive(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 900);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

function buildThesisBody(factors: UnifiedFactorScore[], explanation?: string | null): string {
  if (explanation) return explanation;
  if (!factors.length) return "Thesis analysis is being prepared. Check back after the next data refresh.";
  const parts: string[] = [];
  for (const f of factors) {
    if (f.value !== null && f.reason) parts.push(f.reason);
  }
  return parts.length ? parts.slice(0, 3).join(" ") : "Thesis analysis is being prepared.";
}

function getStrengths(pred: PipelineResult["prediction"]): string[] {
  if (pred?.keyStrengths?.length) return pred.keyStrengths;
  const high = pred?.factorScores?.filter(f => f.group !== "risk" && f.value !== null && f.value >= 65).map(f => f.group) ?? [];
  if (high.length) return high.map(g => `${g.charAt(0).toUpperCase() + g.slice(1)} factor is a relative strength`);
  return [];
}

function getRisks(pred: PipelineResult["prediction"]): string[] {
  if (pred?.keyRisks?.length) return pred.keyRisks;
  const low = pred?.factorScores?.filter(f => f.value !== null && f.value < 40).map(f => f.group) ?? [];
  if (low.length) return low.map(g => `${g.charAt(0).toUpperCase() + g.slice(1)} factor needs monitoring`);
  return [];
}

/* ── Sub-components ─────────────────────── */

function PriceBlock({ pipeline }: { pipeline: PipelineResult | null }) {
  const pricePos = pipeline ? (pipeline.price.change ?? 0) >= 0 : true;
  if (pipeline?.price.current === null || pipeline?.price.current === undefined) {
    return (
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: S.ink4, fontVariantNumeric: "tabular-nums" }}>—</div>
        <div style={{ fontSize: 12, color: S.ink4 }}>Price unavailable</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
        {fPrice(pipeline.price.current)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: pricePos ? S.positive : S.negative, fontVariantNumeric: "tabular-nums" }}>
          {pricePos ? "+" : ""}{pipeline.price.change?.toFixed(2) ?? "—"}%
        </span>
        {pipeline.price.changeAbs !== null && (
          <span style={{ fontSize: 11, color: S.ink3 }}>
            ({pipeline.price.changeAbs >= 0 ? "+" : ""}{pipeline.price.changeAbs.toFixed(0)})
          </span>
        )}
      </div>
    </div>
  );
}

function HeroSection({ ticker, pipeline, tracked, onTrack, onCompare, onInvest, mobile }: {
  ticker: string; pipeline: PipelineResult | null; tracked: boolean;
  onTrack: () => void; onCompare: () => void; onInvest: () => void; mobile: boolean;
}) {
  const pred = pipeline?.prediction ?? null;
  const score = pred?.rankingScore ?? null;
  const hScore = pred?.healthScore ?? null;
  const cls = pred?.classification ?? "INSUFFICIENT_DATA";

  if (mobile) {
    return (
      <div style={{ marginBottom: 20 }}>
        <CompanyIdentity
          symbol={ticker}
          name={pipeline?.companyName || ticker}
          sector={pipeline?.sector || undefined}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
          <PriceBlock pipeline={pipeline} />
          <ScoreRing score={score} size={56} />
          <HealthometerRing score={hScore} classification={cls} size={56} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={onInvest} style={{
              height: 36, padding: "0 16px", fontSize: 12, fontWeight: 600, color: "white",
              border: "none", borderRadius: S.radiusSm, background: S.ink, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              Review <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <CompanyIdentity
          symbol={ticker}
          name={pipeline?.companyName || ticker}
          sector={pipeline?.sector || undefined}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <PriceBlock pipeline={pipeline} />
        <ScoreRing score={score} size={64} />
        <HealthometerRing score={hScore} classification={cls} size={64} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onTrack} style={{
            height: 36, padding: "0 14px", fontSize: 12, fontWeight: 500, color: S.ink2,
            border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: S.surface, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Bookmark size={14} /> {tracked ? "Tracked" : "Follow"}
          </button>
          <button onClick={onCompare} style={{
            height: 36, padding: "0 14px", fontSize: 12, fontWeight: 500, color: S.ink2,
            border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: S.surface, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <GitCompare size={14} /> Compare
          </button>
          <button onClick={onInvest} style={{
            height: 36, padding: "0 16px", fontSize: 12, fontWeight: 600, color: "white",
            border: "none", borderRadius: S.radiusSm, background: S.ink, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            View Full Thesis <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ThesisFairValueRow({ pipeline, onInvest }: { pipeline: PipelineResult | null; onInvest: () => void }) {
  const pred = pipeline?.prediction ?? null;
  const factors = pred?.factorScores ?? [];
  const thesis = buildThesisBody(factors, pred?.explanation);
  const strengths = getStrengths(pred);
  const dispStrengths = strengths.length ? strengths : ["Analysis in progress"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} color={S.ink} />
          <span style={{ fontSize: 14, fontWeight: 700, color: S.ink }}>AI Investment Thesis</span>
        </div>
        <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.7, marginBottom: 14 }}>
          {thesis}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dispStrengths.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Check size={12} color={S.positive} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: S.ink2 }}>{item}</span>
            </div>
          ))}
        </div>
        <button onClick={onInvest} style={{
          marginTop: 14, fontSize: 12, fontWeight: 600, color: S.ink,
          border: "none", background: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          Read Full Thesis <ChevronRight size={12} />
        </button>
      </PremiumCard>

      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Sparkles size={14} color={S.ink3} />
          <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>Fair Value</span>
        </div>
          <EmptyProductState
            title="Valuation view is being prepared"
            body="Fair value estimation requires detailed financial modelling. This view will be available as the analysis matures."
          />
      </PremiumCard>
    </div>
  );
}

function StrengthsRisksCard({ pipeline }: { pipeline: PipelineResult | null }) {
  const pred = pipeline?.prediction ?? null;
  const strengths = getStrengths(pred);
  const risks = getRisks(pred);
  const dispStrengths = strengths.length ? strengths : ["Analysis in progress"];
  const dispRisks = risks.length ? risks : ["Reviewing risk profile"];

  return (
    <PremiumCard padding="20px" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, marginBottom: 14 }}>Strengths vs Risks</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.positive, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> Strengths
          </div>
          {dispStrengths.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
              <Check size={10} color={S.positive} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: S.ink2 }}>{s}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.caution, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> Risks
          </div>
          {dispRisks.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
              <AlertTriangle size={10} color={S.caution} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: S.ink2 }}>{r}</span>
            </div>
          ))}
        </div>
      </div>
    </PremiumCard>
  );
}

function MethodologyCard({ pipeline, score }: { pipeline: PipelineResult | null; score: number | null }) {
  const pred = pipeline?.prediction ?? null;
  return (
    <PremiumCard padding="20px">
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Brain size={14} color={S.ink3} />
        <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>Research Basis</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: S.ink3 }}>Confidence</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: score !== null && score >= 75 ? S.positive : S.ink3 }}>
            {score !== null ? (score >= 75 ? "High" : "Medium") : "—"}
          </span>
        </div>
        <FactorBar label="Data Completeness" score={pipeline?.dataCompleteness ?? null} />
        <FactorBar label="Prediction Confidence" score={pred?.confidenceScore !== undefined ? pred.confidenceScore * 100 : null} />
      </div>
      <MethodologyNote>
        Research ratings are based on a multi-factor model that evaluates quality, growth, valuation, stability, momentum, and risk. Scores reflect the available data and are updated periodically.
      </MethodologyNote>
    </PremiumCard>
  );
}

function NewsCard() {
  return (
    <PremiumCard padding="20px">
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Newspaper size={14} color={S.ink3} />
        <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>Latest News</span>
      </div>
      <EmptyProductState
        title="No major updates to review here yet"
        body="News will appear here as it becomes available."
      />
    </PremiumCard>
  );
}

function KeyMetricsCard({ pipeline }: { pipeline: PipelineResult | null }) {
  const metrics = [
    { label: "Market Cap", value: pipeline?.price?.marketCap !== null ? `₹${((pipeline?.price?.marketCap ?? 0) / 1e7).toFixed(0)}Cr` : "—" },
    { label: "P/E Ratio", value: pipeline?.fundamentals?.peRatio !== null ? pipeline?.fundamentals?.peRatio!.toFixed(1) : "—" },
    { label: "P/B Ratio", value: pipeline?.fundamentals?.pbRatio !== null ? pipeline?.fundamentals?.pbRatio!.toFixed(1) : "—" },
    { label: "EPS (TTM)", value: pipeline?.fundamentals?.eps !== null ? `₹${pipeline?.fundamentals?.eps!.toFixed(2)}` : "—" },
    { label: "Dividend Yield", value: pipeline?.fundamentals?.dividendYield !== null ? `${(pipeline?.fundamentals?.dividendYield! * 100).toFixed(2)}%` : "—" },
    { label: "Sector", value: pipeline?.sector ?? "—" },
  ];
  return (
    <PremiumCard padding="20px">
      <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, marginBottom: 14 }}>Key Metrics</div>
      {metrics.map(m => (
        <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${S.borderSoft}` }}>
          <span style={{ fontSize: 11, color: S.ink3 }}>{m.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: S.ink, fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
        </div>
      ))}
    </PremiumCard>
  );
}

function ResearchSummaryCard({ pipeline }: { pipeline: PipelineResult | null }) {
  const pred = pipeline?.prediction ?? null;
  const factors = pred?.factorScores ?? [];
  if (!factors.length) return null;
  return (
    <PremiumCard padding="20px" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, marginBottom: 14 }}>Research Summary</div>
      <FactorBreakdownBars factors={factors} />
    </PremiumCard>
  );
}

/* ── Main page ──────────────────────────── */

export default function StockStoryPageF0(): JSX.Element {
  const [ticker, setTicker] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return (p.get("id") ?? p.get("ticker") ?? "").toUpperCase().trim();
  });
  const { pipeline, loading, error } = useStockData(ticker || null);
  const [tracked, setTracked] = useState(() => isTracked(ticker));
  const [activeTab, setActiveTab] = useState("Thesis");
  const [investOpen, setInvestOpen] = useState(false);
  const [brokerOpen, setBrokerOpen] = useState(false);
  const mobile = useResponsive();

  useEffect(() => {
    const onUrl = () => {
      const p = new URLSearchParams(window.location.search);
      const sym = (p.get("id") ?? p.get("ticker") ?? "").toUpperCase().trim();
      if (sym && sym !== ticker) setTicker(sym);
    };
    window.addEventListener("urlchange", onUrl);
    window.addEventListener("popstate", onUrl);
    return () => { window.removeEventListener("urlchange", onUrl); window.removeEventListener("popstate", onUrl); };
  }, [ticker]);

  const pred = pipeline?.prediction ?? null;
  const factors = pred?.factorScores ?? [];
  const score = pred?.rankingScore ?? null;
  const cls = pred?.classification ?? "INSUFFICIENT_DATA";

  const weightedScore = useMemo(() => {
    if (!factors.length) return score;
    const weights: Record<string, number> = { quality: 0.22, valuation: 0.18, growth: 0.20, stability: 0.12, momentum: 0.13, risk: 0.15 };
    let total = 0;
    for (const fs of factors) {
      if (fs.value !== null) total += fs.value * (weights[fs.group] ?? 0);
    }
    return Math.round(total);
  }, [factors, score]);

  const displayScore = score ?? weightedScore;

  const samplePrices = useMemo(() => {
    if (pipeline?.technicals?.closePrices?.length) return pipeline.technicals.closePrices.slice(-200);
    return [];
  }, [pipeline]);

  const handleTrack = () => {
    if (isTracked(ticker)) {
      removeTrackedCompany(ticker);
    } else {
      addTrackedCompany({ symbol: ticker, companyName: pipeline?.companyName ?? "", addedAt: new Date().toISOString(), source: "stock_page" });
    }
    setTracked(!tracked);
  };
  const handleCompare = () => productNavigate("compare", ticker);
  const handleInvest = () => setInvestOpen(true);

  if (!ticker) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <EmptyProductState title="No stock selected" body="Go back and search for a symbol to research." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg }}>
      <PremiumTopNav />
      <MarketTickerStrip />

      <main style={{ maxWidth: S.container, margin: "0 auto", padding: mobile ? "0 16px" : "0 52px", paddingTop: 24 }}>
        {/* Breadcrumb */}
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: S.ink3, marginBottom: 16 }}>
            <button onClick={() => productNavigate("landing")} style={{ border: "none", background: "none", cursor: "pointer", color: S.ink3 }}>Home</button>
            <ChevronRight size={10} />
            <span>Research</span>
            <ChevronRight size={10} />
            <span>{pipeline?.sector ?? "Sector"}</span>
            <ChevronRight size={10} />
            <span style={{ color: S.ink, fontWeight: 600 }}>{ticker}</span>
          </div>
        )}

        {/* Hero */}
        <HeroSection
          ticker={ticker} pipeline={pipeline} tracked={tracked}
          onTrack={handleTrack} onCompare={handleCompare} onInvest={handleInvest}
          mobile={mobile}
        />

        {/* Tabs */}
        <ResearchTabBar tabs={TAB_ITEMS} activeTab={activeTab} onChange={setActiveTab} />

        {error && !pipeline && (
          <div style={{ padding: "12px 16px", background: S.negativeSoft, border: `1px solid ${S.negative}20`, borderRadius: S.radiusSm, fontSize: 12, color: S.negative, margin: "16px 0" }}>
            <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {error}
          </div>
        )}

        {/* Content Grid */}
        <div style={{
          display: "flex", gap: 16, marginTop: 20, alignItems: "flex-start",
          flexDirection: mobile ? "column" : "row",
        }}>
          {/* Main Content */}
          <div style={{ flex: mobile ? "none" : 1, minWidth: 0, width: mobile ? "100%" : undefined }}>
            {activeTab === "Thesis" && (
              <>
                <ThesisFairValueRow pipeline={pipeline} onInvest={handleInvest} />

                {/* Performance Chart */}
                <PremiumCard padding="20px" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>Performance</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["1M", "3M", "6M", "1Y", "5Y"].map(p => (
                        <button key={p} style={{
                          padding: "4px 10px", fontSize: 10, fontWeight: 500, color: p === "1Y" ? S.ink : S.ink3,
                          border: `1px solid ${p === "1Y" ? S.border : "transparent"}`, borderRadius: S.radiusXs,
                          background: p === "1Y" ? S.borderSoft : "transparent", cursor: "pointer",
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <PerformanceChart data={samplePrices} height={mobile ? 120 : 180} />
                </PremiumCard>

                {/* Fundamentals Snapshot */}
                <PremiumCard padding="20px" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, marginBottom: 14 }}>Fundamentals Snapshot</div>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 16 }}>
                    {[
                      { label: "ROIC", value: pipeline?.fundamentals?.roic !== null ? `${(pipeline?.fundamentals?.roic! * 100).toFixed(1)}%` : "—" },
                      { label: "Op. Margin", value: pipeline?.fundamentals?.operatingMargin !== null ? `${(pipeline?.fundamentals?.operatingMargin! * 100).toFixed(1)}%` : "—" },
                      { label: "ROE", value: pipeline?.fundamentals?.roe !== null ? `${(pipeline?.fundamentals?.roe! * 100).toFixed(1)}%` : "—" },
                      { label: "Debt/Equity", value: pipeline?.fundamentals?.debtToEquity !== null ? pipeline?.fundamentals?.debtToEquity!.toFixed(2) : "—" },
                      { label: "Revenue Growth", value: pipeline?.fundamentals?.revenueGrowth !== null ? `${(pipeline?.fundamentals?.revenueGrowth! * 100).toFixed(1)}%` : "—" },
                      { label: "P/E Ratio", value: pipeline?.fundamentals?.peRatio !== null ? pipeline?.fundamentals?.peRatio!.toFixed(1) : "—" },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize: 10, color: S.ink4, marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </PremiumCard>

                {/* Strengths vs Risks */}
                <StrengthsRisksCard pipeline={pipeline} />

                {/* Research Summary */}
                <ResearchSummaryCard pipeline={pipeline} />
              </>
            )}

            {activeTab === "Fundamentals" && (
              <PremiumCard padding="20px">
                <EmptyProductState
                  title="Detailed fundamentals view is being prepared"
                  body="Expanded financial analysis with historical trends and peer comparisons will be available soon."
                />
              </PremiumCard>
            )}
            {activeTab === "Financials" && (
              <PremiumCard padding="20px">
                <EmptyProductState
                  title="Financial statements view is being prepared"
                  body="Income statement, balance sheet, and cash flow data with multi-year comparisons will be available soon."
                />
              </PremiumCard>
            )}
            {activeTab === "Risks" && (
              <PremiumCard padding="20px">
                <EmptyProductState
                  title="Risk analysis view is being prepared"
                  body="A comprehensive risk assessment covering business, financial, and market risks will be available soon."
                />
              </PremiumCard>
            )}
            {activeTab === "Technicals" && (
              <PremiumCard padding="20px">
                <EmptyProductState
                  title="Technical analysis view is being prepared"
                  body="Chart patterns, indicators, and momentum analysis will be available soon."
                />
              </PremiumCard>
            )}
            {activeTab === "News" && (
              <PremiumCard padding="20px">
                <EmptyProductState
                  title="News feed is being prepared"
                  body="Company-specific news, announcements, and media mentions will appear here."
                />
              </PremiumCard>
            )}
            {activeTab === "Peers" && (
              <PremiumCard padding="20px">
                <EmptyProductState
                  title="Peer comparison view is being prepared"
                  body="A side-by-side comparison with industry peers across key metrics will be available soon."
                />
              </PremiumCard>
            )}
          </div>

          {/* Right Rail */}
          {!mobile && (
            <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <KeyMetricsCard pipeline={pipeline} />
              <NewsCard />
              <MethodologyCard pipeline={pipeline} score={displayScore} />
            </div>
          )}
        </div>

        {/* Mobile rail */}
        {mobile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
            <KeyMetricsCard pipeline={pipeline} />
            <NewsCard />
            <MethodologyCard pipeline={pipeline} score={displayScore} />
          </div>
        )}

        <div style={{ marginTop: 32, marginBottom: 24 }}>
          <SebiDisclaimer variant="footer" />
        </div>
      </main>

      {/* Invest Review Sheet */}
      <InvestmentReviewSheet
        open={investOpen}
        onClose={() => setInvestOpen(false)}
        symbol={ticker}
        companyName={pipeline?.companyName ?? undefined}
      />

      {/* Broker Handoff */}
      <BrokerHandoffSheet
        open={brokerOpen}
        onClose={() => setBrokerOpen(false)}
        symbol={ticker}
      />
    </div>
  );
}
