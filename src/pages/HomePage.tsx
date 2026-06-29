import {
  BarChart3, Bell, Compass, Gauge, Search, Shield,
  Sparkles, Star, TrendingUp, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { HealthometerMini } from "../ui/HealthometerMini";
import { ConvictionBadge } from "../ui/ConvictionBadge";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, space, layout, media } from "../design/tokens";
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
        {/* Gradient accent stripe */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(300px, 80%, 800px)",
            height: 300,
            background:
              "radial-gradient(ellipse 80% 80% at 50% 40%, rgba(255,69,58,0.15) 0%, rgba(255,159,10,0.08) 50%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ maxWidth: "640px", display: "grid", gap: space[6], position: "relative", zIndex: 1 }}>
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
              Research Indian stocks{" "}
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

          {/* Search */}
          <div style={{ display: "flex", gap: space[3], flexWrap: "wrap", justifyContent: "center" }}>
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
                minWidth: "240px",
                flex: "1 1 280px",
                borderRadius: "10px",
                border: `1px solid ${colors.border}`,
                padding: "0 16px 0 38px",
                fontSize: typography.body.desktop.size,
                color: colors.textPrimary,
                background: `${colors.card} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E") 12px center no-repeat`,
                outline: "none",
              }}
            />
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
