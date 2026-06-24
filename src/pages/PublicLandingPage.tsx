import React, { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Brain, TrendingUp, Shield, Star, LineChart, Sparkles, Activity, RefreshCw, Check } from "lucide-react";
import { productNavigate } from "../components/product/ProductUI";
import {
  PremiumCard, ScoreRing, FactorBar, MiniSparkline, PerformanceChart, MarketTickerStrip, PremiumTopNav,
} from "../premium/PremiumComponents";
import { runCompanyDataPipeline } from "../services/data/CompanyDataPipeline";
import type { PipelineResult } from "../services/data/CompanyDataPipeline";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";

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
  radiusLg: "var(--ss-radius-lg)",
  radiusXl: "var(--ss-radius-xl)",
  shadowCard: "var(--ss-shadow-card)",
  shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
};

const PREVIEW_SYMBOLS = ["TCS", "RELIANCE", "INFY"];

function scoreColor(v: number | null): string {
  if (v === null) return SS.ink4;
  if (v >= 70) return SS.positive;
  if (v >= 55) return SS.ink;
  if (v >= 40) return "#B7791F";
  return "#B42318";
}

function MiniScoreRing({ score }: { score: number | null }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = scoreColor(score);
  return (
    <svg width={40} height={40} viewBox="0 0 40 40">
      <circle cx={20} cy={20} r={r} fill="none" stroke={SS.borderSoft} strokeWidth={5} />
      <circle cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
        strokeLinecap="round" transform="rotate(-90 20 20)" />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={10} fontWeight="700" fill={color}>
        {score !== null ? Math.round(score) : "—"}
      </text>
    </svg>
  );
}

function RealScoresPanel(): JSX.Element {
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(PREVIEW_SYMBOLS.map(s => runCompanyDataPipeline(s))).then(settled => {
      if (cancelled) return;
      const map: Record<string, PipelineResult | null> = {};
      PREVIEW_SYMBOLS.forEach((s, i) => {
        map[s] = settled[i].status === "fulfilled" ? settled[i].value : null;
      });
      setResults(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      background: SS.surface, borderRadius: SS.radiusMd,
      border: `1px solid ${SS.borderSoft}`, padding: 20,
      boxShadow: SS.shadowCard,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: SS.ink3 }}>Live Research Scores</span>
        <span style={{ fontSize: 9, color: SS.ink4 }}>Nifty 50 · Multi-factor</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PREVIEW_SYMBOLS.map(sym => {
          const r = results[sym];
          const score = r?.prediction?.rankingScore ?? null;
          const name = r?.companyName ?? sym;
          const price = r?.price.current;
          const change = r?.price.change;
          return (
            <div key={sym} style={{
              display: "flex", alignItems: "center", gap: 12, padding: 12,
              borderRadius: SS.radiusSm, background: SS.borderSoft, border: `1px solid ${SS.borderSoft}`,
            }}>
              {loading ? (
                <RefreshCw size={16} color={SS.ink4} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <MiniScoreRing score={score} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: SS.ink }}>{sym}</span>
                  <span style={{ fontSize: 10, color: SS.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name !== sym ? name : ""}
                  </span>
                </div>
                {price !== null && price !== undefined && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: SS.ink }}>
                      ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    {change !== null && change !== undefined && (
                      <span style={{ fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: change >= 0 ? SS.positive : "#B42318" }}>
                        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => productNavigate("stock", sym)} style={{
                fontSize: 10, fontWeight: 600, color: SS.ink, border: "none", background: "none", cursor: "pointer", flexShrink: 0,
              }}>
                Research →
              </button>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 9, color: SS.ink4, textAlign: "center", marginTop: 10, marginBottom: 0 }}>
        For educational purposes only. Not investment advice.
      </p>
    </div>
  );
}

function HeroDashboardCluster(): JSX.Element {
  const [scores, setScores] = useState<Record<string, PipelineResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(["TCS", "HDFCBANK"].map(s => runCompanyDataPipeline(s))).then(settled => {
      if (cancelled) return;
      const map: Record<string, PipelineResult | null> = {};
      ["TCS", "HDFCBANK"].forEach((s, i) => {
        map[s] = settled[i].status === "fulfilled" ? settled[i].value : null;
      });
      setScores(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const tcs = scores["TCS"];
  const hdfc = scores["HDFCBANK"];
  const tcsScore = tcs?.prediction?.rankingScore ?? null;
  const hdfcScore = hdfc?.prediction?.rankingScore ?? null;
  const factorScores = hdfc?.prediction?.factorScores ?? [];
  const tcsPrices = tcs?.technicals?.closePrices ?? [];
  const hdfcPrices = hdfc?.technicals?.closePrices ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>HDFCBANK Score</span>
          <Sparkles size={14} color={SS.ink3} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing score={hdfcScore} size={72} />
          <div style={{ flex: 1 }}>
            <FactorBar label="Quality" score={factorScores.find(f => f.group === "quality")?.value ?? null} />
            <FactorBar label="Growth" score={factorScores.find(f => f.group === "growth")?.value ?? null} />
            <FactorBar label="Valuation" score={factorScores.find(f => f.group === "valuation")?.value ?? null} />
            <FactorBar label="Risk" score={factorScores.find(f => f.group === "risk")?.value ?? null} />
          </div>
        </div>
      </PremiumCard>

      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>Market Overview</span>
          <LineChart size={14} color={SS.ink3} />
        </div>
        <div style={{ height: 100 }}>
          {tcsPrices.length > 0 ? (
            <PerformanceChart data={tcsPrices.slice(-60)} height={100} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: SS.ink4 }}>
              Chart will appear here
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 10, color: SS.ink4 }}>6M Performance</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.positive }}>+12.4%</span>
        </div>
      </PremiumCard>

      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Brain size={14} color={SS.ink3} />
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>AI Insight</span>
        </div>
        <p style={{ fontSize: 12, color: SS.ink2, lineHeight: 1.6, margin: 0 }}>
          Strong earnings quality and improving margins support the positive thesis. Valuation remains reasonable relative to historical averages.
        </p>
        <button onClick={() => productNavigate("stock", "TCS")} style={{
          marginTop: 10, fontSize: 11, fontWeight: 600, color: SS.ink,
          border: "none", background: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          Read full thesis <ArrowRight size={12} />
        </button>
      </PremiumCard>

      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>Performance</span>
          <BarChart3 size={14} color={SS.ink3} />
        </div>
        <div style={{ height: 60, display: "flex", gap: 8 }}>
          {tcsPrices.length > 0 && (
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, color: SS.ink4, display: "block", marginBottom: 4 }}>TCS</span>
              <MiniSparkline data={tcsPrices.slice(-60)} height={40} />
            </div>
          )}
          {hdfcPrices.length > 0 && (
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, color: SS.ink4, display: "block", marginBottom: 4 }}>HDFCBANK</span>
              <MiniSparkline data={hdfcPrices.slice(-60)} height={40} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 10, color: SS.ink4 }}>5Y Performance</span>
          <span style={{ fontSize: 10, color: SS.ink4 }}>TCS vs HDFCBANK</span>
        </div>
      </PremiumCard>
    </div>
  );
}

export const PublicLandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", background: SS.bg }}>
      <PremiumTopNav activePage="research" />
      <MarketTickerStrip />

      <main style={{ maxWidth: SS.container, margin: "0 auto", padding: "0 52px", paddingTop: 40 }}>
        {/* Hero Grid */}
        <section style={{ display: "grid", gridTemplateColumns: "0.4fr 0.6fr", gap: 24, marginBottom: 64 }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 100, background: SS.positiveSoft,
              border: `1px solid ${SS.positive}20`,
              fontSize: 10, fontWeight: 600, color: SS.positive, textTransform: "uppercase", letterSpacing: "0.8px",
              marginBottom: 20, width: "fit-content",
            }}>
              <Sparkles size={12} />
              AI-POWERED STOCK INTELLIGENCE
            </div>
            <h1 style={{
              fontSize: 56, fontWeight: 750, lineHeight: 1.03, letterSpacing: "-2px",
              color: SS.ink, margin: 0,
            }}>
              Understand businesses. Invest better.
            </h1>
            <p style={{
              fontSize: 15, color: SS.ink2, lineHeight: 1.7, marginTop: 16, maxWidth: 480,
            }}>
              StockStory India uses AI and deep financial research to help you understand businesses before you buy stocks.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => productNavigate("pricing")} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", fontSize: 14, fontWeight: 600, color: "white",
                border: "none", borderRadius: SS.radiusSm, background: SS.ink, cursor: "pointer",
              }}>
                Start Free Trial <ArrowRight size={16} />
              </button>
              <button onClick={() => productNavigate("scanner")} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", fontSize: 14, fontWeight: 600, color: SS.ink2,
                border: `1px solid ${SS.border}`, borderRadius: SS.radiusSm, background: "transparent", cursor: "pointer",
              }}>
                Explore Scanner
              </button>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={12} color={SS.positive} />
                <span style={{ fontSize: 11, color: SS.ink3 }}>No credit card required</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={12} color={SS.positive} />
                <span style={{ fontSize: 11, color: SS.ink3 }}>Cancel anytime</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={12} color={SS.positive} />
                <span style={{ fontSize: 11, color: SS.ink3 }}>Built for research</span>
              </div>
            </div>
          </div>

          <div>
            <HeroDashboardCluster />
          </div>
        </section>

        {/* Research Every Nifty 50 Company */}
        <section style={{ marginBottom: 64, textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: SS.ink, margin: 0, letterSpacing: "-1px" }}>
            Research every Nifty 50 company
          </h2>
          <p style={{ fontSize: 14, color: SS.ink3, marginTop: 8, marginBottom: 32 }}>
            Deep, structured research across five key factors
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            {[
              { icon: <Star size={16} />, name: "Quality", desc: "ROE, margins, and earnings consistency", score: 82 },
              { icon: <TrendingUp size={16} />, name: "Growth", desc: "Revenue and profit trajectory", score: 74 },
              { icon: <BarChart3 size={16} />, name: "Valuation", desc: "PE, PB, and EV/EBITDA context", score: 65 },
              { icon: <Shield size={16} />, name: "Risk", desc: "Debt, volatility, and downside", score: 78 },
              { icon: <Activity size={16} />, name: "Momentum", desc: "Price trend and technical signals", score: 71 },
            ].map(f => (
              <PremiumCard key={f.name} padding="20px">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: scoreColor(f.score) }}>{f.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: SS.ink }}>{f.name}</span>
                </div>
                <ScoreRing score={f.score} size={56} />
                <p style={{ fontSize: 11, color: SS.ink3, margin: "8px 0 0 0", lineHeight: 1.5 }}>{f.desc}</p>
              </PremiumCard>
            ))}
          </div>
        </section>

        {/* Trust Strip */}
        <section style={{ marginBottom: 64 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
            padding: "32px 24px", borderRadius: SS.radiusMd,
            background: SS.surface, border: `1px solid ${SS.borderSoft}`,
          }}>
            {[
              { icon: <Brain size={20} />, title: "Research engine", desc: "Structured thesis tracking across all Nifty 50 companies" },
              { icon: <Shield size={20} />, title: "Model validation", desc: "Consistent multi-factor scoring methodology" },
              { icon: <BarChart3 size={20} />, title: "Daily research workflow", desc: "Updated scores and insights for informed decisions" },
            ].map(item => (
              <div key={item.title} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
                <span style={{ color: SS.ink }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: SS.ink }}>{item.title}</span>
                <span style={{ fontSize: 11, color: SS.ink3, lineHeight: 1.5 }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <SebiDisclaimer variant="footer" />
        <div style={{ marginTop: 8, paddingBottom: 24 }}>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: SS.ink4 }}>
            <button onClick={() => productNavigate("terms")} style={{ border: "none", background: "none", cursor: "pointer", color: SS.ink4 }}>Terms & Disclosures</button>
            <button onClick={() => productNavigate("methodology")} style={{ border: "none", background: "none", cursor: "pointer", color: SS.ink4 }}>Research Standards</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicLandingPage;
