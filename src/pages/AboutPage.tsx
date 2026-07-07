import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CandlestickChart,
  ChevronRight,
  LockKeyhole,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { colors, layout, typography } from "../design/tokens";

type ExchangeHealth = "Healthy" | "Stable" | "Weakening";

type ExchangeCard = {
  label: string;
  value: string;
  move: string;
  health: ExchangeHealth;
};

type FeatureTimelineCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  rangeProgress: number;
  rangeLabels: [string, string, string];
  columns: number[];
};

const exchangeCards: ExchangeCard[] = [
  { label: "PSE PSE Index", value: "24,842.10", move: "+0.84%", health: "Healthy" },
  { label: "PSE PSE Composite", value: "81,486.21", move: "+0.61%", health: "Stable" },
  { label: "SME Index", value: "4,936.48", move: "-0.28%", health: "Weakening" },
];

const featureTimelineCards: FeatureTimelineCard[] = [
  {
    id: "practice-terminal",
    eyebrow: "Practice Terminal",
    title: "A disciplined review surface for repeat company work.",
    body: "Healthometer layers, factor groupings, and company context stay close together so investors can review a name without bouncing between disconnected views.",
    rangeProgress: 63,
    rangeLabels: ["52W Low", "Current Vector", "52W High"],
    columns: [36, 48, 54, 72, 82],
  },
  {
    id: "market-stories",
    eyebrow: "Market Stories",
    title: "Structured narratives that explain what changed and why it matters.",
    body: "The story layer turns movements, updates, and market shifts into readable institutional language instead of fragmented alerts or commentary noise.",
    rangeProgress: 51,
    rangeLabels: ["Range Floor", "Story Position", "Range Ceiling"],
    columns: [30, 42, 58, 61, 74],
  },
  {
    id: "intelligence-scanners",
    eyebrow: "Intelligence Scanners",
    title: "Discovery tools built for deeper review, not shallow ranking theatre.",
    body: "Scanner outputs guide investors toward names worth comparing across PSE, PSE, and SME corridors before conviction is formed.",
    rangeProgress: 72,
    rangeLabels: ["Weakening", "Screened Set", "Healthy"],
    columns: [26, 40, 56, 68, 80],
  },
];

function HealthPill({ health }: { health: ExchangeHealth }) {
  const palette =
    health === "Healthy"
      ? { bg: colors.marketGreenSoft, border: "rgba(52,199,89,0.22)", text: colors.marketGreen }
      : health === "Stable"
        ? { bg: colors.backdropMuted, border: colors.hairlineStrong, text: colors.charcoal }
        : { bg: colors.marketOrangeSoft, border: "rgba(255,149,0,0.20)", text: colors.marketOrange };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 10px",
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.text,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {health}
    </span>
  );
}

function RangeBar({
  progress,
  labels,
}: {
  progress: number;
  labels: [string, string, string];
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${colors.surfaceElevated}, ${colors.surfaceCard})`,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${colors.accentRed} 0%, ${colors.accentRed} 100%)`,
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${progress}%`,
            top: "50%",
            width: 18,
            height: 18,
            marginLeft: -9,
            marginTop: -9,
            borderRadius: 999,
            background: colors.primary,
            border: `2px solid ${colors.canvas}`,
            boxShadow: "none",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          color: colors.textTertiary,
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
        <span>{labels[2]}</span>
      </div>
    </div>
  );
}

function Histogram({ columns }: { columns: number[] }) {
  const labels = ["3M", "6M", "9M", "3Y", "5Y"];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
          alignItems: "end",
          height: 124,
        }}
      >
        {columns.map((value, index) => (
          <div key={`${labels[index]}-${value}`} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <div
              style={{
                width: "100%",
                maxWidth: 38,
                height: `${value}px`,
                borderRadius: "10px 10px 4px 4px",
                background:
                  index === columns.length - 1
                    ? `linear-gradient(180deg, ${colors.primary}, ${colors.primaryPressed})`
                    : `linear-gradient(180deg, ${colors.surfaceCard}, ${colors.surfaceElevated})`,
                boxShadow: "none",
              }}
            />
            <span style={{ color: colors.textTertiary, fontSize: 11, fontWeight: 500 }}>{labels[index]}</span>
          </div>
        ))}
      </div>
      <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
        Historical performance matrix spanning 3M, 6M, 9M, 3Y, and 5Y horizons.
      </div>
    </div>
  );
}

function NavLink({
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
      aria-current={active ? "page" : undefined}
      style={{
        border: "none",
        background: "transparent",
        color: active ? colors.textPrimary : colors.textSecondary,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.02em",
        padding: "8px 10px",
        borderRadius: 10,
        cursor: "pointer",
      }}
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
          width: min(${layout.contentMaxWidth}, calc(100% - 32px));
          margin: 0 auto;
        }

        .about-glass-card {
          background: linear-gradient(180deg, ${colors.surface}, ${colors.surface});
          border: 1px solid ${colors.border};
          border-radius: 24px;
          box-shadow: none;
        }

        .about-hover-lift {
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
          will-change: transform;
        }

        .about-hover-lift:hover {
          transform: scale(1.01) translateY(-2px);
          box-shadow: none;
          border-color: ${colors.hairlineStrong};
        }

        .about-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, 0.92fr);
          gap: 28px;
          align-items: stretch;
        }

        .about-exchange-grid,
        .about-feature-grid {
          display: grid;
          gap: 14px;
        }

        .about-exchange-grid {
          grid-template-columns: 1fr;
        }

        .about-feature-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .about-timeline {
          display: grid;
          gap: 22px;
        }

        .about-timeline-card {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.85fr);
          gap: 22px;
          padding: 26px;
          align-items: center;
        }

        .about-timeline-card:nth-child(2n) {
          grid-template-columns: minmax(320px, 0.85fr) minmax(0, 0.95fr);
        }

        .about-timeline-card:nth-child(2n) .about-copy {
          order: 2;
        }

        .about-timeline-card:nth-child(2n) .about-visual {
          order: 1;
        }

        .about-reveal {
          animation: aboutReveal 360ms ease-out;
        }

        @keyframes aboutReveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 960px) {
          .about-hero-grid,
          .about-feature-grid,
          .about-timeline-card,
          .about-timeline-card:nth-child(2n) {
            grid-template-columns: 1fr;
          }

          .about-timeline-card:nth-child(2n) .about-copy,
          .about-timeline-card:nth-child(2n) .about-visual {
            order: initial;
          }
        }

        @media (max-width: 720px) {
          .about-shell {
            width: min(100% - 24px, 1180px);
          }

          .about-nav {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .about-nav-links {
            display: none !important;
          }

          .about-hero-title {
            font-size: 42px !important;
            line-height: 1.02 !important;
          }

          .about-section {
            padding-top: 42px !important;
            padding-bottom: 42px !important;
          }

          .about-health-overlay {
            position: static !important;
            margin-top: 18px;
          }
        }
      `}</style>

      <header
        className="about-nav"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: colors.canvas,
          borderBottom: `1px solid ${colors.hairlineSoft}`,
        }}
      >
        <div
          className="about-shell"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 18,
            alignItems: "center",
            minHeight: 76,
          }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: 0,
              background: "transparent",
              border: "none",
              color: colors.textPrimary,
              cursor: "pointer",
              height: "auto",
            }}
            aria-label="StockStory India"
          >
            <strong style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.1em" }}>STOCKSTORY</strong>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 8px",
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "\"SFMono-Regular\", ui-monospace, monospace",
                letterSpacing: "0.08em",
              }}
            >
              INDIA
            </span>
          </button>

          <nav
            className="about-nav-links"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <NavLink label="Markets" onClick={() => navigate("/dashboard")} />
            <NavLink label="Stories" onClick={() => navigate("/stock-story")} />
            <NavLink label="Deep Analysis" active onClick={() => navigate("/about")} />
          </nav>

          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              borderRadius: 14,
              background: colors.primary,
              color: colors.onPrimary,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            INITIALIZE SESSION
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="about-shell about-reveal" style={{ paddingTop: 112, paddingBottom: 72 }}>
        <section className="about-section" style={{ paddingTop: 24, paddingBottom: 62 }}>
          <div className="about-hero-grid">
            <div style={{ display: "grid", alignContent: "start", gap: 18 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 999,
                background: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                boxShadow: "none",
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
                <Sparkles size={14} color={colors.accentRed} aria-hidden="true" />
                Public Experience Layer
              </div>

              <h1
                className="about-hero-title"
                style={{
                  margin: 0,
                  fontSize: 72,
                  lineHeight: 0.96,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  maxWidth: 760,
                  color: colors.textPrimary,
                  textShadow: "none",
                }}
              >
                Philippine markets are mapping a resilient narrative.
              </h1>

              <p
                style={{
                  margin: 0,
                  maxWidth: 690,
                  color: colors.textSecondary,
                  fontSize: 18,
                  lineHeight: 1.75,
                }}
              >
                StockStory India frames PSE, PSE, and SME market behavior through clear, institutional research
                surfaces that help investors review structure, compare quality, and track Healthometer changes.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 4 }}>
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    background: colors.primary,
                    color: colors.onPrimary,
                    padding: "12px 18px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "none",
                  }}
                >
                  Start Research
                </button>
                <button
                  onClick={() => navigate("/trust")}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.textPrimary,
                    padding: "12px 18px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "none",
                  }}
                >
                  Review Methodology
                </button>
              </div>
            </div>

            <div className="about-glass-card about-hover-lift" style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 8 }}>Volumetric Exchange Grid</div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Macro Core Environment</h2>
                </div>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    background: colors.surfaceElevated,
                    border: `1px solid ${colors.border}`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Radar size={18} color={colors.accentRed} aria-hidden="true" />
                </div>
              </div>

              <div className="about-exchange-grid">
                {exchangeCards.map((card) => (
                  <article
                    key={card.label}
                    className="about-glass-card about-hover-lift"
                    style={{ padding: 16, borderRadius: 18 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ color: colors.textTertiary, fontSize: 12 }}>{card.label}</span>
                      <HealthPill health={card.health} />
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{card.value}</div>
                    <div
                      style={{
                        color: card.move.startsWith("-") ? colors.marketOrange : colors.marketGreen,
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {card.move}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" style={{ paddingTop: 0, paddingBottom: 62 }}>
          <div className="about-feature-grid">
            {[
              {
                title: "Research",
                body: "Company review surfaces keep factors, freshness, and historical structure aligned in one frame.",
                icon: Search,
              },
              {
                title: "Thesis",
                body: "What changed and why it matters are attached to the same story instead of scattered into commentary.",
                icon: Brain,
              },
              {
                title: "Compare",
                body: "Peer-level comparisons help investors see quality and valuation distinctions without flattening nuance.",
                icon: BarChart3,
              },
              {
                title: "Risk",
                body: "Healthometer changes and structural pressure stay visible before conviction deepens.",
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="about-glass-card about-hover-lift" style={{ padding: 22 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: colors.surfaceElevated,
                      border: `1px solid ${colors.border}`,
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Icon size={18} color={colors.accentRed} aria-hidden="true" />
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>{item.title}</h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14, lineHeight: 1.75 }}>{item.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-section" style={{ paddingTop: 0, paddingBottom: 62 }}>
          <div className="about-glass-card about-hover-lift" style={{ padding: 26, position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                  background:
                    `radial-gradient(circle at top right, ${colors.accentRedSoft}, transparent 24%), radial-gradient(circle at bottom left, rgba(255,107,107,0.04), transparent 24%)`,
                  pointerEvents: "none",
                }}
              />

            <div style={{ position: "relative", display: "grid", gap: 22 }}>
              <div style={{ maxWidth: 760 }}>
                <div style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 8 }}>Healthometer Showcase</div>
                <h2 style={{ margin: "0 0 10px", fontSize: 30, fontWeight: 700 }}>
                  A structural telemetry gauge previewing 150 simulated parameter checks.
                </h2>
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: 16, lineHeight: 1.75 }}>
                  The Healthometer subsystem gives investors a clear read on a company profile through deterministic,
                  multi-parameter structure rather than shallow labels.
                </p>
              </div>

              <div className="about-glass-card" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <div style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 8 }}>Structural Health Index</div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Premier Mainboard Research Matrix</h3>
                  </div>
                  <HealthPill health="Healthy" />
                </div>

                <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      color: colors.textTertiary,
                      fontSize: 13,
                    }}
                  >
                    <span>Parameter Tracking Progression</span>
                    <span>117 / 150 signals aligned</span>
                  </div>
                  <div
                    style={{
                      height: 12,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${colors.surfaceElevated}, ${colors.surfaceCard})`,
                      border: `1px solid ${colors.border}`,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "78%",
                        height: "100%",
                        background: `linear-gradient(90deg, ${colors.accentRed}, ${colors.accentRed})`,
                        boxShadow: "none",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 14,
                    paddingBottom: 90,
                  }}
                >
                  {[
                    ["Coverage", "PSE / PSE / SME"],
                    ["Health", "Healthy"],
                    ["Freshness", "API verified"],
                    ["Vectors", "150 tracked"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: colors.textTertiary, fontSize: 11, marginBottom: 6 }}>{label}</div>
                      <div style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div
                  className="about-health-overlay"
                  style={{
                    position: "absolute",
                    left: 18,
                    right: 18,
                    bottom: 18,
                    padding: 16,
                    borderRadius: 18,
                    background: colors.surfaceElevated,
                    border: `1px solid ${colors.hairlineStrong}`,
                    boxShadow: "none",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textPrimary, fontSize: 13, fontWeight: 700 }}>
                    <LockKeyhole size={15} color={colors.accentRed} aria-hidden="true" />
                    Premium Breakdown Layer
                  </div>
                  <div style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
                    Upgrade Horizon Premium to Unlock 150-Parameter Breakdown
                  </div>
                  <button
                    onClick={() => navigate("/pricing")}
                    style={{
                      width: "fit-content",
                      border: "none",
                      borderRadius: 14,
                      background: colors.primary,
                      color: colors.onPrimary,
                      padding: "10px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Review Premium Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" style={{ paddingTop: 0, paddingBottom: 44 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 8 }}>About & Feature Timeline</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 30, fontWeight: 700 }}>
              A modular storybook layout showing how deep analysis moves through the product.
            </h2>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: 16, lineHeight: 1.75, maxWidth: 780 }}>
              Each pillar combines analytical copy with range graphics and performance matrices to make the public
              experience feel like a preview of the actual operating system.
            </p>
          </div>

          <div className="about-timeline">
            {featureTimelineCards.map((card) => (
              <article key={card.id} className="about-glass-card about-hover-lift about-timeline-card">
                <div className="about-copy" style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                      padding: "7px 12px",
                      borderRadius: 999,
                      background: colors.surfaceElevated,
                      border: `1px solid ${colors.border}`,
                      color: colors.textSecondary,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <CandlestickChart size={14} color={colors.accentRed} aria-hidden="true" />
                    {card.eyebrow}
                  </div>

                  <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{card.title}</h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: 15, lineHeight: 1.8 }}>{card.body}</p>
                  <button
                    onClick={() => navigate("/dashboard")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                      border: "none",
                      padding: 0,
                      background: "transparent",
                      color: colors.textPrimary,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Explore This Surface
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>

                <div className="about-visual about-glass-card" style={{ padding: 18, borderRadius: 20 }}>
                  <div style={{ display: "grid", gap: 18 }}>
                    <div>
                      <div style={{ color: colors.textTertiary, fontSize: 11, marginBottom: 10 }}>52-week range parameters</div>
                      <RangeBar progress={card.rangeProgress} labels={card.rangeLabels} />
                    </div>
                    <Histogram columns={card.columns} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
