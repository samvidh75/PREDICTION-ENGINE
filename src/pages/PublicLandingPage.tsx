import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, ArrowUpRight, Search, TrendingUp, Shield, Check, ChevronRight, BarChart3, Star, LineChart } from "lucide-react";
import {
  PremiumAppShell, PremiumTopNav, MarketTickerStrip, PremiumCard, ScoreRing,
  FactorBar, ScorePill, MiniSparkline, PerformanceChart, FactorChip,
  EmptyProductState, ProductPageHeader, CommandSearch,
} from "../premium/PremiumComponents";
import { productNavigate } from "../components/product/ProductUI";
import { fPrice, fChange } from "../lib/format";
import { runCompanyDataPipeline } from "../services/data/CompanyDataPipeline";
import type { PipelineResult } from "../services/data/CompanyDataPipeline";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";

const SS = {
  bg: "var(--ss-bg)",
  bgSoft: "var(--ss-bg-soft)",
  surface: "var(--ss-surface)",
  surfaceWarm: "var(--ss-surface-warm)",
  ink: "var(--ss-ink)",
  ink2: "var(--ss-ink-2)",
  ink3: "var(--ss-ink-3)",
  ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)",
  borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)",
  positiveSoft: "var(--ss-positive-soft)",
  negative: "var(--ss-negative)",
  caution: "var(--ss-caution)",
  cautionSoft: "var(--ss-caution-soft)",
  action: "var(--ss-action)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
  radiusLg: "var(--ss-radius-lg)",
  radiusXl: "var(--ss-radius-xl)",
  shadowCard: "var(--ss-shadow-card)",
  shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
};

const DEMO_SYMBOLS = ["TCS", "RELIANCE", "INFY", "HDFCBANK", "WIPRO"];

function scoreColor(v: number | null): string {
  if (v === null) return SS.ink4;
  if (v >= 75) return SS.positive;
  if (v >= 55) return SS.ink;
  if (v >= 35) return SS.caution;
  return SS.negative;
}

/* ─── HeroDashboardCluster ─── */

function HeroDashboardCluster({
  results,
  loading,
}: {
  results: Record<string, PipelineResult | null>;
  loading: boolean;
}): JSX.Element {
  const hdfc = results["HDFCBANK"];
  const tcs = results["TCS"];
  const hdfcScore = hdfc?.prediction?.rankingScore ?? null;
  const factorScores = hdfc?.prediction?.factorScores ?? [];
  const tcsPrices = tcs?.technicals?.closePrices ?? [];
  const hdfcPrices = hdfc?.technicals?.closePrices ?? [];
  const niftyChange = tcs?.price.change ?? null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>HDFCBANK Score</span>
          <Sparkles size={14} color={SS.ink3} />
        </div>
        {loading ? (
          <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: SS.ink4 }}>
            Loading scores...
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ScoreRing score={hdfcScore} size={72} />
            <div style={{ flex: 1 }}>
              <FactorBar label="Quality" score={factorScores.find(f => f.group === "quality")?.value ?? null} />
              <FactorBar label="Growth" score={factorScores.find(f => f.group === "growth")?.value ?? null} />
              <FactorBar label="Valuation" score={factorScores.find(f => f.group === "valuation")?.value ?? null} />
              <FactorBar label="Risk" score={factorScores.find(f => f.group === "risk")?.value ?? null} />
            </div>
          </div>
        )}
      </PremiumCard>

      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>Market Overview</span>
          <LineChart size={14} color={SS.ink3} />
        </div>
        <div style={{ height: 100 }}>
          {!loading && tcsPrices.length > 0 ? (
            <PerformanceChart data={tcsPrices.slice(-60)} height={100} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: SS.ink4 }}>
              {loading ? "Loading chart..." : "Chart data unavailable"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 10, color: SS.ink4 }}>6M Price Trend</span>
          <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: niftyChange !== null && niftyChange >= 0 ? SS.positive : SS.negative }}>
            {niftyChange !== null ? `${niftyChange >= 0 ? "+" : ""}${niftyChange.toFixed(2)}%` : "—"}
          </span>
        </div>
      </PremiumCard>

      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} color={SS.ink3} />
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>AI Research Insight</span>
        </div>
        <p style={{ fontSize: 12, color: SS.ink2, lineHeight: 1.6, margin: 0 }}>
          {hdfc?.prediction?.explanation ?? (
            "Multi-factor analysis scores companies across quality, growth, valuation, risk, and momentum dimensions to produce a single research score."
          )}
        </p>
        <button onClick={() => productNavigate("stock", "TCS")} style={{
          marginTop: 10, fontSize: 11, fontWeight: 600, color: SS.ink,
          border: "none", background: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          Read full thesis <ChevronRight size={12} />
        </button>
      </PremiumCard>

      <PremiumCard padding="20px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: SS.ink3 }}>5Y Performance</span>
          <BarChart3 size={14} color={SS.ink3} />
        </div>
        <div style={{ height: 60, display: "flex", gap: 8 }}>
          {!loading && tcsPrices.length > 0 && (
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, color: SS.ink4, display: "block", marginBottom: 4 }}>TCS</span>
              <MiniSparkline data={tcsPrices.slice(-60)} height={40} />
            </div>
          )}
          {!loading && hdfcPrices.length > 0 && (
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, color: SS.ink4, display: "block", marginBottom: 4 }}>HDFCBANK</span>
              <MiniSparkline data={hdfcPrices.slice(-60)} height={40} />
            </div>
          )}
          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: SS.ink4 }}>
              Loading...
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 10, color: SS.ink4 }}>5-Year Comparative</span>
          <span style={{ fontSize: 10, color: SS.ink4 }}>TCS vs HDFCBANK</span>
        </div>
      </PremiumCard>
    </div>
  );
}

/* ─── HeroSection ─── */

function HeroSection({
  results,
  loading,
}: {
  results: Record<string, PipelineResult | null>;
  loading: boolean;
}): JSX.Element {
  return (
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
            Start Free Trial <ArrowUpRight size={16} />
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
          {["No credit card required", "Cancel anytime", "Built for research not trading"].map(text => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={12} color={SS.positive} />
              <span style={{ fontSize: 11, color: SS.ink3 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <HeroDashboardCluster results={results} loading={loading} />
      </div>
    </section>
  );
}

/* ─── FactorCardGrid ─── */

function FactorCardGrid({
  results,
}: {
  results: Record<string, PipelineResult | null>;
}): JSX.Element {
  const factors = useMemo(() => {
    const allResults = Object.values(results).filter((r): r is PipelineResult => r !== null);
    const groups = ["quality", "growth", "valuation", "risk", "momentum"] as const;
    const meta: Record<string, { icon: React.ReactNode; desc: string }> = {
      quality: { icon: <Star size={16} />, desc: "ROE, margins, and earnings consistency" },
      growth: { icon: <TrendingUp size={16} />, desc: "Revenue and profit trajectory" },
      valuation: { icon: <BarChart3 size={16} />, desc: "PE, PB, and EV/EBITDA context" },
      risk: { icon: <Shield size={16} />, desc: "Debt, volatility, and downside" },
      momentum: { icon: <LineChart size={16} />, desc: "Price trend and technical signals" },
    };
    return groups.map(group => {
      const scores = allResults
        .map(r => r.prediction?.factorScores?.find(f => f.group === group)?.value ?? null)
        .filter((s): s is number => s !== null);
      const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      return { group, score: average, ...meta[group] };
    });
  }, [results]);

  return (
    <section style={{ marginBottom: 64, textAlign: "center" }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: SS.ink, margin: 0, letterSpacing: "-1px" }}>
        Research every Nifty 50 company
      </h2>
      <p style={{ fontSize: 14, color: SS.ink3, marginTop: 8, marginBottom: 32 }}>
        Deep, structured research across five key factors
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        {factors.map(f => (
          <PremiumCard key={f.group} padding="20px">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: scoreColor(f.score) }}>{f.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: SS.ink, textTransform: "capitalize" }}>{f.group}</span>
            </div>
            <ScoreRing score={f.score} size={56} />
            <p style={{ fontSize: 11, color: SS.ink3, margin: "8px 0 0 0", lineHeight: 1.5 }}>{f.desc}</p>
          </PremiumCard>
        ))}
      </div>
    </section>
  );
}

/* ─── TrustStrip ─── */

function TrustStrip(): JSX.Element {
  const items = [
    { icon: <Search size={20} />, title: "Structured research workflow", desc: "Consistent multi-factor methodology across all Nifty 50 companies" },
    { icon: <BarChart3 size={20} />, title: "Factor-led analysis", desc: "Every score traces back to fundamental and technical data points" },
    { icon: <Shield size={20} />, title: "Explainable thesis tracking", desc: "Clear reasoning behind every score and research signal" },
  ];
  return (
    <section style={{ marginBottom: 64 }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
        padding: "32px 24px", borderRadius: SS.radiusMd,
        background: SS.surface, border: `1px solid ${SS.borderSoft}`,
      }}>
        {items.map(item => (
          <div key={item.title} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
            <span style={{ color: SS.ink }}>{item.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: SS.ink }}>{item.title}</span>
            <span style={{ fontSize: 11, color: SS.ink3, lineHeight: 1.5 }}>{item.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── PublicLandingPage (default export) ─── */

const PublicLandingPage: React.FC = () => {
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(DEMO_SYMBOLS.map(s => runCompanyDataPipeline(s))).then(settled => {
      if (cancelled) return;
      const map: Record<string, PipelineResult | null> = {};
      DEMO_SYMBOLS.forEach((s, i) => {
        map[s] = settled[i].status === "fulfilled" ? settled[i].value : null;
      });
      setResults(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <PremiumAppShell activePage="research">
      <HeroSection results={results} loading={loading} />
      <FactorCardGrid results={results} />
      <TrustStrip />
      <SebiDisclaimer variant="footer" />
      <div style={{ marginTop: 8, paddingBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: SS.ink4 }}>
          <button onClick={() => productNavigate("terms")} style={{ border: "none", background: "none", cursor: "pointer", color: SS.ink4 }}>Terms & Disclosures</button>
          <button onClick={() => productNavigate("methodology")} style={{ border: "none", background: "none", cursor: "pointer", color: SS.ink4 }}>Research Standards</button>
        </div>
      </div>
    </PremiumAppShell>
  );
};

export default PublicLandingPage;
