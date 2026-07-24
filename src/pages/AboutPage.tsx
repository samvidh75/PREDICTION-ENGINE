import { useState, useEffect, useRef } from "react";
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
  TrendingUp,
  Zap,
  Layers,
  Cpu,
  Globe,
  Command,
  Star,
  ExternalLink,
  Github,
  Twitter,
  Youtube,
} from "lucide-react";
import { colors, layout, typography, animation } from "../design/tokens";

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
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ${animation.slow}, transform 0.7s ${animation.slow}`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function GlassCard({ children, className = "", style = {}, onClick }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: colors.glassBg,
        backdropFilter: colors.glassBlur,
        WebkitBackdropFilter: colors.glassBlur,
        border: `1px solid ${colors.glassBorder}`,
        boxShadow: `inset 0 1px 0 ${colors.glassBorderTop}`,
        borderRadius: 20,
        transition: `border-color 0.2s ${animation.fast}, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ${animation.fast}`,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.borderColor = colors.glassBorderTop;
          (e.currentTarget as HTMLDivElement).style.background = colors.glassBgStrong;
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.01) translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.borderColor = colors.glassBorder;
          (e.currentTarget as HTMLDivElement).style.background = colors.glassBg;
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1) translateY(0)";
        }
      }}
    >
      {children}
    </div>
  );
}

function PillBadge({ children, color = colors.accentRed }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      <Sparkles size={13} color={color} />
      {children}
    </span>
  );
}

const pillars = [
  { title: "Fast.", subtitle: "Think in milliseconds.", icon: Zap },
  { title: "Ergonomic.", subtitle: "Keyboard first.", icon: Command },
  { title: "Native.", subtitle: "Pure performance.", icon: Cpu },
  { title: "Reliable.", subtitle: "99.8% data accuracy rate.", icon: ShieldCheck },
];

const features = [
  { title: "Research", desc: "Company review surfaces keep factors, recency, and historical structure aligned in one frame.", icon: Search, color: "#FF6B4A" },
  { title: "Thesis", desc: "What changed and why it matters — attached to the same story instead of scattered into commentary.", icon: Brain, color: "#57C1FF" },
  { title: "Compare", desc: "Peer-level comparisons help investors see quality and valuation distinctions without flattening nuance.", icon: BarChart3, color: "#FF9500" },
  { title: "Risk", desc: "Healthometer changes and structural pressure stay visible before conviction deepens.", icon: ShieldCheck, color: "#34C759" },
  { title: "Scanners", desc: "Discovery tools built for deeper review — not shallow ranking theatre.", icon: Radar, color: "#AF52DE" },
  { title: "Markets", desc: "Live KSE-100, PSX sectors, and macro narratives in one glance.", icon: Globe, color: "#5AC8FA" },
];

const extensions = [
  { name: "KSE-100 Dashboard", desc: "Live index, movers, and breadth — all on one surface.", icon: CandlestickChart },
  { name: "Peer Comparator", desc: "Compare up to 5 stocks side-by-side on key metrics.", icon: Layers },
  { name: "Healthometer", desc: "150-parameter structural health check on any PSX stock.", icon: TrendingUp },
  { name: "Market Stories", desc: "Narrative-driven updates on what changed and why.", icon: Globe },
  { name: "Price Alerts", desc: "Custom triggers for price, volume, and score changes.", icon: Zap },
  { name: "Portfolio Tracker", desc: "Track your PSX holdings with AI-powered risk flags.", icon: BarChart3 },
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
        background: "#000000",
        color: "#FFFFFF",
        fontFamily: typography.fontFamily,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <style>{`
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kbPulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .shell { width: min(1200px, calc(100% - 48px)); margin: 0 auto; }
        @media (max-width: 720px) {
          .shell { width: min(100% - 32px, 1200px); }
          .hero-title { font-size: 40px !important; line-height: 1.05 !important; }
          .hero-sub   { font-size: 16px !important; }
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
        }
        .about-nav-links { display: flex; gap: 4px; align-items: center; }
        .about-nav-launch { padding: 8px 16px; font-size: 13px; }
        @media (max-width: 560px) {
          .about-nav-links { display: none; }
          .about-nav-launch { padding: 7px 12px; font-size: 12px; }
        }
      `}</style>

      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? colors.glassBgStrong : "transparent",
          backdropFilter: scrolled ? colors.glassBlur : "none",
          WebkitBackdropFilter: scrolled ? colors.glassBlur : "none",
          borderBottom: scrolled ? `1px solid ${colors.glassBorder}` : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "none", border: "none", color: "#FFFFFF",
              cursor: "pointer", padding: 0, fontSize: 16, fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            STOCKEX
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <nav className="about-nav-links">
              {["Markets", "Research", "Pricing"].map((label) => (
                <button
                  key={label}
                  onClick={() => navigate(label === "Markets" ? "/dashboard" : label === "Research" ? "/scanner" : "/pricing")}
                  style={{
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.65)", fontSize: 13,
                    fontWeight: 500, padding: "8px 12px", borderRadius: 8,
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button
              className="about-nav-launch"
              onClick={() => navigate("/dashboard")}
              style={{
                borderRadius: 10,
                background: "#FFFFFF", color: "#000000",
                border: "none", fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.02em", whiteSpace: "nowrap",
              }}
            >
              Launch App
            </button>
          </div>
        </div>
      </header>

      <main style={{ paddingTop: 64 }}>
        {/* ─── HERO ──────────────────────────────────────── */}
        <section style={{ padding: "120px 0 80px", textAlign: "center", position: "relative", overflow: "hidden", minHeight: "min(78vh, 680px)", display: "grid", alignContent: "center" }}>
          {/* Central micro-animation — breathing core + rotating arc + orbiting
              points, one hue. The headline is short on purpose so this reads
              as motion, not wallpaper. */}
          <div className="stockex-beam-field" aria-hidden="true">
            <div className="stockex-beam-ring" />
            <div className="stockex-beam" />
            <div className="stockex-beam-arc" />
            <div className="stockex-beam-orbit a" />
            <div className="stockex-beam-orbit b" />
            <div className="stockex-beam-orbit c" />
          </div>

          <div className="shell" style={{ position: "relative", zIndex: 1 }}>
            <div className="stockex-load-in" style={{ animationDelay: "0ms" }}>
              <PillBadge>PSE Research Platform</PillBadge>
            </div>

            <h1
              className="hero-title stockex-load-in"
              style={{
                animationDelay: "80ms",
                margin: "24px 0 0",
                fontSize: 84,
                lineHeight: 0.98,
                fontWeight: 600,
                letterSpacing: "-0.035em",
                maxWidth: 780,
                marginLeft: "auto",
                marginRight: "auto",
                color: "#FFFFFF",
              }}
            >
              Know the market first.
            </h1>

            <p
              className="hero-sub stockex-load-in"
              style={{
                animationDelay: "220ms",
                margin: "20px auto 0",
                maxWidth: 460,
                color: "rgba(255,255,255,0.55)",
                fontSize: 17,
                lineHeight: 1.55,
                fontWeight: 400,
                letterSpacing: "-0.01em",
              }}
            >
              A research desk built for the Philippine Stock Exchange.
            </p>

            <div className="stockex-load-in" style={{ animationDelay: "340ms", display: "flex", gap: 12, justifyContent: "center", marginTop: 36 }}>
              <button
                className="stockex-glass-btn"
                onClick={() => navigate("/dashboard")}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.955)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                style={{
                  padding: "14px 28px", borderRadius: 14,
                  background: "#FFFFFF", color: "#000000",
                  border: "none", fontSize: 15, fontWeight: 600,
                  cursor: "pointer", letterSpacing: "0.02em",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                Start Research <ArrowRight size={16} />
              </button>
              <button
                className="stockex-glass-btn"
                onClick={() => navigate("/pricing")}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.955)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                style={{
                  padding: "14px 28px", borderRadius: 14,
                  background: colors.glassBg, color: "#FFFFFF",
                  backdropFilter: colors.glassBlur,
                  WebkitBackdropFilter: colors.glassBlur,
                  border: `1px solid ${colors.glassBorder}`, fontSize: 15,
                  fontWeight: 500, cursor: "pointer",
                  transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                View Pricing
              </button>
            </div>

            {/* ── Pillars ── */}
            <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 64 }}>
              {pillars.map((p) => (
                <div key={p.title} style={{ textAlign: "center", padding: "20px 12px" }}>
                  <p.icon size={20} color={colors.accentRed} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{p.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── EXTENSIONS / FEATURES ────────────────────── */}
        <section style={{ padding: "40px 0 80px" }}>
          <div className="shell">
            <FadeInSection>
              <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 12 }}>
                There&rsquo;s a tool for that.
              </h2>
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 16, marginBottom: 48, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                Research PSX stocks without leaving your workflow.
              </p>
            </FadeInSection>

            <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {extensions.map((ext, i) => (
                <FadeInSection key={ext.name} delay={i * 80}>
                  <GlassCard onClick={() => navigate("/dashboard")} style={{ padding: 24 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", marginBottom: 16 }}>
                      <ext.icon size={20} color={colors.accentRed} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{ext.name}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{ext.desc}</div>
                  </GlassCard>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── AI SECTION ───────────────────────────────── */}
        <section style={{ padding: "40px 0 80px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(255,107,74,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div className="shell" style={{ position: "relative" }}>
            <FadeInSection>
              <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 12 }}>
                Your research just got smarter.
              </h2>
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 16, marginBottom: 48, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                AI where it&rsquo;s most useful — on your research desk.
              </p>
            </FadeInSection>

            <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { title: "Ask Anything", desc: "Ask questions about any PSX stock and get plain-language answers backed by data." },
                { title: "Always-On Analyst", desc: "Stuck on a company filing? Need help reading financials? Meet your virtual research assistant." },
                { title: "Automation Engine", desc: "Create custom AI commands to automate repetitive research and eliminate manual work." },
              ].map((item, i) => (
                <FadeInSection key={item.title} delay={i * 100}>
                  <GlassCard style={{ padding: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>{item.desc}</div>
                  </GlassCard>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── DON'T REPEAT YOURSELF ────────────────────── */}
        <section style={{ padding: "40px 0 80px" }}>
          <div className="shell">
            <FadeInSection>
              <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 12 }}>
                Don&rsquo;t repeat yourself.
              </h2>
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 16, marginBottom: 48 }}>
                Automate the things you do all the time.
              </p>
            </FadeInSection>

            <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { title: "Watchlists", desc: "Tired of typing the same tickers? Create watchlists and access them instantly." },
                { title: "Quicklinks", desc: "Say goodbye to open tabs. Create quicklinks to launch any research surface from anywhere." },
                { title: "Hotkeys", desc: "Speed up your workflow with keyboard shortcuts for common research commands." },
              ].map((item, i) => (
                <FadeInSection key={item.title} delay={i * 100}>
                  <GlassCard style={{ padding: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>{item.desc}</div>
                  </GlassCard>
                </FadeInSection>
              ))}
            </div>

            <FadeInSection delay={200}>
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 15, marginTop: 40, lineHeight: 1.8 }}>
                What else can StockEx do? It can track your portfolio. Score any PSX stock. Compare peers. Flag risks.
                Generate reports. Chart technicals. Find narratives. Monitor sectors. Alert you. And much, much more.
              </p>
            </FadeInSection>
          </div>
        </section>

        {/* ─── FEATURE DEEP DIVE ────────────────────────── */}
        <section style={{ padding: "40px 0 80px" }}>
          <div className="shell">
            <FadeInSection>
              <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 12 }}>
                Research that scales.
              </h2>
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 16, marginBottom: 48 }}>
                Every feature built for the PSX investor workflow.
              </p>
            </FadeInSection>

            <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {features.map((f, i) => (
                <FadeInSection key={f.title} delay={i * 80}>
                  <GlassCard style={{ padding: 24, display: "flex", gap: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <f.icon size={18} color={f.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                  </GlassCard>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── COMMUNITY ─────────────────────────────────── */}
        <section style={{ padding: "40px 0 80px" }}>
          <div className="shell">
            <FadeInSection>
              <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 12 }}>
                Stay in the loop.
              </h2>
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 16, marginBottom: 48 }}>
                Join the community and learn how others get the most out of StockEx.
              </p>
            </FadeInSection>

            <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { title: "YouTube", desc: "Watch tutorials, feature deep-dives, and market analysis.", icon: Youtube, action: () => window.open("https://youtube.com", "_blank") },
                { title: "X / Twitter", desc: "Keep up to date with the latest releases and improvements.", icon: Twitter, action: () => window.open("https://twitter.com", "_blank") },
                { title: "GitHub", desc: "Explore our open data, research tools, and contribute.", icon: Github, action: () => window.open("https://github.com", "_blank") },
              ].map((item, i) => (
                <FadeInSection key={item.title} delay={i * 100}>
                  <GlassCard onClick={item.action} style={{ padding: 24, textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                      <item.icon size={22} color={colors.accentRed} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{item.desc}</div>
                  </GlassCard>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────── */}
        <section style={{ padding: "80px 0 100px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(255,107,74,0.1) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div className="shell" style={{ position: "relative", textAlign: "center" }}>
            <FadeInSection>
              <h2 style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 16 }}>
                Take the short way.
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, marginBottom: 36 }}>
                Start researching PSX stocks for free.
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  padding: "16px 36px", borderRadius: 16,
                  background: "#FFFFFF", color: "#000000",
                  border: "none", fontSize: 16, fontWeight: 600,
                  cursor: "pointer", letterSpacing: "0.02em",
                  display: "inline-flex", alignItems: "center", gap: 10,
                }}
              >
                Launch StockEx <ArrowRight size={18} />
              </button>
            </FadeInSection>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <footer style={{ padding: "60px 0 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="shell">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 16, textTransform: "uppercase" }}>Product</div>
              {["Dashboard", "Scanner", "Compare", "Research", "Pricing"].map((label) => (
                <button key={label} onClick={() => navigate(label === "Dashboard" ? "/dashboard" : label === "Scanner" ? "/scanner" : label === "Compare" ? "/compare" : label === "Research" ? "/stock-story" : "/pricing")}
                  style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "4px 0", cursor: "pointer", textAlign: "left" }}>
                  {label}
                </button>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 16, textTransform: "uppercase" }}>Core Features</div>
              {["AI Research", "Healthometer", "Peer Compare", "Scanners", "Market Stories", "Price Alerts"].map((label) => (
                <button key={label} onClick={() => navigate("/dashboard")}
                  style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "4px 0", cursor: "pointer", textAlign: "left" }}>
                  {label}
                </button>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 16, textTransform: "uppercase" }}>Company</div>
              {["About", "Trust & Safety", "Privacy", "Terms", "Contact"].map((label) => (
                <button key={label} onClick={() => navigate(label === "About" ? "/about" : label === "Trust & Safety" ? "/trust" : "/dashboard")}
                  style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "4px 0", cursor: "pointer", textAlign: "left" }}>
                  {label}
                </button>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 16, textTransform: "uppercase" }}>Community</div>
              {["YouTube", "X / Twitter", "GitHub", "Discord"].map((label) => (
                <button key={label}
                  style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "4px 0", cursor: "pointer", textAlign: "left" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              StockEx — PSE Research Platform
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              Data sourced from PSE and public filings.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
