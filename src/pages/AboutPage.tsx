import {
  BookOpen, ChevronRight, Command, Github,
  Keyboard, Linkedin, Lightbulb, Mail, Target,
  Twitter, Users, Zap,
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
  { name: "Samvidh Mehta", role: "Founder & Product", initials: "SM", gradient: "linear-gradient(135deg, #FF3B30, #FF9500)" },
  { name: "Ananya Rao", role: "Engineering", initials: "AR", gradient: "linear-gradient(135deg, #007AFF, #00C7BE)" },
  { name: "Rohit Sharma", role: "Data & Research", initials: "RS", gradient: "linear-gradient(135deg, #34C759, #30D158)" },
];

// ─── Timeline ──────────────────────────────────────────────────────────

const MILESTONES = [
  { year: "2023 Q3", title: "The idea", body: "Samvidh noticed how hard it was to research Indian stocks without getting lost in data vomit. The spark lit." },
  { year: "2024 Q1", title: "First prototype", body: "A bare-bones scanner with 3 presets. Shared in a WhatsApp group — 47 users in 24 hours." },
  { year: "2024 Q3", title: "Public launch", body: "StockStory goes public on Replit with health scores, alerts, and thesis tracking. 2,000+ MAU within a month." },
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
    <div style={{ padding: "0 16px", maxWidth: 960, margin: "0 auto", display: "grid", gap: space[10] }}>
      {/* ════════════════ HERO ════════════════ */}
      <section style={{ paddingTop: space[10], position: "relative", overflow: "hidden" }}>
        {/* Red accent stripe */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(400px, 80%, 900px)",
            height: 300,
            background: "radial-gradient(ellipse 60% 60% at 50% 30%, rgba(255,69,58,0.2) 0%, rgba(255,105,97,0.08) 35%, transparent 65%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: space[5], textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space[3] }}>
            <BookOpen size={20} color={colors.primary} />
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              About StockStory
            </span>
          </div>
          <h1
            style={{
              color: colors.textPrimary,
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Research the Indian market{" "}
            <span style={{ background: "linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              with clarity.
            </span>
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 1.6, maxWidth: 580, margin: "0 auto" }}>
            StockStory helps retail investors research Indian stocks through clean, conviction-driven tools — 
            health scores, side-by-side comparisons, and thesis tracking. No noise. No fluff.
          </p>
          <div style={{ display: "flex", gap: space[3], justifyContent: "center", flexWrap: "wrap" }}>
            <Button onClick={() => navigate("/scanner?preset=quality-compounders")}>Start Researching</Button>
            <Button variant="secondary" onClick={() => navigate("/learn/health-score")}>How It Works</Button>
          </div>
        </div>
      </section>

      {/* ════════════════ MISSION ════════════════ */}
      <Card variant="accent" style={{ padding: space[8], textAlign: "center", maxWidth: 680, margin: "0 auto", display: "grid", gap: space[4] }}>
        <Target size={24} color={colors.primary} style={{ margin: "0 auto" }} />
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, color: colors.textPrimary, margin: 0 }}>
          Our Mission
        </h2>
        <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
          We believe every retail investor deserves the same quality of research tools that institutions have. 
          StockStory distils complex financial data into clear signals, so you spend less time sifting and 
          more time understanding. Our health scores, conviction badges, and thesis tracker turn research 
          into a habit, not a chore.
        </p>
      </Card>

      {/* ════════════════ VALUES ════════════════ */}
      <section style={{ display: "grid", gap: space[6] }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, color: colors.textPrimary, textAlign: "center", margin: 0 }}>
          What We Stand For
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: space[4],
        }}>
          {VALUES.map((v) => (
            <Card key={v.title} style={{ display: "grid", gap: space[3] }}>
              <v.icon size={20} color={colors.primary} strokeWidth={1.75} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{v.title}</h3>
              <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>{v.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ TEAM ════════════════ */}
      <section style={{ display: "grid", gap: space[6] }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, color: colors.textPrimary, textAlign: "center", margin: 0 }}>
          Meet the Team
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: space[5],
          justifyItems: "center",
        }}>
          {TEAM.map((member) => (
            <div key={member.name} style={{ display: "grid", gap: space[3], textAlign: "center", justifyItems: "center" }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: member.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
              }}>
                {member.initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{member.name}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary }}>{member.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ TIMELINE ════════════════ */}
      <section style={{ display: "grid", gap: space[6] }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, color: colors.textPrimary, textAlign: "center", margin: 0 }}>
          Our Story
        </h2>
        <div style={{ position: "relative", display: "grid", gap: space[5], paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{
            position: "absolute",
            left: 10,
            top: 6,
            bottom: 6,
            width: 2,
            background: colors.separator,
            borderRadius: 1,
          }} />
          {MILESTONES.map((m, i) => (
            <div key={m.year} style={{ position: "relative", display: "grid", gap: space[1] }}>
              {/* Dot */}
              <div style={{
                position: "absolute",
                left: -22,
                top: 5,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: i === MILESTONES.length - 1 ? colors.primary : colors.border,
                border: `2px solid ${colors.card}`,
                boxSizing: "border-box",
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {m.year}
              </span>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{m.title}</h3>
              <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ KEYBOARD SHORTCUTS ════════════════ */}
      <section style={{
        padding: space[6],
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        display: "flex",
        flexWrap: "wrap",
        gap: space[6],
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: colors.textSecondary }}>
          <Keyboard size={14} /> <kbd style={{ padding: "1px 5px", borderRadius: 3, background: colors.fill, border: `1px solid ${colors.border}`, fontSize: 11 }}>⌘K</kbd> Search stocks
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: colors.textSecondary }}>
          <Keyboard size={14} /> <kbd style={{ padding: "1px 5px", borderRadius: 3, background: colors.fill, border: `1px solid ${colors.border}`, fontSize: 11 }}>G</kbd> <kbd style={{ padding: "1px 5px", borderRadius: 3, background: colors.fill, border: `1px solid ${colors.border}`, fontSize: 11 }}>N</kbd> Go to news
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: colors.textSecondary }}>
          <Keyboard size={14} /> <kbd style={{ padding: "1px 5px", borderRadius: 3, background: colors.fill, border: `1px solid ${colors.border}`, fontSize: 11 }}>R</kbd> Refresh data
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: colors.textSecondary }}>
          <Keyboard size={14} /> <kbd style={{ padding: "1px 5px", borderRadius: 3, background: colors.fill, border: `1px solid ${colors.border}`, fontSize: 11 }}>?</kbd> Show shortcuts
        </span>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer style={{
        paddingTop: space[8],
        borderTop: `1px solid ${colors.separator}`,
        display: "grid",
        gap: space[8],
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: space[6],
        }}>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} style={{ display: "grid", gap: space[3] }}>
              <h4 style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
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
                      fontSize: 13,
                      color: colors.textPrimary,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {link.label} {link.href.startsWith("http") && <ChevronRight size={10} />}
                  </a>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: space[4],
          paddingTop: space[6],
          borderTop: `1px solid ${colors.separator}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>StockStory</span>
            <span style={{ fontSize: 12, color: colors.textSecondary }}>
              © {new Date().getFullYear()} StockStory. For educational purposes only.
            </span>
          </div>
          <div style={{ display: "flex", gap: space[3] }}>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.textSecondary }}>
              <Twitter size={16} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.textSecondary }}>
              <Linkedin size={16} />
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.textSecondary }}>
              <Github size={16} />
            </a>
            <a href="mailto:hello@stockstory.org" style={{ color: colors.textSecondary }}>
              <Mail size={16} />
            </a>
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
