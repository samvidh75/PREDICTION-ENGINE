import React from "react";
import { Search, BarChart3, Shield, BookOpen, ArrowRightLeft, Scale, Check, AlertTriangle, Sparkles, TrendingUp, TrendingDown, Brain, Eye } from "lucide-react";
import { PremiumAppShell, PremiumCard, FactorBar, ScoreRing, EmptyProductState, ProductPageHeader, MethodologyNote, MobileProductNav } from "../premium/PremiumComponents";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";
import { productNavigate } from "../components/product/ProductUI";

const S = {
  bg: "var(--ss-bg)",
  bgSoft: "var(--ss-bg-soft)",
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
  cautionSoft: "var(--ss-caution-soft)",
  action: "var(--ss-action)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
};

const convictionLevels = [
  {
    label: "High Conviction",
    desc: "Strong scores across most factors with consistent alignment. Represents the highest level of research support.",
    color: S.positive,
    bg: S.positiveSoft,
    icon: Sparkles,
  },
  {
    label: "Research",
    desc: "Good overall scores with room for monitoring. Most factors are favourable but some dimensions need observation.",
    color: S.ink,
    bg: S.bgSoft,
    icon: Brain,
  },
  {
    label: "Watch",
    desc: "Mixed signals across factors. Some dimensions show strength while others raise questions. Needs attention.",
    color: S.caution,
    bg: S.cautionSoft,
    icon: Eye,
  },
  {
    label: "Needs Review",
    desc: "Deteriorating factor scores or elevated risk signals warrant a closer look before proceeding.",
    color: S.caution,
    bg: S.cautionSoft,
    icon: AlertTriangle,
  },
  {
    label: "Risk Rising",
    desc: "Multiple risk flags — high leverage, weak cash buffers, or persistent negative momentum. Significant caution advised.",
    color: S.negative,
    bg: S.negativeSoft,
    icon: TrendingDown,
  },
];

const checklistItems = [
  "Read the full company thesis and understand the narrative",
  "Compare with peer companies in the same sector",
  "Review key risk factors and their trajectory",
  "Understand the valuation context relative to history and peers",
  "Use broker flow only after your own review is complete",
];

const responsibleUseItems = [
  "StockStory is not a guarantee of future returns",
  "Research scores are not personalised financial advice",
  "Consult a qualified adviser where appropriate",
  "All investments carry market risk",
  "Always do your own research before investing",
];

const TrustCentrePage: React.FC = () => {
  return (
    <>
      <PremiumAppShell activePage="research">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <ProductPageHeader
            title="How StockStory thinks"
            description="Research methodology and responsible use guide."
          />

          {/* ─── Research, Not Guarantees ─── */}
          <PremiumCard padding="28px" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <Shield size={20} color={S.ink} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: S.ink, margin: 0, letterSpacing: "-0.2px" }}>Research, not guarantees</h2>
                <p style={{ fontSize: 13, color: S.ink3, lineHeight: 1.7, margin: "10px 0 0 0" }}>
                  StockStory helps you understand businesses before investing. Our scores and signals are research aids designed to surface a structured view of a company's fundamentals — not guarantees of future performance. Every final decision requires your own review, risk assessment, and personal context. Execution happens with your broker, not on this platform. Nothing here constitutes personalised financial advice.
                </p>
              </div>
            </div>
          </PremiumCard>

          {/* ─── Five Core Factors ─── */}
          <PremiumCard padding="28px" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <BarChart3 size={20} color={S.ink} style={{ marginTop: 2, flexShrink: 0 }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: S.ink, margin: 0, letterSpacing: "-0.2px" }}>The five core factors</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                padding: 16, borderRadius: S.radiusSm, border: `1px solid ${S.borderSoft}`,
                background: S.bgSoft,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <TrendingUp size={14} color={S.positive} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: S.ink, margin: 0 }}>Quality</h3>
                </div>
                <p style={{ fontSize: 12, color: S.ink3, lineHeight: 1.6, margin: "4px 0 0 0" }}>How efficiently the company generates returns — profitability, margins, and asset efficiency.</p>
              </div>
              <div style={{
                padding: 16, borderRadius: S.radiusSm, border: `1px solid ${S.borderSoft}`,
                background: S.bgSoft,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <TrendingUp size={14} color={S.positive} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: S.ink, margin: 0 }}>Growth</h3>
                </div>
                <p style={{ fontSize: 12, color: S.ink3, lineHeight: 1.6, margin: "4px 0 0 0" }}>Revenue, earnings, and cash flow trajectory over time.</p>
              </div>
              <div style={{
                padding: 16, borderRadius: S.radiusSm, border: `1px solid ${S.borderSoft}`,
                background: S.bgSoft,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Scale size={14} color={S.ink} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: S.ink, margin: 0 }}>Valuation</h3>
                </div>
                <p style={{ fontSize: 12, color: S.ink3, lineHeight: 1.6, margin: "4px 0 0 0" }}>Pricing relative to earnings, book value, and cash yields — contextualised against peers.</p>
              </div>
              <div style={{
                padding: 16, borderRadius: S.radiusSm, border: `1px solid ${S.borderSoft}`,
                background: S.bgSoft,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Shield size={14} color={S.caution} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: S.ink, margin: 0 }}>Risk</h3>
                </div>
                <p style={{ fontSize: 12, color: S.ink3, lineHeight: 1.6, margin: "4px 0 0 0" }}>Leverage levels, cash buffers, accounting consistency, and price volatility.</p>
              </div>
              <div style={{
                padding: 16, borderRadius: S.radiusSm, border: `1px solid ${S.borderSoft}`,
                background: S.bgSoft,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <TrendingDown size={14} color={S.ink} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: S.ink, margin: 0 }}>Momentum</h3>
                </div>
                <p style={{ fontSize: 12, color: S.ink3, lineHeight: 1.6, margin: "4px 0 0 0" }}>Price trend strength and relative market performance.</p>
              </div>
            </div>
          </PremiumCard>

          {/* ─── How to Read Conviction ─── */}
          <PremiumCard padding="28px" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <Brain size={20} color={S.ink} style={{ marginTop: 2, flexShrink: 0 }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: S.ink, margin: 0, letterSpacing: "-0.2px" }}>How to read conviction</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {convictionLevels.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} style={{
                    display: "flex", gap: 12, padding: "12px 14px", borderRadius: S.radiusSm,
                    border: `1px solid ${S.borderSoft}`, background: c.bg,
                  }}>
                    <Icon size={16} color={c.color} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.label}</span>
                      <p style={{ fontSize: 12, color: S.ink3, lineHeight: 1.6, margin: "3px 0 0 0" }}>{c.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14 }}>
              <MethodologyNote>
                StockStory does not use Buy, Hold, or Sell language. Conviction levels reflect the consistency and breadth of available research signals, not price predictions.
              </MethodologyNote>
            </div>
          </PremiumCard>

          {/* ─── Before You Invest ─── */}
          <PremiumCard padding="28px" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <Check size={20} color={S.positive} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: S.ink, margin: 0, letterSpacing: "-0.2px" }}>Before you invest</h2>
                <p style={{ fontSize: 12, color: S.ink3, margin: "6px 0 12px 0" }}>
                  Use this checklist to ground every decision:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {checklistItems.map((item) => (
                    <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Check size={12} color={S.positive} style={{ marginTop: 3, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: S.ink2, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* ─── Responsible Use ─── */}
          <PremiumCard padding="28px" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <AlertTriangle size={20} color={S.caution} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: S.ink, margin: 0, letterSpacing: "-0.2px" }}>Responsible use</h2>
                <p style={{ fontSize: 12, color: S.ink3, margin: "6px 0 14px 0" }}>
                  StockStory is a research tool. Please use it responsibly:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {responsibleUseItems.map((item) => (
                    <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: "50%", background: S.ink4,
                        marginTop: 6, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12, color: S.ink2, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* ─── Footer Methodology Note ─── */}
          <MethodologyNote>
            StockStory provides research, analysis, and educational content. Nothing on this platform constitutes investment advice, a recommendation, or solicitation to buy or sell securities. All investment decisions should be made with the advice of a qualified financial professional. Past research scores are not indicative of future results.
          </MethodologyNote>

          <div style={{ marginTop: 32 }}>
            <SebiDisclaimer variant="inline" />
          </div>
        </div>
      </PremiumAppShell>

      <MobileProductNav activePage="research" />
    </>
  );
};

export default TrustCentrePage;
