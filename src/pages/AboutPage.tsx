import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  LineChart,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { colors, layout, radius, space, typography } from "../design/tokens";

type FeatureCard = {
  title: string;
  body: string;
  icon: LucideIcon;
};

type StatCard = {
  label: string;
  value: string;
  body: string;
};

const featureCards: FeatureCard[] = [
  {
    title: "Research",
    body: "Company pages keep fundamentals, market context, and evidence in one view so investors can review faster.",
    icon: Search,
  },
  {
    title: "Thesis",
    body: "We organize what changed, why it matters, and what deserves a second look before conviction increases.",
    icon: Brain,
  },
  {
    title: "Compare",
    body: "Peer and sector views make it easier to compare quality, valuation, and momentum without losing context.",
    icon: BarChart3,
  },
  {
    title: "Risk",
    body: "Debt, drawdown, freshness, and volatility signals stay visible so the downside case is part of the workflow.",
    icon: ShieldCheck,
  },
];

const statCards: StatCard[] = [
  {
    label: "Coverage",
    value: "1,500+",
    body: "Indian equities organized for discovery, review, and tracking.",
  },
  {
    label: "Methodology",
    value: "150+",
    body: "Factor families across quality, valuation, momentum, and risk.",
  },
  {
    label: "Workflow",
    value: "Research-first",
    body: "Designed for Review, Compare, Track, and thesis follow-through.",
  },
];

const methodSteps = [
  "Live market data stays separate from explanatory research language.",
  "Signals are presented as context for review, not execution prompts.",
  "Peer comparison, risk, and thesis changes are surfaced together.",
  "Users can move from search into deeper company review without breaking context.",
];

function NavButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: radius.md,
        border: "none",
        background: "transparent",
        color: active ? colors.textPrimary : colors.textSecondary,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
      }}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </button>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.canvas,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
      }}
    >
      <style>{`
        .about-shell {
          max-width: ${layout.contentMaxWidth};
          margin: 0 auto;
          padding: 0 ${layout.pagePaddingDesktop};
        }

        .about-card {
          background: ${colors.surface};
          border: 1px solid ${colors.border};
          border-radius: ${radius.lg};
        }

        .about-feature-grid,
        .about-stat-grid {
          display: grid;
          gap: ${space[4]};
        }

        .about-feature-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .about-stat-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .about-method-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
          gap: ${space[6]};
          align-items: start;
        }

        .about-fade {
          animation: aboutFade 280ms ease-out;
        }

        @keyframes aboutFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .about-feature-grid,
          .about-stat-grid,
          .about-method-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .about-shell {
            padding: 0 16px;
          }

          .about-nav {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .about-nav-links {
            display: none !important;
          }

          .about-hero-title {
            font-size: 40px !important;
          }

          .about-section {
            padding-top: 40px !important;
            padding-bottom: 40px !important;
          }
        }
      `}</style>

      <header
        className="about-nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: `1px solid ${colors.hairlineSoft}`,
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: colors.backdropGlassmorphic,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: colors.textPrimary,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            height: "auto",
          }}
          aria-label="StockStory India home"
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${colors.heroStripeStart}, ${colors.heroStripeEnd})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: colors.onDark,
              flex: "0 0 auto",
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>StockStory India</span>
        </button>

        <nav className="about-nav-links" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NavButton label="Pricing" onClick={() => navigate("/pricing")} />
          <NavButton label="Trust" onClick={() => navigate("/trust")} />
          <NavButton label="About" active onClick={() => navigate("/about")} />
        </nav>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "8px 16px",
            borderRadius: radius.md,
            border: "none",
            background: colors.primary,
            color: colors.onPrimary,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Open research
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </header>

      <main className="about-shell about-fade" style={{ paddingTop: 40, paddingBottom: 64 }}>
        <section
          className="about-section"
          style={{
            paddingTop: 24,
            paddingBottom: 56,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: radius.full,
              border: `1px solid ${colors.accentRedSoft}`,
              background: colors.accentRedSoft,
              color: colors.accentRed,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            About StockStory India
          </div>

          <h1
            className="about-hero-title"
            style={{
              margin: "0 0 16px",
              fontSize: 56,
              lineHeight: 1.1,
              fontWeight: 600,
              maxWidth: 760,
              letterSpacing: 0,
            }}
          >
            Research Indian stocks with a clearer workflow.
          </h1>

          <p
            style={{
              margin: "0 0 24px",
              maxWidth: 720,
              color: colors.textSecondary,
              fontSize: 18,
              lineHeight: 1.6,
            }}
          >
            StockStory India is a research platform for investors who want company review, thesis tracking, risk
            context, and peer comparison in one place instead of scattered across separate tools.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "10px 18px",
                borderRadius: radius.md,
                border: "none",
                background: colors.primary,
                color: colors.onPrimary,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Start research
            </button>
            <button
              onClick={() => navigate("/trust")}
              style={{
                padding: "10px 18px",
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                background: "transparent",
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Review trust notes
            </button>
          </div>
        </section>

        <section className="about-section" style={{ paddingTop: 56, paddingBottom: 56 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600 }}>What the platform is built to do</h2>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: 16, lineHeight: 1.6, maxWidth: 720 }}>
              The product language is simple by design: Research, Thesis, Compare, Track, Review, and Risk.
            </p>
          </div>

          <div className="about-feature-grid">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="about-card" style={{ padding: 24 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      background: colors.fill,
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Icon size={18} color={colors.accentRed} aria-hidden="true" />
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>{card.title}</h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14, lineHeight: 1.7 }}>{card.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-section" style={{ paddingTop: 0, paddingBottom: 56 }}>
          <div className="about-method-grid">
            <div>
              <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 600 }}>How we think about methodology</h2>
              <p style={{ margin: "0 0 20px", color: colors.textSecondary, fontSize: 16, lineHeight: 1.7 }}>
                StockStory India is designed to help investors review evidence cleanly. We keep data, interpretation,
                and risk signals legible so the thesis can evolve with less noise.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                {methodSteps.map((step) => (
                  <div key={step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <CheckCircle2 size={16} color={colors.accentRed} style={{ marginTop: 3, flex: "0 0 auto" }} />
                    <span style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 1.6 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="about-card" style={{ padding: 24 }}>
              <div style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 8 }}>Research snapshot</div>
              <h3 style={{ margin: "0 0 18px", fontSize: 20, fontWeight: 600 }}>INFY review surface</h3>
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  <span>Structural health</span>
                  <span>78 / 100</span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: radius.full,
                    background: colors.fill,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "78%",
                      height: "100%",
                      background: colors.primary,
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.textSecondary, fontSize: 14 }}>
                  <LineChart size={15} color={colors.accentRed} />
                  <span>Quality, valuation, momentum, and risk in one view</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.textSecondary, fontSize: 14 }}>
                  <BarChart3 size={15} color={colors.accentRed} />
                  <span>Peer comparison stays attached to the thesis</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.textSecondary, fontSize: 14 }}>
                  <ShieldCheck size={15} color={colors.accentRed} />
                  <span>Risk context remains visible during review</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="about-section" style={{ paddingTop: 0, paddingBottom: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600 }}>What this means in practice</h2>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: 16, lineHeight: 1.6, maxWidth: 700 }}>
              The goal is a calmer research desk, not a louder terminal. Search quickly, review deeply, and keep the
              company story intact as new information arrives.
            </p>
          </div>

          <div className="about-stat-grid">
            {statCards.map((card) => (
              <article key={card.label} className="about-card" style={{ padding: 24 }}>
                <div style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 12 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 10 }}>{card.value}</div>
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14, lineHeight: 1.7 }}>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer
        style={{
          padding: "24px",
          borderTop: `1px solid ${colors.hairlineSoft}`,
          textAlign: "center",
          fontSize: 12,
          color: colors.textTertiary,
        }}
      >
        StockStory India — Research platform for Indian equities. Not investment advice.
      </footer>
    </div>
  );
}
