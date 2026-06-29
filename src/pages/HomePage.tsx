import {
  BarChart3, Bell, BookOpen, Compass, Gauge, Shield,
  Sparkles, Star, TrendingUp, Zap, Lightbulb, Command,
  Keyboard, Github, Twitter, Linkedin, Mail, ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { HealthometerMini } from "../ui/HealthometerMini";
import { ConvictionBadge } from "../ui/ConvictionBadge";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, space, layout, media, radius } from "../design/tokens";
import { SEBIComplianceBanner } from "../components/SEBICompliance";
import { scanByPreset } from "../services/scanner/presets";
import { getAlerts } from "../services/personalization/AlertStore";
import type { EnhancedScanType } from "../services/scanner/presets";
import type { AlertStoreItem } from "../services/personalization/AlertStore";

// ─── Quick actions ───────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: "Quality Compounders", desc: "High ROE, low debt", route: "/scanner?preset=quality-compounders" },
  { icon: Zap, label: "High Growth", desc: "Strong revenue & profit growth", route: "/scanner?preset=high-growth" },
  { icon: Compass, label: "Value Opportunities", desc: "Undervalued with margin of safety", route: "/scanner?preset=value-opportunities" },
  { icon: Shield, label: "Dividend Champions", desc: "Consistent dividend payers", route: "/scanner?preset=dividend-champions" },
  { icon: Gauge, label: "Turnaround Stories", desc: "Improving fundamentals, low base", route: "/scanner?preset=turnaround-stories" },
  { icon: BarChart3, label: "Compare Stocks", desc: "Side-by-side fundamental analysis", route: "/compare" },
];

const LEADBOARD_PRESETS: { id: EnhancedScanType; label: string }[] = [
  { id: "quality-compounders", label: "Quality" },
  { id: "high-growth", label: "Growth" },
  { id: "value-opportunities", label: "Value" },
];

const MARKET_MOODS = [
  { label: "Bullish", emoji: "🐂", stocks: "65% of scanned stocks" },
  { label: "Defensive", emoji: "🛡️", stocks: "22% of scanned stocks" },
  { label: "Caution", emoji: "⚠️", stocks: "13% of scanned stocks" },
];

// ─── Educational facts ──────────────────────────────────────────────

const EDUCATIONAL_FACTS = [
  {
    icon: Lightbulb,
    title: "P/E Ratio is not enough",
    body: "A low P/E can mean a value trap. Always pair it with ROE, debt levels, and earnings growth for the full picture.",
  },
  {
    icon: BookOpen,
    title: "The 3‑statement check",
    body: "Always read the P&L, Balance Sheet, and Cash Flow together. A company can show profit but burn cash.",
  },
  {
    icon: TrendingUp,
    title: "Compounding needs time",
    body: "The best Indian wealth creators over 20 years delivered 18‑22% CAGR — consistency beats heroics.",
  },
  {
    icon: Star,
    title: "Promoter holding matters",
    body: "Indian companies with >50% promoter holding tend to be more aligned with minority shareholders.",
  },
  {
    icon: Shield,
    title: "Debt is a double‑edged sword",
    body: "Low debt + high ROE = quality compounder. High debt + low ROE = high risk during downturns.",
  },
  {
    icon: BarChart3,
    title: "Compare, don't isolate",
    body: "A stock's P/E of 30 means nothing in isolation. Compare it with peers and its own 5‑year history.",
  },
];

// ─── Footer links ──────────────────────────────────────────────────

const FOOTER_COLUMNS = [
  {
    title: "Research",
    links: [
      { label: "Scanner", href: "/scanner" },
      { label: "Compare", href: "/compare" },
      { label: "Sectors", href: "/sectors" },
      { label: "Watchlist", href: "/watchlist" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Methodology", href: "/methodology" },
      { label: "StockStory Trust", href: "/trust" },
      { label: "Education Center", href: "/methodology" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Changelog", href: "/changelog" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Disclaimer", href: "/trust" },
      { label: "Privacy", href: "/trust" },
      { label: "Terms of Use", href: "/trust" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Twitter / X", href: "https://x.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
      { label: "GitHub", href: "https://github.com" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact", href: "mailto:hello@stockstory.org" },
      { label: "FAQ", href: "/methodology" },
      { label: "Report an issue", href: "https://github.com" },
    ],
  },
];

// ─── Page component ──────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const sectionGap = useResponsiveValue(layout.sectionGapMobile, layout.sectionGapDesktop);

  // Debounced search
  useEffect(() => {
    let cancelled = false;
    const normalized = query.trim();
    if (normalized.length < 2) { setSearchResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(normalized)}&limit=5`);
        const payload = await res.json();
        if (!cancelled) setSearchResults((payload.results ?? []));
      } catch { /* search is optional */ }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  // Scanner leaderboard (top 3 per preset)
  const leaderboard = useMemo(() => {
    return LEADBOARD_PRESETS.map((p) => ({
      ...p,
      stocks: scanByPreset(p.id, 3),
    }));
  }, []);

  // Recent alerts
  const recentAlerts = useMemo(() => {
    return getAlerts().slice(0, 5);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ display: "grid", gap: sectionGap }}>
      <SEBIComplianceBanner />

      {/* ════════════════ HERO ════════════════ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          display: "grid",
          justifyItems: "center",
          textAlign: "center",
          paddingTop: layout.pagePaddingDesktop,
          paddingBottom: layout.pagePaddingDesktop,
        }}
      >
        {/* Raycast-style red stripe */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(400px, 90%, 1000px)",
            height: 350,
            background: "radial-gradient(ellipse 60% 60% at 50% 30%, rgba(255,69,58,0.25) 0%, rgba(255,105,97,0.12) 30%, rgba(255,159,10,0.06) 55%, transparent 75%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ maxWidth: "680px", display: "grid", gap: space[6], position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gap: space[4] }}>
            <h1
              style={{
                color: colors.textPrimary,
                fontSize: typography.h1.desktop.size,
                fontWeight: typography.h1.desktop.weight,
                lineHeight: typography.h1.desktop.line,
                letterSpacing: typography.h1.desktop.track,
              }}
            >
              Understand the stock{" "}
              <span style={{ background: "linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                before you invest
              </span>
              .
            </h1>
            <p
              style={{
                color: colors.textSecondary,
                fontSize: typography.body.desktop.size,
                fontWeight: 400,
                lineHeight: typography.body.desktop.line,
              }}
            >
              Build conviction with calmer research flows, cleaner comparisons, and the key numbers that changed.
            </p>
          </div>

          {/* Search with keyboard hint */}
          <div style={{ display: "flex", gap: space[3], flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ position: "relative", flex: "1 1 300px", minWidth: "240px" }}>
              <input
                aria-label="Search stocks"
                placeholder="Search HDFCBANK, TCS, Infosys…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults[0]) {
                    navigate(`/stock/${searchResults[0].symbol}`);
                  }
                }}
                style={{
                  height: "44px",
                  width: "100%",
                  borderRadius: "10px",
                  border: `1px solid ${colors.border}`,
                  padding: "0 60px 0 38px",
                  fontSize: typography.body.desktop.size,
                  color: colors.textPrimary,
                  background: `${colors.card} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E") 12px center no-repeat`,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <kbd
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: colors.fill,
                  border: `1px solid ${colors.border}`,
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.textSecondary,
                  pointerEvents: "none",
                }}
              >
                <Command size={10} />K
              </kbd>
            </div>
            <Button onClick={() => navigate(`/stock/${searchResults[0]?.symbol ?? "HDFCBANK"}`)}>Research</Button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ display: "grid", gap: space[2], textAlign: "left" }}>
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => navigate(`/stock/${r.symbol}`)}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: "10px",
                    background: colors.card,
                    padding: `${space[3]} ${space[4]}`,
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{r.symbol}</span>
                  <span style={{ color: colors.textSecondary }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════ QUICK ACTIONS ════════════════ */}
      <section style={{ display: "grid", gap: space[5] }}>
        <h2 style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight }}>
          Quick Actions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: space[4] }}>
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.label}
              onClick={() => navigate(action.route)}
              style={{ cursor: "pointer" }}
            >
              <div style={{ display: "grid", gap: space[2] }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "8px",
                  background: "rgba(0,122,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <action.icon color={colors.primary} size={16} strokeWidth={1.75} />
                </div>
                <h3 style={{ fontSize: typography.caption.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                  {action.label}
                </h3>
                <p style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.4, margin: 0 }}>
                  {action.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ AI INSIGHTS ════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: sectionGap, alignItems: "start" }}>
        {/* Market pulse */}
        <section style={{ display: "grid", gap: space[5] }}>
          <h2 style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight }}>
            Market Pulse
          </h2>
          <Card variant="accent" style={{ display: "grid", gap: space[4] }}>
            <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Based on fundamental health scores across <strong>{leaderboard.reduce((s, p) => s + p.stocks.length, 0)}</strong> tracked stocks
            </p>
            <div style={{ display: "grid", gap: space[3] }}>
              {MARKET_MOODS.map((mood) => (
                <div key={mood.label} style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <span style={{ fontSize: 20 }}>{mood.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>
                      <span>{mood.label}</span>
                      <span>{mood.stocks}</span>
                    </div>
                    <div style={{ height: 4, background: colors.border, borderRadius: 2, marginTop: 4 }}>
                      <div style={{
                        height: "100%",
                        borderRadius: 2,
                        width: mood.label === "Bullish" ? "65%" : mood.label === "Defensive" ? "22%" : "13%",
                        background: mood.label === "Bullish" ? colors.success : mood.label === "Defensive" ? colors.primary : "#FF9500",
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Recent alerts */}
        <section style={{ display: "grid", gap: space[5] }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: space[2], color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight }}>
            <Bell size={16} /> Recent Alerts
          </h2>
          <Card style={{ display: "grid", gap: space[2] }}>
            {recentAlerts.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0, padding: space[3], textAlign: "center" }}>
                No recent alerts. Start researching to get notified of changes.
              </p>
            ) : (
              recentAlerts.map((item: AlertStoreItem) => (
                <div
                  key={item.alert.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: `${space[2]} ${space[3]}`,
                    borderRadius: "8px",
                    background: item.alert.acknowledged ? "transparent" : "rgba(0,122,255,0.06)",
                  }}
                >
                  <div style={{ display: "grid", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>
                      {item.alert.symbol ?? "System"}
                    </span>
                    <span style={{ fontSize: 12, color: colors.textSecondary }}>
                      {item.alert.title?.slice(0, 80) ?? item.alert.body?.slice(0, 80)}
                    </span>
                  </div>
                  <ConvictionBadge
                    level={item.alert.type === "thesis_change" ? "caution" : item.alert.type === "watchlist_review" ? "healthy" : "stable"}
                    size="sm"
                  />
                </div>
              ))
            )}
          </Card>
        </section>
      </div>

      {/* ════════════════ SCANNER LEADERBOARD ════════════════ */}
      <section style={{ display: "grid", gap: space[5] }}>
        <h2 style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight }}>
          Scanner Leaderboard
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: space[4] }}>
          {leaderboard.map((preset) => (
            <Card key={preset.id} onClick={() => navigate(`/scanner?preset=${preset.id}`)} style={{ cursor: "pointer" }}>
              <div style={{ display: "grid", gap: space[3] }}>
                <h3 style={{ fontSize: typography.caption.desktop.size, fontWeight: 600, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
                  {preset.label}
                </h3>
                {preset.stocks.length === 0 ? (
                  <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0 }}>No data available</p>
                ) : (
                  preset.stocks.map((stock, i) => (
                    <div key={stock.symbol} style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, minWidth: 16 }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>
                            {stock.symbol}
                          </span>
                          <HealthometerMini score={Math.round(stock.composite)} size="sm" />
                        </div>
                        <p style={{ fontSize: 11, color: colors.textSecondary, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {stock.matchReason}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ RECENTLY RESEARCHED ════════════════ */}
      <section style={{ display: "grid", gap: space[5] }}>
        <h2 style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight }}>
          <Star size={16} style={{ verticalAlign: "middle", marginRight: space[2] }} />
          Recently Researched
        </h2>
        <div style={{ display: "flex", gap: space[3], overflowX: "auto", paddingBottom: space[2] }}>
          {["HDFCBANK", "TCS", "INFY", "RELIANCE", "ICICIBANK", "LT"].map((symbol) => (
            <Button key={symbol} variant="secondary" onClick={() => navigate(`/stock/${symbol}`)}>
              {symbol}
            </Button>
          ))}
        </div>
      </section>

      {/* ════════════════ DID YOU KNOW ════════════════ */}
      <section style={{ display: "grid", gap: space[5] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
          <Lightbulb size={16} color={colors.warning} />
          <h2 style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, margin: 0 }}>
            Did You Know?
          </h2>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: space[4],
        }}>
          {EDUCATIONAL_FACTS.map((fact) => (
            <Card key={fact.title} style={{ display: "grid", gap: space[2] }}>
              <fact.icon size={18} color={colors.primary} strokeWidth={1.75} />
              <h3 style={{ fontSize: typography.caption.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                {fact.title}
              </h3>
              <p style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
                {fact.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ KEYBOARD SHORTCUTS HINT ════════════════ */}
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
        marginTop: space[8],
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
              <h4 style={{ fontSize: typography.label.desktop.size, fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
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

      {/* Responsive */}
      <style>{`
        @media ${media.mobile} {
          h1 { font-size:${typography.h1.mobile.size} !important; }
          h2 { font-size:${typography.h3.mobile.size} !important; }
          .ai-insights-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
