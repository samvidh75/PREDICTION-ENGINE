import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CandlestickChart,
  LockKeyhole,
  Search,
  ShieldCheck,
  Globe,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";
import { colors, typography } from "../design/tokens";
import { TickerBar } from "../components/TickerBar";

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const principles = [
  {
    n: "01",
    title: "The tape doesn't lie, but headlines do.",
    body: "Every PSE story on this desk starts from the filing or the print, not the press release. We show you the number first and the narrative second.",
  },
  {
    n: "02",
    title: "150 checks, one verdict.",
    body: "The Healthometer runs every listed name through the same 150-parameter structural read — margins, leverage, breadth, momentum — and returns a single Very Healthy → Unhealthy grade you can act on in seconds.",
  },
  {
    n: "03",
    title: "Built for the board lot, not the billboard.",
    body: "PSE research has long meant scanned PDFs and broker decks. We rebuilt it as a desk: live sector tape, per-name scorecards, and comparisons that hold up in the boardroom and the barbershop.",
  },
];

const coverage = [
  { title: "Screen", desc: "Rank all ~280 PSE names by momentum, value, and structural health in one sweep.", icon: Search, route: "/scanner" },
  { title: "Diagnose", desc: "The Healthometer's 150-parameter read on any ticker — margins, leverage, breadth, momentum.", icon: ShieldCheck, route: "/stock/BDO" },
  { title: "Compare", desc: "Line up to five names side by side on the metrics that actually separate winners.", icon: BarChart3, route: "/compare" },
  { title: "Read the tape", desc: "PSEi breadth, sector rotation, and foreign flow — the macro picture in one glance.", icon: Globe, route: "/sectors" },
  { title: "Follow the story", desc: "What changed in a company's filings and why it moved the price — not just that it did.", icon: Brain, route: "/stock-story" },
  { title: "Track", desc: "Custom price, volume, and Healthometer-shift alerts on the names you actually hold.", icon: Zap, route: "/alerts" },
];

const deskTools = [
  { name: "PSEi Dashboard", desc: "Live index, movers, and breadth on one surface.", icon: CandlestickChart, route: "/live-market" },
  { name: "Peer Comparator", desc: "Compare up to 5 stocks side by side on key metrics.", icon: Layers, route: "/compare" },
  { name: "Healthometer", desc: "150-parameter structural health check on any PSE name.", icon: TrendingUp, route: "/scanner" },
  { name: "Portfolio Tracker", desc: "Track your PSE holdings with structural risk flags.", icon: BarChart3, route: "/portfolio" },
];

export default function AboutPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.canvas,
        color: colors.ink,
        fontFamily: typography.fontFamily,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        .shell { width: min(1120px, calc(100% - 48px)); margin: 0 auto; }
        @media (max-width: 720px) {
          .shell { width: min(100% - 32px, 1120px); }
          .about-hero-title { font-size: 40px !important; }
          .about-grid-3 { grid-template-columns: 1fr !important; }
          .about-grid-2 { grid-template-columns: 1fr !important; }
          .about-nav-links { display: none; }
        }
      `}</style>

      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? "rgba(11,11,12,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          borderBottom: scrolled ? `1px solid ${colors.hairline}` : "1px solid transparent",
          transition: "all 0.25s ease",
        }}
      >
        <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", color: colors.ink,
              cursor: "pointer", padding: 0, fontSize: 15, fontWeight: 700,
              letterSpacing: "0.06em", fontFamily: typography.fontFamily,
            }}
          >
            STOCKEX
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <nav className="about-nav-links" style={{ display: "flex", gap: 4 }}>
              {[["Markets", "/dashboard"], ["Research", "/scanner"], ["Pricing", "/pricing"]].map(([label, route]) => (
                <button
                  key={label}
                  onClick={() => navigate(route)}
                  style={{
                    background: "none", border: "none", color: colors.body,
                    fontSize: 13, fontWeight: 500, padding: "8px 12px",
                    borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "8px 16px", borderRadius: 10,
                background: colors.primary, color: colors.onPrimary,
                border: "none", fontWeight: 600, fontSize: 13,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Launch app
            </button>
          </div>
        </div>
      </header>

      <main style={{ paddingTop: 64 }}>
        <TickerBar />

        {/* ─── HERO ──────────────────────────────────────── */}
        <section className="shell" style={{ padding: "88px 0 56px" }}>
          <span style={{ fontFamily: typography.monoFamily, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.primary }}>
            About the desk
          </span>
          <h1
            className="about-hero-title"
            style={{
              fontFamily: typography.serifFamily,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 56,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              margin: "16px 0 20px",
              maxWidth: 760,
              color: colors.ink,
            }}
          >
            A research desk built for one exchange, not every exchange.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: colors.body, maxWidth: 620, margin: 0 }}>
            StockEx exists because Philippine equities deserve dedicated tooling — not a
            side tab bolted onto a platform built for Wall Street. Every screen, score,
            and story here is built around the PSE tape, the peso, and the roughly 280
            names that trade on it.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/scanner")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 22px", borderRadius: 10,
                background: colors.primary, color: colors.onPrimary,
                border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              Open the scanner <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "12px 22px", borderRadius: 10,
                background: "transparent", color: colors.ink,
                border: `1px solid ${colors.hairlineStrong}`, fontWeight: 600,
                fontSize: 14, cursor: "pointer",
              }}
            >
              Go to dashboard
            </button>
          </div>
        </section>

        {/* ─── PRINCIPLES ────────────────────────────────── */}
        <section className="shell" style={{ padding: "48px 0", borderTop: `1px solid ${colors.hairline}` }}>
          <div style={{ display: "grid", gap: 32 }}>
            {principles.map((p, i) => (
              <FadeInSection key={p.n} delay={i * 80}>
                <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 20, alignItems: "start" }}>
                  <span style={{ fontFamily: typography.monoFamily, fontSize: 13, color: colors.mute, paddingTop: 4 }}>
                    {p.n}
                  </span>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 600, color: colors.ink, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                      {p.title}
                    </h3>
                    <p style={{ fontSize: 15, lineHeight: 1.65, color: colors.body, margin: 0, maxWidth: 620 }}>
                      {p.body}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </section>

        {/* ─── WHAT THE DESK DOES ────────────────────────── */}
        <section className="shell" style={{ padding: "48px 0", borderTop: `1px solid ${colors.hairline}` }}>
          <span style={{ fontFamily: typography.monoFamily, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.mute }}>
            What the desk does
          </span>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: colors.ink, margin: "10px 0 32px", letterSpacing: "-0.01em" }}>
            Six workflows, one tape.
          </h2>
          <div className="about-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {coverage.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.title}
                  onClick={() => navigate(f.route)}
                  style={{
                    textAlign: "left", background: colors.surface,
                    border: `1px solid ${colors.hairline}`, borderRadius: 14,
                    padding: 20, cursor: "pointer", display: "grid", gap: 10,
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.hairlineStrong; e.currentTarget.style.background = colors.surfaceElevated; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.hairline; e.currentTarget.style.background = colors.surface; }}
                >
                  <Icon size={20} color={colors.primary} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: colors.ink }}>{f.title}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: colors.body }}>{f.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── DESK TOOLS ────────────────────────────────── */}
        <section className="shell" style={{ padding: "48px 0", borderTop: `1px solid ${colors.hairline}` }}>
          <span style={{ fontFamily: typography.monoFamily, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.mute }}>
            On the desk
          </span>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: colors.ink, margin: "10px 0 32px", letterSpacing: "-0.01em" }}>
            The tools we actually built.
          </h2>
          <div className="about-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {deskTools.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.name}
                  onClick={() => navigate(t.route)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    textAlign: "left", background: colors.surface,
                    border: `1px solid ${colors.hairline}`, borderRadius: 14,
                    padding: 18, cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.hairlineStrong; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.hairline; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: colors.accentRedSoft, display: "grid",
                    placeItems: "center",
                  }}>
                    <Icon size={17} color={colors.primary} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: colors.ink, marginBottom: 3 }}>{t.name}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: colors.body }}>{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── TRUST STRIP ───────────────────────────────── */}
        <section className="shell" style={{ padding: "48px 0 96px", borderTop: `1px solid ${colors.hairline}` }}>
          <div style={{
            background: colors.surface, border: `1px solid ${colors.hairline}`,
            borderRadius: 16, padding: "32px 28px", display: "flex",
            alignItems: "center", gap: 16, flexWrap: "wrap",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: colors.accentRedSoft, display: "grid", placeItems: "center",
              }}>
                <LockKeyhole size={18} color={colors.primary} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: colors.ink }}>
                  Independent research. Not a brokerage.
                </div>
                <div style={{ fontSize: 13.5, color: colors.body, marginTop: 2 }}>
                  We surface structure and history — you and your broker execute.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/trust")}
              style={{
                padding: "10px 18px", borderRadius: 9, background: "transparent",
                color: colors.ink, border: `1px solid ${colors.hairlineStrong}`,
                fontWeight: 600, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Read our data policy
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
