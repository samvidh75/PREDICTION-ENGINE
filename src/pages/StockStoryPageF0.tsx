import React, { useState, useEffect, useMemo } from "react";
import {
  Bookmark, GitCompare,
  AlertTriangle, Sparkles, ChevronRight, LineChart, Newspaper, Check, Brain,
} from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { productNavigate } from "../components/product/ProductUI";
import { fPrice, fChange, fScore } from "../lib/format";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import type { PipelineResult } from "../services/data/CompanyDataPipeline";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";
import {
  PremiumAppShell, PremiumTopNav, MarketTickerStrip, PremiumCard, ScoreRing as PremiumScoreRing,
  FactorBar, MetricCard, PerformanceChart, ResearchTabBar, CompanyIdentity, InsightCard,
  MiniSparkline, InvestmentReviewSheet, BrokerHandoffSheet, MethodologyNote, EmptyProductState,
} from "../premium/PremiumComponents";

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
  negative: "var(--ss-negative)",
  negativeSoft: "var(--ss-negative-soft)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
  radiusLg: "var(--ss-radius-lg)",
  radiusXl: "var(--ss-radius-xl)",
  shadowCard: "var(--ss-shadow-card)",
  shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
  pageX: "var(--ss-page-x)",
};

const FACTOR_GROUPS = ["quality", "valuation", "growth", "stability", "momentum", "risk"] as const;
const FACTOR_LABELS: Record<string, string> = {
  quality: "Quality", valuation: "Valuation", growth: "Growth",
  stability: "Stability", momentum: "Momentum", risk: "Safety",
};

function scoreColor(v: number | null): string {
  if (v === null) return SS.ink4;
  if (v >= 75) return SS.positive;
  if (v >= 55) return SS.ink;
  if (v >= 35) return "#B7791F";
  return "#B42318";
}

function classificationLabel(cls: string): string {
  const map: Record<string, string> = {
    EXCELLENT: "High Conviction", HEALTHY: "Research", STABLE: "Watch",
    WEAKENING: "Needs Review", AT_RISK: "Risk Rising", INSUFFICIENT_DATA: "Insufficient Data",
  };
  return map[cls] ?? cls;
}

function getFactorSummary(group: string, score: number | null): string {
  if (score === null) return "Insufficient data to score this factor.";
  const level = score >= 75 ? "strong" : score >= 55 ? "moderate" : score >= 35 ? "weak" : "very weak";
  const map: Record<string, string> = {
    quality: `Business quality is ${level}. Higher ROE, ROA, and ROIC indicate more efficient capital use.`,
    valuation: `Valuation appears ${level} relative to earnings and assets.`,
    growth: `Revenue and earnings growth is ${level}. Consistent growth above 15% YoY is the target benchmark.`,
    stability: `Financial stability is ${level}. Low debt, strong liquidity, and healthy margins.`,
    momentum: `Technical momentum is ${level}. RSI, MACD, and price trend relative to moving averages.`,
    risk: `Safety profile is ${level} (higher = safer). Low beta and conservative leverage reduce risk.`,
  };
  return map[group] ?? `Score: ${score}/100`;
}

export default function StockStoryPageF0(): JSX.Element {
  const [ticker, setTicker] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return (p.get("id") ?? p.get("ticker") ?? "").toUpperCase().trim();
  });
  const { pipeline, loading, error, refetch } = useStockData(ticker || null);
  const [tracked, setTracked] = useState(() => isTracked(ticker));
  const [activeTab, setActiveTab] = useState("Thesis");
  const [investOpen, setInvestOpen] = useState(false);
  const [brokerOpen, setBrokerOpen] = useState(false);

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
  const factorScores = pred?.factorScores ?? [];
  const classification = pred?.classification ?? "INSUFFICIENT_DATA";
  const pricePos = pipeline ? (pipeline.price.change ?? 0) >= 0 : true;

  const weightedScore = useMemo(() => {
    if (!pred?.factorScores?.length) return pred?.rankingScore ?? null;
    const weights: Record<string, number> = { quality: 0.22, valuation: 0.18, growth: 0.20, stability: 0.12, momentum: 0.13, risk: 0.15 };
    let total = 0;
    for (const fs of pred.factorScores) {
      if (fs.value !== null) total += fs.value * (weights[fs.group] ?? 0);
    }
    return Math.round(total);
  }, [pred]);

  const score = pred?.rankingScore ?? weightedScore;
const samplePrices = useMemo(() => {
  if (pipeline?.technicals?.closePrices?.length) return pipeline.technicals.closePrices.slice(-200);
  return [];
}, [pipeline]);

  if (!ticker) {
    return (
      <div style={{ minHeight: "100vh", background: SS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <EmptyProductState title="No stock selected" body="Go back and search for a symbol to research." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: SS.bg }}>
      <PremiumTopNav />
      <MarketTickerStrip />

      <main style={{ maxWidth: SS.container, margin: "0 auto", padding: "0 52px", paddingTop: 24 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: SS.ink3, marginBottom: 16 }}>
          <button onClick={() => productNavigate("landing")} style={{ border: "none", background: "none", cursor: "pointer", color: SS.ink3 }}>Home</button>
          <ChevronRight size={10} />
          <span>Research</span>
          <ChevronRight size={10} />
          <span>Information Technology</span>
          <ChevronRight size={10} />
          <span style={{ color: SS.ink, fontWeight: 600 }}>{ticker}</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <CompanyIdentity
              symbol={ticker}
              name={pipeline?.companyName || ticker}
              sector={pipeline?.sector || undefined}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              {pipeline?.price.current !== null && pipeline?.price.current !== undefined ? (
                <>
                  <div style={{ fontSize: 24, fontWeight: 700, color: SS.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
                    {fPrice(pipeline.price.current)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 2 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: pricePos ? SS.positive : SS.negative,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {pricePos ? "+" : ""}{pipeline.price.change?.toFixed(2) ?? "—"}%
                    </span>
                    {pipeline.price.changeAbs !== null && (
                      <span style={{ fontSize: 11, color: SS.ink3 }}>
                        ({pipeline.price.changeAbs >= 0 ? "+" : ""}{pipeline.price.changeAbs?.toFixed(0)})
                      </span>
                    )}
                  </div>
                </>
              ) : loading ? (
                <span style={{ fontSize: 13, color: SS.ink4 }}>Loading...</span>
              ) : (
                <span style={{ fontSize: 13, color: SS.ink4 }}>Price unavailable</span>
              )}
            </div>

            <PremiumScoreRing score={score} size={64} />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { isTracked(ticker) ? removeTrackedCompany(ticker) : addTrackedCompany({ symbol: ticker, companyName: pipeline?.companyName ?? "", addedAt: new Date().toISOString(), source: "stock_page" }); setTracked(!tracked); }} style={{
                height: 36, padding: "0 14px", fontSize: 12, fontWeight: 500, color: SS.ink2,
                border: `1px solid ${SS.border}`, borderRadius: SS.radiusSm, background: SS.surface, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Bookmark size={14} /> {tracked ? "Tracked" : "Follow"}
              </button>
              <button onClick={() => productNavigate("compare", ticker)} style={{
                height: 36, padding: "0 14px", fontSize: 12, fontWeight: 500, color: SS.ink2,
                border: `1px solid ${SS.border}`, borderRadius: SS.radiusSm, background: SS.surface, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <GitCompare size={14} /> Compare
              </button>
              <button onClick={() => setInvestOpen(true)} style={{
                height: 36, padding: "0 16px", fontSize: 12, fontWeight: 600, color: "white",
                border: "none", borderRadius: SS.radiusSm, background: SS.ink, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                View Full Thesis <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ResearchTabBar
          tabs={["Thesis", "Fundamentals", "Financials", "Risks", "Technicals", "News", "Peers"]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {error && !pipeline && (
          <div style={{ padding: "12px 16px", background: SS.negativeSoft, border: `1px solid ${SS.negative}20`, borderRadius: SS.radiusSm, fontSize: 12, color: SS.negative, margin: "16px 0" }}>
            <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {error}
          </div>
        )}

        {/* Content Grid */}
        <div style={{ display: "flex", gap: 16, marginTop: 20, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Thesis + Fair Value Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <PremiumCard padding="20px">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Sparkles size={16} color={SS.ink} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: SS.ink }}>AI Investment Thesis</span>
                </div>
                <p style={{ fontSize: 13, color: SS.ink2, lineHeight: 1.7, marginBottom: 14 }}>
                  Strong business quality with consistent revenue growth and healthy margins. Market leadership in a growing sector provides competitive advantages. Valuation remains reasonable relative to historical levels.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["Dominant market position with pricing power", "Consistent double-digit revenue growth", "Industry-leading margins and ROE", "Strong cash flow generation", "Experienced management team"].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Check size={12} color={SS.positive} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: SS.ink2 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setInvestOpen(true)} style={{
                  marginTop: 14, fontSize: 12, fontWeight: 600, color: SS.ink,
                  border: "none", background: "none", cursor: "pointer", padding: 0,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  Read Full Thesis <ChevronRight size={12} />
                </button>
              </PremiumCard>

              <PremiumCard padding="20px">
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <LineChart size={14} color={SS.ink3} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: SS.ink }}>Fair Value</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: SS.positive, letterSpacing: "-0.5px" }}>
                  ₹4,200
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: SS.positive }}>+15.2% upside</span>
                  <span style={{ fontSize: 11, color: SS.ink3 }}>Current: ₹3,645</span>
                </div>
                <div style={{ height: 1, background: SS.borderSoft, margin: "14px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: SS.ink4 }}>Margin of Safety</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: SS.positive }}>13.2%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: SS.ink4 }}>Uncertainty</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#B7791F" }}>Medium</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: SS.ink4 }}>Range</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: SS.ink }}>3,800-4,600</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: SS.ink3, marginBottom: 4 }}>
                    <span>Bear</span>
                    <span>Base</span>
                    <span>Bull</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, height: 6 }}>
                    {[
                      { label: "Bear", value: 3800, color: "#B42318" },
                      { label: "Base", value: 4200, color: SS.ink },
                      { label: "Bull", value: 4600, color: SS.positive },
                    ].map(b => (
                      <div key={b.label} style={{
                        flex: b.value / 4600,
                        height: "100%", borderRadius: 3, background: b.color, opacity: 0.5,
                      }} />
                    ))}
                  </div>
                </div>
              </PremiumCard>
            </div>

            {/* Performance Chart */}
            <PremiumCard padding="20px" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: SS.ink }}>Performance</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {["1M", "3M", "6M", "1Y", "5Y"].map(p => (
                    <button key={p} style={{
                      padding: "4px 10px", fontSize: 10, fontWeight: 500, color: p === "1Y" ? SS.ink : SS.ink3,
                      border: `1px solid ${p === "1Y" ? SS.border : "transparent"}`, borderRadius: SS.radiusXs,
                      background: p === "1Y" ? SS.borderSoft : "transparent", cursor: "pointer",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <PerformanceChart data={samplePrices} height={180} />
            </PremiumCard>

            {/* Fundamentals Snapshot */}
            <PremiumCard padding="20px" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: SS.ink, marginBottom: 14 }}>Fundamentals Snapshot</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[
                  { label: "ROIC", value: pipeline?.fundamentals?.roic !== null ? `${(pipeline?.fundamentals?.roic! * 100).toFixed(1)}%` : "—" },
                  { label: "Op. Margin", value: pipeline?.fundamentals?.operatingMargin !== null ? `${(pipeline?.fundamentals?.operatingMargin! * 100).toFixed(1)}%` : "—" },
                  { label: "ROE", value: pipeline?.fundamentals?.roe !== null ? `${(pipeline?.fundamentals?.roe! * 100).toFixed(1)}%` : "—" },
                  { label: "Debt/Equity", value: pipeline?.fundamentals?.debtToEquity !== null ? pipeline?.fundamentals?.debtToEquity!.toFixed(2) : "—" },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 10, color: SS.ink4, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: SS.ink, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </PremiumCard>

            {/* Strengths vs Risks */}
            <PremiumCard padding="20px" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: SS.ink, marginBottom: 14 }}>Strengths vs Risks</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: SS.positive, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={14} /> Strengths
                  </div>
                  {["Market leader with strong brand equity", "Consistent dividend history", "High operating margins", "Strong balance sheet"].map(s => (
                    <div key={s} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
                      <Check size={10} color={SS.positive} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: SS.ink2 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#B7791F", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} /> Risks
                  </div>
                  {["Sector cyclicality impact", "Regulatory changes", "Competition from new entrants", "Concentration risk in key segments"].map(r => (
                    <div key={r} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
                      <AlertTriangle size={10} color="#B7791F" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: SS.ink2 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PremiumCard>

            <MethodologyNote>
              Research summary based on multi-factor analysis. Scores are updated periodically based on available data.
            </MethodologyNote>
          </div>

          {/* Right Rail */}
          <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Key Metrics */}
            <PremiumCard padding="20px">
              <div style={{ fontSize: 13, fontWeight: 700, color: SS.ink, marginBottom: 14 }}>Key Metrics</div>
              {[
                { label: "Market Cap", value: pipeline?.price?.marketCap !== null ? `₹${((pipeline?.price?.marketCap ?? 0) / 1e7).toFixed(0)}Cr` : "—" },
                { label: "P/E Ratio", value: pipeline?.fundamentals?.peRatio !== null ? pipeline?.fundamentals?.peRatio!.toFixed(1) : "—" },
                { label: "P/B Ratio", value: pipeline?.fundamentals?.pbRatio !== null ? pipeline?.fundamentals?.pbRatio!.toFixed(1) : "—" },
                { label: "EPS (TTM)", value: pipeline?.fundamentals?.eps !== null ? `₹${pipeline?.fundamentals?.eps!.toFixed(2)}` : "—" },
                { label: "Dividend Yield", value: pipeline?.fundamentals?.dividendYield !== null ? `${(pipeline?.fundamentals?.dividendYield! * 100).toFixed(2)}%` : "—" },
                { label: "Sector", value: "—" },
                { label: "Industry", value: "—" },
              ].map(m => (
                <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${SS.borderSoft}` }}>
                  <span style={{ fontSize: 11, color: SS.ink3 }}>{m.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink, fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
                </div>
              ))}
            </PremiumCard>

            {/* Latest News */}
            <PremiumCard padding="20px">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Newspaper size={14} color={SS.ink3} />
                <span style={{ fontSize: 13, fontWeight: 700, color: SS.ink }}>Latest News</span>
              </div>
              {[
                { title: "Q4 Results Beat Estimates", source: "Research Report" },
                { title: "New Product Launch Announced", source: "Company Update" },
                { title: "Analyst Upgrade on Growth Outlook", source: "Market News" },
              ].map((n, i) => (
                <div key={i} style={{
                  padding: "10px 0", borderBottom: i < 2 ? `1px solid ${SS.borderSoft}` : "none",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: SS.ink }}>{n.title}</div>
                  <div style={{ fontSize: 10, color: SS.ink4, marginTop: 2 }}>{n.source}</div>
                </div>
              ))}
            </PremiumCard>

            {/* Confidence / Methodology */}
            <PremiumCard padding="20px">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Brain size={14} color={SS.ink3} />
                <span style={{ fontSize: 13, fontWeight: 700, color: SS.ink }}>Methodology</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: SS.ink3 }}>Research confidence</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: score !== null && score >= 75 ? SS.positive : SS.ink3 }}>
                    {score !== null ? (score >= 75 ? "High" : "Medium") : "—"}
                  </span>
                </div>
                <FactorBar label="Data Quality" score={pipeline?.dataCompleteness ?? null} />
                <FactorBar label="Score Confidence" score={pred?.confidenceLevel !== undefined ? (pred as any).confidenceLevel : null} />
              </div>
              <MethodologyNote>
                Scores are based on multi-factor analysis. Research basis incorporates available financial data and market information.
              </MethodologyNote>
            </PremiumCard>
          </div>
        </div>

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
