import {
  BarChart3, Bell, BookOpen, Compass, Gauge, Shield,
  Sparkles, Star, TrendingUp, Zap, Lightbulb, Command,
  Keyboard, Github, Twitter, Linkedin, Mail, ChevronRight,
  Search, ArrowRight,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { HealthometerMini } from "../ui/HealthometerMini";
import { ConvictionBadge } from "../ui/ConvictionBadge";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, space, layout, media, radius } from "../design/tokens";
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
      { label: "Portfolio", href: "/portfolio" },
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
    title: "Resources",
    links: [
      { label: "Lensory Trust", href: "/trust" },
      { label: "Disclaimer", href: "/trust" },
      { label: "Privacy", href: "/trust" },
      { label: "Terms of Use", href: "/trust" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Twitter / X", href: "https://x.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
      { label: "GitHub", href: "https://github.com" },
      { label: "Contact", href: "mailto:hello@stockstory.org" },
      { label: "Report an issue", href: "https://github.com" },
    ],
  },
];

// ─── Page component ──────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const sectionGap = useResponsiveValue(layout.sectionGapMobile, layout.sectionGapDesktop);

  // Auto-focus search on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        {/* Raycast-style red diagonal accent — single refined stripe */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%) rotate(-1.8deg)",
            width: "clamp(420px, 85vw, 1100px)",
            height: 220,
            background: "linear-gradient(90deg, rgba(255,107,107,0.08) 0%, rgba(176,21,30,0.12) 50%, rgba(255,107,107,0.08) 100%)",
            clipPath: "polygon(0 20%, 100% 0, 100% 80%, 0 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {/* Subtle glow beneath */}
        <div
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(300px, 60vw, 800px)",
            height: 180,
            background: "radial-gradient(ellipse at center, rgba(255,107,107,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ maxWidth: "680px", display: "grid", gap: space[6], position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gap: space[4] }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: space[2] }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 12px", borderRadius: "100px",
                background: "rgba(255,107,107,0.1)",
                border: "1px solid rgba(255,107,107,0.2)",
                fontSize: 11, fontWeight: 600, color: "#FF6B6B", letterSpacing: "0.02em",
              }}>
                <Sparkles size={12} /> AI-Powered Analysis
              </span>
            </div>
            <h1
              style={{
                color: colors.ink,
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 650,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Understand the stock{" "}
              <span style={{ background: "linear-gradient(135deg, #FF6B6B 0%, #b0151e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                before you invest
              </span>
              .
            </h1>
            <p
              style={{
                color: colors.body,
                fontSize: "16px",
                fontWeight: 400,
                lineHeight: 1.6,
                maxWidth: 540,
                margin: "0 auto",
              }}
            >
              Build conviction with calmer research flows, cleaner comparisons, and the key numbers that changed.
            </p>
          </div>

          {/* Raycast-inspired search bar */}
          <div style={{ display: "flex", gap: space[3], flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ position: "relative", flex: "1 1 360px", minWidth: "260px" }}>
              {/* Glass backdrop */}
              <div style={{
                position: "absolute", inset: 0,
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                pointerEvents: "none",
              }} />
              <input
                ref={searchRef}
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
                  position: "relative",
                  zIndex: 1,
                  height: "48px",
                  width: "100%",
                  borderRadius: "12px",
                  border: "none",
                  padding: "0 56px 0 40px",
                  fontSize: "15px",
                  color: colors.ink,
                  background: "transparent",
                  outline: "none",
                  boxSizing: "border-box",
                  fontWeight: 500,
                }}
              />
              <Search size={16} style={{
                position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                zIndex: 2, pointerEvents: "none", color: "rgba(255,255,255,0.3)",
              }} />
              <kbd
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: colors.surfaceElevated,
                  border: `1px solid ${colors.hairline}`,
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.body,
                  pointerEvents: "none",
                }}
              >
                <Command size={10} />K
              </kbd>
            </div>
            <Button onClick={() => navigate(`/stock/${searchResults[0]?.symbol ?? "HDFCBANK"}`)}>Research</Button>
          </div>
          {searchResults.length > 0 && (
            <div style={{
              display: "grid", gap: 2, textAlign: "left",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Stocks
              </div>
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => navigate(`/stock/${r.symbol}`)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: `${space[3]} ${space[4]}`,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: colors.ink }}>{r.symbol}</span>
                  <span style={{ color: colors.body, fontSize: 13 }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════ QUICK ACTIONS ════════════════ */}
      <section className="raycast-stagger-7" style={{ display: "grid", gap: space[4] }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[2] }}>
          <div style={{ display: "grid", gap: space[1] }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Actions
            </span>
            <h2 style={{ color: colors.ink, fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              Quick Actions
            </h2>
          </div>
          <span style={{ fontSize: 11, color: colors.body, letterSpacing: "0.02em" }}>
            ⌘ 1 – {QUICK_ACTIONS.length}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: space[4] }}>
          {QUICK_ACTIONS.map((action, i) => (
            <Card
              key={action.label}
              onClick={() => navigate(action.route)}
              className={`raycast-slideUp raycast-stagger-${i + 1}`}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <div style={{ display: "grid", gap: space[2] }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "9px",
                  background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <action.icon color={colors.primary} size={16} strokeWidth={1.75} />
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: colors.ink, margin: 0 }}>
                  {action.label}
                </h3>
                <p style={{ fontSize: 12, color: colors.body, lineHeight: 1.4, margin: 0 }}>
                  {action.desc}
                </p>
              </div>
              {/* Keyboard shortcut badge */}
              <div style={{
                position: "absolute", top: 12, right: 12,
                display: "flex", alignItems: "center", gap: 2,
                padding: "2px 6px", borderRadius: "4px",
                background: colors.surfaceElevated,
                border: `1px solid ${colors.hairline}`,
                fontSize: 10, fontWeight: 600, color: colors.body,
              }}>
                <Command size={9} />{i + 1}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ AI INSIGHTS ════════════════ */}
      <div className="ai-insights-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: sectionGap, alignItems: "start" }}>
        {/* Market pulse */}
        <section style={{ display: "grid", gap: space[4] }}>
          <div style={{ display: "grid", gap: space[1] }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Market
            </span>
            <h2 style={{ color: colors.ink, fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              Market Pulse
            </h2>
          </div>
          <Card style={{
            display: "grid", gap: space[5],
            background: `linear-gradient(135deg, ${colors.surface} 0%, rgba(255,255,255,0.02) 100%)`,
            border: `1px solid ${colors.hairline}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <div style={{
                width: 40, height: 40, borderRadius: "10px",
                background: "rgba(255,107,107,0.1)",
                border: "1px solid rgba(255,107,107,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>
                📊
              </div>
              <div>
                <p style={{ fontSize: 13, color: colors.ink, margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                  Market Overview
                </p>
                <p style={{ fontSize: 12, color: colors.body, margin: 0, lineHeight: 1.4 }}>
                  Based on scores across <strong>{leaderboard.reduce((s, p) => s + p.stocks.length, 0)}</strong> tracked stocks
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gap: space[3] }}>
              {MARKET_MOODS.map((mood) => (
                <div key={mood.label} style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "8px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {mood.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: colors.ink }}>
                      <span>{mood.label}</span>
                      <span style={{ color: colors.body, fontWeight: 400 }}>{mood.stocks}</span>
                    </div>
                    <div style={{ height: 4, background: colors.hairline, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        borderRadius: 2,
                        width: mood.label === "Bullish" ? "65%" : mood.label === "Defensive" ? "22%" : "13%",
                        background: mood.label === "Bullish" ? colors.success : mood.label === "Defensive" ? "linear-gradient(90deg, #FF6B6B, #b0151e)" : colors.warning,
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Recent alerts */}
        <section style={{ display: "grid", gap: space[4] }}>
          <div style={{ display: "grid", gap: space[1] }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Alerts
            </span>
            <h2 style={{ display: "flex", alignItems: "center", gap: space[2], color: colors.ink, fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              <Bell size={15} /> Recent Alerts
            </h2>
          </div>
          <Card style={{ display: "grid", gap: space[2] }}>
            {recentAlerts.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.body, margin: 0, padding: space[3], textAlign: "center" }}>
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
                    background: item.alert.acknowledged ? "transparent" : colors.hairlineSoft,
                  }}
                >
                  <div style={{ display: "grid", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.ink }}>
                      {item.alert.symbol ?? "System"}
                    </span>
                    <span style={{ fontSize: 12, color: colors.body }}>
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
      <section className="raycast-stagger-8" style={{ display: "grid", gap: space[4] }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: space[2] }}>
          <div style={{ display: "grid", gap: space[1] }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Leaderboard
            </span>
            <h2 style={{ color: colors.ink, fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              Scanner Leaderboard
            </h2>
          </div>
          <span style={{ fontSize: 11, color: colors.body, letterSpacing: "0.02em" }}>
            Top picks per preset
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: space[4] }}>
          {leaderboard.map((preset, i) => (
            <Card
              key={preset.id}
              onClick={() => navigate(`/scanner?preset=${preset.id}`)}
              className={`raycast-slideUp raycast-stagger-${i + 1}`}
              style={{ cursor: "pointer", padding: space[5] }}
            >
              <div style={{ display: "grid", gap: space[4] }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "7px",
                    background: i === 0 ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${i === 0 ? "rgba(255,107,107,0.2)" : "rgba(255,255,255,0.06)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    color: i === 0 ? "#FF6B6B" : colors.body,
                  }}>
                    {i + 1}
                  </div>
                  <h3 style={{ fontSize: "13px", fontWeight: 600, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
                    {preset.label}
                  </h3>
                </div>
                {preset.stocks.length === 0 ? (
                  <p style={{ fontSize: 12, color: colors.body, margin: 0, padding: space[3], textAlign: "center" }}>No data available</p>
                ) : (
                  <div style={{ display: "grid", gap: space[2] }}>
                    {preset.stocks.map((stock, idx) => (
                      <div
                        key={stock.symbol}
                        style={{
                          display: "flex", alignItems: "center", gap: space[3],
                          padding: `${space[2]} ${space[3]}`,
                          borderRadius: "8px",
                          background: idx === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                          border: idx === 0 ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: "6px",
                          background: idx === 0 ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.04)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: idx === 0 ? "#FF6B6B" : colors.body,
                          flexShrink: 0,
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>
                              {stock.symbol}
                            </span>
                            <HealthometerMini score={Math.round(stock.composite)} size="sm" />
                          </div>
                          <p style={{ fontSize: 11, color: colors.body, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {stock.matchReason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ RECENTLY RESEARCHED ════════════════ */}
      <section className="raycast-stagger-9" style={{ display: "grid", gap: space[4] }}>
        <div style={{ display: "grid", gap: space[1] }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Recent
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <div style={{
              width: 24, height: 24, borderRadius: "6px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Star size={12} color={colors.primary} />
            </div>
            <h2 style={{ color: colors.ink, fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              Recently Researched
            </h2>
          </div>
        </div>
        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          {["HDFCBANK", "TCS", "INFY", "RELIANCE", "ICICIBANK", "LT"].map((symbol, i) => (
            <button
              key={symbol}
              onClick={() => navigate(`/stock/${symbol}`)}
              className={`raycast-slideUp raycast-stagger-${i + 10}`}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: colors.ink,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              {symbol}
            </button>
          ))}
        </div>
      </section>

      {/* ════════════════ DID YOU KNOW ════════════════ */}
      <section style={{ display: "grid", gap: space[4] }}>
        <div style={{ display: "grid", gap: space[1] }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Learn
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <div style={{
              width: 24, height: 24, borderRadius: "6px",
              background: "rgba(255,149,0,0.1)",
              border: "1px solid rgba(255,149,0,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Lightbulb size={12} color={colors.warning} />
            </div>
            <h2 style={{ color: colors.ink, fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              Did You Know?
            </h2>
          </div>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: space[4],
        }}>
          {EDUCATIONAL_FACTS.map((fact, i) => (
            <Card
              key={fact.title}
              className={`raycast-slideUp raycast-stagger-${i + 1}`}
              style={{
                display: "grid", gap: space[3],
                padding: space[5],
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "9px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <fact.icon size={16} color={colors.primary} strokeWidth={1.75} />
              </div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: colors.ink, margin: 0 }}>
                {fact.title}
              </h3>
              <p style={{ fontSize: 12, color: colors.body, lineHeight: 1.5, margin: 0 }}>
                {fact.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════ KEYBOARD SHORTCUTS HINT ════════════════ */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: space[2],
        padding: space[5],
        background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)`,
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.lg,
      }}>
        {[
          { keys: ["⌘", "K"], desc: "Search" },
          { keys: ["⌘", "1–6"], desc: "Quick actions" },
          { keys: ["R"], desc: "Refresh data" },
          { keys: ["?"], desc: "All shortcuts" },
        ].map((shortcut) => (
          <div key={shortcut.desc} style={{ display: "flex", alignItems: "center", gap: 8, padding: `${space[2]} ${space[2]}`, borderRadius: "8px", transition: "background 0.12s ease" }}>
            <Keyboard size={12} style={{ color: colors.body, opacity: 0.4, flexShrink: 0 }} />
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              {shortcut.keys.map((k) => (
                <kbd key={k} style={{
                  padding: "2px 6px", borderRadius: "4px",
                  background: colors.surfaceElevated,
                  border: `1px solid ${colors.hairline}`,
                  fontSize: 10, fontWeight: 600, color: colors.ink,
                  fontFamily: "inherit", lineHeight: 1.4,
                }}>
                  {k}
                </kbd>
              ))}
            </div>
            <span style={{ fontSize: 11, color: colors.body }}>{shortcut.desc}</span>
          </div>
        ))}
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer style={{
        marginTop: space[8],
        paddingTop: space[8],
        borderTop: `1px solid ${colors.hairline}`,
        display: "grid",
        gap: space[8],
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: space[6],
        }}>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} style={{ display: "grid", gap: space[3] }}>
              <h4 style={{ fontSize: "11px", fontWeight: 600, color: colors.body, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
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
                      color: colors.ink,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 6px",
                      borderRadius: "5px",
                      margin: "0 -6px",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
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
          borderTop: `1px solid ${colors.hairline}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: colors.ink,
              background: "linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.6) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Lensory</span>
            <span style={{ fontSize: 12, color: colors.body }}>
              © {new Date().getFullYear()} · educational purposes only
            </span>
          </div>
          <div style={{ display: "flex", gap: space[2] }}>
            {[
              { icon: Twitter, href: "https://x.com", label: "X / Twitter" },
              { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
              { icon: Github, href: "https://github.com", label: "GitHub" },
              { icon: Mail, href: "mailto:hello@stockstory.org", label: "Contact us" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={href}
                href={href}
                aria-label={label}
                target={href.startsWith("mailto") ? undefined : "_blank"}
                rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                style={{
                  width: 32, height: 32, borderRadius: "7px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: colors.body, transition: "all 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = colors.ink;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = colors.body;
                }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Responsive + Animations */}
      <style>{`
        @keyframes raycastFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .raycast-slideUp {
          animation: raycastFadeUp 0.35s ease both;
        }
        .raycast-stagger-1 { animation-delay: 0.02s; }
        .raycast-stagger-2 { animation-delay: 0.05s; }
        .raycast-stagger-3 { animation-delay: 0.08s; }
        .raycast-stagger-4 { animation-delay: 0.11s; }
        .raycast-stagger-5 { animation-delay: 0.14s; }
        .raycast-stagger-6 { animation-delay: 0.17s; }
        .raycast-stagger-7 { animation-delay: 0.19s; }
        .raycast-stagger-8 { animation-delay: 0.21s; }
        .raycast-stagger-9 { animation-delay: 0.23s; }
        .raycast-stagger-10 { animation-delay: 0.25s; }
        .raycast-stagger-11 { animation-delay: 0.27s; }
        .raycast-stagger-12 { animation-delay: 0.29s; }
        @media ${media.mobile} {
          h1 { font-size:${typography.h1.mobile.size} !important; }
          h2 { font-size:${typography.h3.mobile.size} !important; }
          .ai-insights-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
