import { ArrowRight, BarChart3, Brain, CandlestickChart, Layers, Radar, Search, ShieldCheck, TrendingUp, Zap, Globe, Cpu, Command, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BananaBanner } from "../components/nano/BananaBanner";
import { NANOBANANA_ASSETS } from "../lib/nanoAssets";

/* ============================================================================
   AboutPage — StockStory design (light paper canvas, white cards, no shadows).
   Landing / product-tour page rendered inside the shared PublicLayout chrome.
   ============================================================================ */

const ICON_COLORS: Record<string, string> = {
  up: "var(--sx-up)",
  gold: "var(--sx-gold)",
  down: "var(--sx-down)",
  navy: "var(--sx-navy)",
};

const pillars = [
  { title: "Fast.", subtitle: "Think in milliseconds.", icon: Zap, color: "up" },
  { title: "Ergonomic.", subtitle: "Keyboard first.", icon: Command, color: "navy" },
  { title: "Native.", subtitle: "Built for the PSE.", icon: Cpu, color: "gold" },
  { title: "Reliable.", subtitle: "Real data, no invention.", icon: ShieldCheck, color: "up" },
];

const extensions = [
  { name: "PSEi Dashboard", desc: "Live index, movers, and breadth — all on one surface.", icon: CandlestickChart, route: "/live-market" },
  { name: "Peer Comparator", desc: "Compare up to 5 stocks side-by-side on key metrics.", icon: Layers, route: "/compare" },
  { name: "Healthometer", desc: "150-parameter structural health check on any PSE stock.", icon: TrendingUp, route: "/scanner" },
  { name: "Market Stories", desc: "Narrative-driven updates on what changed and why.", icon: Globe, route: "/stock-story" },
  { name: "Price Alerts", desc: "Custom triggers for price, volume, and score changes.", icon: Zap, route: "/alerts" },
  { name: "Portfolio Tracker", desc: "Track your PSE holdings with AI-powered risk flags.", icon: BarChart3, route: "/portfolio" },
];

const features = [
  { title: "Research", desc: "Company review surfaces keep factors, recency, and historical structure aligned in one frame.", icon: Search, route: "/scanner" },
  { title: "Thesis", desc: "What changed and why it matters — attached to the same story instead of scattered into commentary.", icon: Brain, route: "/stock-story" },
  { title: "Compare", desc: "Peer-level comparisons help investors see quality and valuation distinctions without flattening nuance.", icon: BarChart3, route: "/compare" },
  { title: "Risk", desc: "Healthometer changes and structural pressure stay visible before conviction deepens.", icon: ShieldCheck, route: "/stock/BDO" },
  { title: "Scanners", desc: "Discovery tools built for deeper review — not shallow ranking theatre.", icon: Radar, route: "/technical-scanner" },
  { title: "Markets", desc: "Live PSEi, PSE sectors, and macro narratives in one glance.", icon: Globe, route: "/sectors" },
];

function SectionHeading({ title, lede }: { title: string; lede: string }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 40px" }}>
      <h2 className="sx-h2" style={{ fontSize: "clamp(26px,2vw+14px,34px)", fontWeight: 700 }}>{title}</h2>
      <p style={{ margin: 0, color: "var(--sx-ink-3)", fontSize: "16px", lineHeight: 1.55 }}>{lede}</p>
    </div>
  );
}

function Card({ onClick, children, iconColor, Icon, style }: { onClick?: () => void; children: React.ReactNode; iconColor?: string; Icon?: LucideIcon; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cd"
      style={{
        width: "100%",
        textAlign: "left",
        padding: 24,
        display: "flex",
        gap: Icon ? 16 : 0,
        flexDirection: Icon ? "row" : "column",
        cursor: onClick ? "pointer" : "default",
        background: "var(--sx-surface)",
        border: "1px solid var(--sx-rule)",
        borderRadius: "var(--sx-radius-card)",
        transition: "border-color 0.2s ease",
        color: "var(--sx-ink)",
        ...style,
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = "var(--sx-ink)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--sx-rule)"; }}
    >
      {Icon && (
        <span
          style={{
            width: 42, height: 42, borderRadius: "12px", flexShrink: 0,
            background: "var(--sx-surface-quiet)", display: "grid", placeItems: "center",
          }}
        >
          <Icon size={19} strokeWidth={1.8} color={iconColor ?? "var(--sx-up)"} />
        </span>
      )}
      <span style={{ display: "block", fontSize: 17, fontWeight: 600, marginBottom: Icon ? 5 : 0, letterSpacing: "-0.01em" }}>{children}</span>
    </button>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{ padding: "clamp(24px,4vw,56px) 0 clamp(24px,4vw,56px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <span className="sx-pill" style={{ marginBottom: 20 }}>
            <span className="sx-dot" />
            PSE Research Platform
          </span>
          <h1 className="sx-h1" style={{ fontSize: "clamp(40px,5vw+20px,72px)" }}>
            Know the market first.
          </h1>
          <p className="sx-lede" style={{ margin: "20px auto 32px", maxWidth: 460 }}>
            A research desk built for the Philippine Stock Exchange.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="sx-btn" onClick={() => navigate("/scanner")}>
              Start Research <ArrowRight size={16} />
            </button>
            <button className="sx-btn-ghost" onClick={() => navigate("/pricing")}>
              View Pricing
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: "clamp(32px,5vw,64px)", textAlign: "center" }}>
            {pillars.map((p) => (
              <div key={p.title} style={{ padding: "12px 8px" }}>
                <p.icon size={20} color={ICON_COLORS[p.color]} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "var(--sx-ink-3)" }}>{p.subtitle}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NANO BANANA SHOWCASE ── */}
      <section style={{ padding: "0 0 48px" }}>
        <BananaBanner src={NANOBANANA_ASSETS.landingHero} minHeight={400} overlay={0.5}>
          <div style={{ maxWidth: 560 }}>
            <div className="sx-eyebrow" style={{ color: "#F5A97F", marginBottom: 14 }}>The research desk, reimagined</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", marginBottom: 10, color: "#FFFFFF" }}>
              Real PSE data, in one focused frame.
            </div>
            <p style={{ margin: 0, maxWidth: 480, color: "rgba(247,248,250,0.85)", fontSize: 15, lineHeight: 1.6 }}>
              Live quotes, fundamentals, ownership and disclosures from PSE Edge — the
              full picture of any listed company without leaving the page.
            </p>
          </div>
        </BananaBanner>
      </section>

      {/* ── EXTENSIONS / FEATURES ── */}
      <section style={{ padding: "24px 0 48px" }}>
        <SectionHeading title="There's a tool for that." lede="Research PSE stocks without leaving your workflow." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {extensions.map((ext) => (
            <Card key={ext.name} onClick={() => navigate(ext.route)} iconColor="var(--sx-up)" Icon={ext.icon}>
              <span style={{ display: "block", marginBottom: 5 }}>{ext.name}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--sx-ink-3)", lineHeight: 1.55, fontWeight: 400 }}>{ext.desc}</span>
            </Card>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "24px 0 48px" }}>
        <SectionHeading title="Research that scales." lede="Every feature built for the PSE investor workflow." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {features.map((f) => (
            <Card key={f.title} onClick={() => navigate(f.route)} iconColor="var(--sx-up)" Icon={f.icon}>
              <span style={{ display: "block", marginBottom: 5 }}>{f.title}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--sx-ink-3)", lineHeight: 1.6, fontWeight: 400 }}>{f.desc}</span>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "48px 0 64px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px,3vw,42px)", fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px" }}>
          Take the short way.
        </h2>
        <p style={{ color: "var(--sx-ink-3)", fontSize: 18, margin: "0 0 32px" }}>
          Start researching PSE stocks for free.
        </p>
        <button className="sx-btn" style={{ padding: "0 34px", height: 56, fontSize: 16 }} onClick={() => navigate("/dashboard")}>
          Launch StockEX <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
