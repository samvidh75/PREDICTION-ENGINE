import {
  BookOpen, ChevronRight, Command, Github,
  Keyboard, Linkedin, Mail, Target,
  Twitter, Users, Zap, Lightbulb, Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { colors, typography, space, media, radius } from "../design/tokens";

// ─── Values ────────────────────────────────────────────────────────────

const VALUES = [
  {
    icon: Lightbulb,
    title: "Knowledge First",
    body: "Every feature is designed to educate, not just inform. We turn noise into narratives that build real conviction.",
  },
  {
    icon: Target,
    title: "Radical Transparency",
    body: "We show our math, cite our sources, and admit uncertainty. No black boxes. No overconfident ratings.",
  },
  {
    icon: Users,
    title: "Community Grounded",
    body: "Built by retail investors for retail investors. Our tools reflect the real decisions real people face every day.",
  },
  {
    icon: Zap,
    title: "Speed of Clarity",
    body: "Good decisions need calm. We strip away clutter so the critical numbers surface in seconds, not scrolls.",
  },
];

// ─── Team ──────────────────────────────────────────────────────────────

const TEAM = [
  { name: "Samvidh Mehta", role: "Founder & Product", initials: "SM" },
  { name: "Ananya Rao", role: "Engineering", initials: "AR" },
  { name: "Rohit Sharma", role: "Data & Research", initials: "RS" },
];

// ─── Timeline ──────────────────────────────────────────────────────────

const MILESTONES = [
  { year: "2023 Q3", title: "The idea", body: "Samvidh noticed how hard it was to research Indian stocks without getting lost in data vomit. The spark lit." },
  { year: "2024 Q1", title: "First prototype", body: "A bare-bones scanner with 3 presets. Shared in a WhatsApp group — 47 users in 24 hours." },
  { year: "2024 Q3", title: "Public launch", body: "Lensory goes public with health scores, alerts, and thesis tracking. 2,000+ MAU within a month." },
  { year: "2025 Q1", title: "Compare & Track", body: "Side-by-side comparisons, conviction badges, and the Track module launch. 10,000+ MAU." },
  { year: "2025 Q3", title: "What's next?", body: "AI-powered thesis generation, portfolio heatmaps, and community ratings. Stay tuned." },
];

// ─── Footer columns ────────────────────────────────────────────────────

const FOOTER_COLUMNS = [
  {
    title: "Research",
    links: [
      { label: "Quality Compounders", href: "/scanner?preset=quality-compounders" },
      { label: "High Growth", href: "/scanner?preset=high-growth" },
      { label: "Value Opportunities", href: "/scanner?preset=value-opportunities" },
      { label: "Dividend Champions", href: "/scanner?preset=dividend-champions" },
      { label: "Compare Stocks", href: "/compare" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "How Health Scores Work", href: "/learn/health-score" },
      { label: "Reading a P/E Ratio", href: "/learn/pe-ratio" },
      { label: "Understanding ROE", href: "/learn/roe" },
      { label: "Thesis Tracking Guide", href: "/learn/thesis-tracking" },
      { label: "Glossary", href: "/learn/glossary" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Changelog", href: "/changelog" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Disclaimer", href: "/legal/disclaimer" },
      { label: "SEBI Compliance", href: "/legal/sebi" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Twitter / X", href: "https://x.com" },
      { label: "WhatsApp Group", href: "https://chat.whatsapp.com" },
      { label: "Discord", href: "https://discord.gg" },
      { label: "GitHub", href: "https://github.com" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Centre", href: "/support" },
      { label: "Contact Us", href: "mailto:hello@stockstory.org" },
      { label: "Feature Requests", href: "/feedback" },
      { label: "Report a Bug", href: "/feedback?type=bug" },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto" }}>
      {/* ════════════════ HERO — Red stripe + title ════════════════ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "120px 24px 80px",
          textAlign: "center",
        }}
      >
        {/* Red diagonal hero stripe */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: "50%",
            transform: "translateX(-50%) rotate(-2deg)",
            width: "clamp(400px, 85vw, 1100px)",
            height: 240,
            background: `linear-gradient(90deg, ${colors.heroStripeStart} 0%, ${colors.heroStripeEnd} 50%, ${colors.heroStripeStart} 100%)`,
            clipPath: "polygon(0 15%, 100% 0, 100% 85%, 0 100%)",
            opacity: 0.9,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {/* Second stripe offset for depth */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%) rotate(-1.5deg)",
            width: "clamp(380px, 80vw, 1050px)",
            height: 200,
            background: `linear-gradient(90deg, ${colors.heroStripeStart} 0%, ${colors.heroStripeEnd} 50%, ${colors.heroStripeStart} 100%)`,
            clipPath: "polygon(0 15%, 100% 0, 100% 85%, 0 100%)",
            opacity: 0.5,
            filter: "blur(12px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: space[6], justifyItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: space[2],
              padding: "6px 14px",
              border: `1px solid ${colors.hairline}`,
              borderRadius: radius.full,
              background: colors.surface,
            }}
          >
            <Sparkles size={14} color={colors.mute} />
            <span style={{ fontSize: 13, fontWeight: 500, color: colors.mute }}>
              About Lensory
            </span>
          </div>
          <h1
            style={{
              color: colors.ink,
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: 0,
              margin: 0,
              maxWidth: 720,
            }}
          >
            Research the Indian market{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${colors.heroStripeStart} 0%, ${colors.heroStripeEnd} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              with clarity.
            </span>
          </h1>
          <p
            style={{
              color: colors.body,
              fontSize: "18px",
              lineHeight: 1.6,
              maxWidth: 580,
              margin: 0,
            }}
          >
            Lensory helps retail investors research Indian stocks through clean, conviction-driven tools — 
            health scores, side-by-side comparisons, and thesis tracking. No noise. No fluff.
          </p>
          <div style={{ display: "flex", gap: space[3], flexWrap: "wrap", justifyContent: "center" }}>
            <Button onClick={() => navigate("/scanner?preset=quality-compounders")}>Start Researching</Button>
            <Button variant="secondary" onClick={() => navigate("/learn/health-score")}>How It Works</Button>
          </div>

          {/* ── Command Palette Mockup (Raycast-style) ── */}
          <div
            className="raycast-fadeIn raycast-stagger-4"
            style={{
              marginTop: space[6],
              width: "100%",
              maxWidth: 560,
              position: "relative",
            }}
          >
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.hairline}`,
                borderRadius: radius.lg,
                padding: "16px 20px",
                display: "grid",
                gap: space[3],
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${colors.hairline}`,
              }}
            >
              {/* Search bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: space[3],
                  padding: "10px 14px",
                  borderRadius: radius.md,
                  background: colors.surfaceElevated,
                  border: `1px solid ${colors.hairline}`,
                }}
              >
                <Sparkles size={16} color={colors.accentRed} />
                <span style={{ fontSize: "14px", color: colors.mute, flex: 1 }}>
                  Search stocks, compare, or run a preset…
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  <kbd
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 22,
                      height: 22,
                      borderRadius: radius.sm,
                      background: colors.surfaceCard,
                      border: `1px solid ${colors.hairline}`,
                      fontSize: "11px",
                      fontWeight: 500,
                      color: colors.body,
                      padding: "0 5px",
                    }}
                  >
                    ⌘
                  </kbd>
                  <kbd
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 22,
                      height: 22,
                      borderRadius: radius.sm,
                      background: colors.surfaceCard,
                      border: `1px solid ${colors.hairline}`,
                      fontSize: "11px",
                      fontWeight: 500,
                      color: colors.body,
                      padding: "0 5px",
                    }}
                  >
                    K
                  </kbd>
                </span>
              </div>
              {/* Suggestion items */}
              {[{ label: "Quality Compounders", type: "Preset" }, { label: "Reliance Industries", type: "Stock" }, { label: "Compare: TCS vs Infosys", type: "Compare" }].map(
                (item, i) => (
                  <div
                    key={item.label}
                    className={`raycast-slideUp raycast-stagger-${i + 5}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: radius.sm,
                      background: i === 0 ? colors.surfaceElevated : "transparent",
                      transition: "background 0.15s ease",
                      cursor: "default",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: colors.ink }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: colors.mute,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {item.type}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ MISSION — Elevated card ════════════════ */}
      <section style={{ padding: "0 24px 96px" }}>
        <Card
          variant="elevated"
          style={{
            padding: "48px 40px",
            textAlign: "center",
            maxWidth: 680,
            margin: "0 auto",
            display: "grid",
            gap: space[4],
            justifyItems: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.md,
              background: colors.surfaceElevated,
              border: `1px solid ${colors.hairline}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Target size={22} color={colors.body} />
          </div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: colors.ink,
              margin: 0,
            }}
          >
            Our Mission
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: colors.body,
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 540,
            }}
          >
            We believe every retail investor deserves the same quality of research tools that institutions have. 
            Lensory distils complex financial data into clear signals, so you spend less time sifting and 
            more time understanding.
          </p>
        </Card>
      </section>

      {/* ════════════════ VALUES ════════════════ */}
      <section
        style={{
          padding: "0 24px 96px",
          display: "grid",
          gap: space[8],
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "24px", fontWeight: 500, color: colors.ink, margin: 0 }}>
          What We Stand For
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: space[4],
            textAlign: "left",
          }}
        >
          {VALUES.map((v, i) => (
            <Card
              key={v.title}
              variant="elevated"
              className={`raycast-slideUp raycast-stagger-${i + 1}`}
              style={{ display: "grid", gap: space[3], justifyContent: "start" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.sm,
                  background: colors.surfaceElevated,
                  border: `1px solid ${colors.hairline}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <v.icon size={18} color={colors.body} strokeWidth={1.75} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 500, color: colors.ink, margin: 0 }}>
                {v.title}
              </h3>
              <p style={{ fontSize: "14px", color: colors.body, lineHeight: 1.5, margin: 0 }}>
                {v.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ TEAM — Command palette avatars ════════════════ */}
      <section
        style={{
          padding: "0 24px 96px",
          display: "grid",
          gap: space[8],
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "24px", fontWeight: 500, color: colors.ink, margin: 0 }}>
          Meet the Team
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: space[4],
            maxWidth: 800,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {TEAM.map((member, i) => (
            <div
              key={member.name}
              className={`raycast-slideUp raycast-stagger-${i + 1}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: space[4],
                padding: "16px",
                border: `1px solid ${colors.hairline}`,
                borderRadius: radius.md,
                background: colors.surface,
                textAlign: "left",
              }}
            >
              {/* Initials avatar — like Raycast command icons */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.sm,
                  background: colors.surfaceElevated,
                  border: `1px solid ${colors.hairline}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: colors.body,
                  flexShrink: 0,
                }}
              >
                {member.initials}
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: colors.ink }}>
                  {member.name}
                </div>
                <div style={{ fontSize: "13px", color: colors.mute }}>
                  {member.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ TIMELINE ════════════════ */}
      <section
        style={{
          padding: "0 24px 96px",
          display: "grid",
          gap: space[8],
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 500,
            color: colors.ink,
            margin: 0,
            textAlign: "center",
          }}
        >
          Our Story
        </h2>
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            width: "100%",
            position: "relative",
            display: "grid",
            gap: space[6],
            paddingLeft: 32,
          }}
        >
          {/* Vertical hairline */}
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 8,
              bottom: 8,
              width: 1,
              background: colors.hairline,
            }}
          />
          {MILESTONES.map((m, i) => (
            <div
              key={m.year}
              className={`raycast-slideUp raycast-stagger-${i + 1}`}
              style={{
                position: "relative",
                display: "grid",
                gap: space[2],
              }}
            >
              {/* Dot */}
              <div
                style={{
                  position: "absolute",
                  left: -26,
                  top: 6,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: i === MILESTONES.length - 1 ? colors.primary : colors.surfaceElevated,
                  border: `2px solid ${colors.hairline}`,
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: colors.accentRed,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                {m.year}
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 500, color: colors.ink, margin: 0 }}>
                {m.title}
              </h3>
              <p style={{ fontSize: "14px", color: colors.body, lineHeight: 1.6, margin: 0 }}>
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ KEYBOARD SHORTCUTS — Raycast-style ════════════════ */}
      <section
        style={{
          padding: "0 24px 96px",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "32px",
            border: `1px solid ${colors.hairline}`,
            borderRadius: radius.md,
            background: colors.surface,
            display: "grid",
            gap: space[6],
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: space[2],
            }}
          >
            <Command size={18} color={colors.body} />
            <span
              style={{
                fontSize: "16px",
                fontWeight: 500,
                color: colors.ink,
              }}
            >
              Keyboard Shortcuts
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gap: space[3],
            }}
          >
            {[
              { keys: ["⌘", "K"], label: "Search stocks" },
              { keys: ["G", "N"], label: "Go to news" },
              { keys: ["R"], label: "Refresh data" },
              { keys: ["?"], label: "Show all shortcuts" },
            ].map((sc, i) => (
              <div
                key={sc.label}
                className={`raycast-slideUp raycast-stagger-${i + 1}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: `1px solid ${colors.hairline}`,
                }}
              >
                <span style={{ fontSize: "14px", color: colors.body }}>{sc.label}</span>
                <span style={{ display: "flex", gap: 4 }}>
                  {sc.keys.map((key) => (
                    <kbd
                      key={key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 28,
                        height: 26,
                        padding: "0 6px",
                        borderRadius: radius.sm,
                        background: colors.surfaceCard,
                        border: `1px solid ${colors.hairline}`,
                        fontSize: "12px",
                        fontWeight: 500,
                        color: colors.body,
                        fontFamily: "inherit",
                      }}
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer
        style={{
          padding: "0 24px 48px",
          maxWidth: 1060,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            paddingTop: space[8],
            borderTop: `1px solid ${colors.hairline}`,
            display: "grid",
            gap: space[8],
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: space[6],
            }}
          >
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} style={{ display: "grid", gap: space[3] }}>
                <h4
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.mute,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    margin: 0,
                  }}
                >
                  {col.title}
                </h4>
                <nav style={{ display: "grid", gap: space[2] }}>
                  {col.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith("/")) {
                          e.preventDefault();
                          navigate(link.href);
                        }
                      }}
                      style={{
                        fontSize: "13px",
                        color: colors.body,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {link.label}
                      {link.href.startsWith("http") && <ChevronRight size={10} color={colors.mute} />}
                    </a>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: space[4],
              paddingTop: space[6],
              borderTop: `1px solid ${colors.hairline}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: colors.ink }}>
                Lensory
              </span>
              <span style={{ fontSize: "12px", color: colors.mute }}>
                © {new Date().getFullYear()} For educational purposes only.
              </span>
            </div>
            <div style={{ display: "flex", gap: space[3] }}>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.mute }}>
                <Twitter size={16} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.mute }}>
                <Linkedin size={16} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.mute }}>
                <Github size={16} />
              </a>
              <a href="mailto:hello@stockstory.org" style={{ color: colors.mute }}>
                <Mail size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @media ${media.mobile} {
          h1 { font-size: 28px !important; }
          h2 { font-size: 18px !important; }
        }
      `}</style>
    </div>
  );
}
