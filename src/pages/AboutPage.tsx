import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Command,
  GitBranch,
  LayoutGrid,
  LineChart,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import { colors, radius, space, typography } from "../design/tokens";
import { mapAuthError } from "../services/auth/authErrorMapper";
import { authService } from "../services/auth/authService";

type DemoFrame = {
  label: string;
  title: string;
  body: string;
  chips: string[];
  metrics: Array<{ label: string; value: string }>;
  highlights: string[];
};

const desktopDemoFrames: DemoFrame[] = [
  {
    label: "Home and market pulse",
    title: "Open StockEx and move from search into Market Pulse, scanner ideas, and recently reviewed names.",
    body: "The desktop surface mirrors the real product structure: Home, Scanner, Watchlist, Portfolio, and AI Chat stay connected so the same research thread carries across every screen.",
    chips: ["Home", "Market Pulse", "Recently Researched", "Did You Know?"],
    metrics: [
      { label: "Symbols tracked", value: "2,146" },
      { label: "Research surfaces", value: "9" },
      { label: "Primary flow", value: "Search / Review / Track" },
    ],
    highlights: [
      "Search, Market Pulse, and watchlist follow-through stay in one path.",
      "The same company can move from Home into Scanner and back into review.",
      "Designed for longer desktop research sessions without breaking context.",
    ],
  },
  {
    label: "Scanner workflow",
    title: "Use scanner presets to narrow the field, then open the names that deserve a closer review.",
    body: "Scanner presets, a search rail, and ranked results keep the idea generation flow compact before handing the company off to the stock detail page.",
    chips: ["Quality", "Growth", "Value", "Turnaround"],
    metrics: [
      { label: "Preset groups", value: "12" },
      { label: "Factor rails", value: "8" },
      { label: "Result path", value: "Open stock detail" },
    ],
    highlights: [
      "Preset selections lead straight into a fuller stock page.",
      "Search and result ranking stay compact instead of crowding the screen.",
      "Built for daily scans and deeper weekend review passes.",
    ],
  },
  {
    label: "Watchlist and follow-through",
    title: "Keep thesis changes, alerts, and portfolio follow-through close to the same names you already review.",
    body: "Instead of a passive list, watchlists become a working research surface that keeps changes, alerts, and portfolio context visible in the same loop.",
    chips: ["Track", "Alerts", "Compare", "Portfolio"],
    metrics: [
      { label: "Alert surfaces", value: "3" },
      { label: "Change logs", value: "Structured" },
      { label: "Review path", value: "Persistent" },
    ],
    highlights: [
      "Return to the same names with context already attached.",
      "Pairs scanner discovery with repeat monitoring and review.",
      "Keeps watchlists and portfolio follow-through tied together.",
    ],
  },
];

const mobileDemoFrames: DemoFrame[] = [
  {
    label: "Mobile home",
    title: "Open search, Market Pulse, and the main research path immediately on phone.",
    body: "The mobile home view surfaces search, review entry points, and tracked names in the same order the product uses across the app.",
    chips: ["Search", "Research", "Market Pulse"],
    metrics: [
      { label: "Screen order", value: "Adaptive" },
      { label: "Thumb reach", value: "Optimized" },
    ],
    highlights: [
      "The first view emphasizes price, stance, and the current research read.",
      "Secondary sections follow only when they matter.",
    ],
  },
  {
    label: "Mobile watchlist",
    title: "Jump from watchlist into a stock page or scanner without breaking the review thread.",
    body: "Bottom navigation stays compact while the key review surfaces remain obvious and easy to reopen.",
    chips: ["Watchlist", "Scanner", "Portfolio"],
    metrics: [
      { label: "Navigation", value: "Condensed" },
      { label: "Sections", value: "Accordion-ready" },
    ],
    highlights: [
      "Designed for one-hand review and fast follow-ups.",
      "Prioritizes stock pages, watchlists, and current changes.",
    ],
  },
];

const ecosystemCards = [
  {
    icon: Search,
    title: "Research to detail",
    body: "Start with a preset or search, open a name, and continue the same line of review with metrics, financials, news, and thesis context.",
  },
  {
    icon: Bell,
    title: "Track and review",
    body: "Keep a live list of names worth revisiting, then route changes into a review workflow instead of a passive watchlist.",
  },
  {
    icon: LineChart,
    title: "Broker-ready follow-through",
    body: "Once a name matters, portfolio and broker-connected flows keep exposure, execution context, and follow-up discipline tied to the same system.",
  },
  {
    icon: Shield,
    title: "Structured research language",
    body: "The app is built around research, thesis, conviction, risk, compare, track, and review rather than noisy trading-first copy.",
  },
];

const credibilityRows = [
  {
    label: "Integrated research surface",
    value: "StockEx is designed as one integrated surface for deep company research, live tracking, and broker-connected follow-through.",
  },
  {
    label: "Deep fundamental review",
    value: "The system is built to feel like a dedicated equity research terminal, with financials, charts, signals, and context staying in one place.",
  },
  {
    label: "Adaptive interface",
    value: "Desktop and mobile layouts are selected automatically from device characteristics with no user permission required.",
  },
];

function useAdaptiveAboutMode() {
  const [mode, setMode] = useState<"mobile" | "desktop">(() => {
    if (typeof window === "undefined") return "desktop";
    return window.matchMedia("(max-width: 860px)").matches ? "mobile" : "desktop";
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 860px)");
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setMode(event.matches ? "mobile" : "desktop");
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return mode;
}

function useLoopIndex(length: number, intervalMs = 3600) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, length]);

  return index;
}

function DemoRail({ frame, mode }: { frame: DemoFrame; mode: "mobile" | "desktop" }) {
  const layoutIsMobile = mode === "mobile";
  const metricBars = layoutIsMobile ? [62, 76, 58, 88] : [44, 68, 54, 82, 74, 92];
  const watchlistRows = [
    { symbol: "TCS", thesis: "Quality remains strong", tone: colors.accentRed },
    { symbol: "HDFCBANK", thesis: "Valuation and growth in balance", tone: colors.ink },
    { symbol: "RELIANCE", thesis: "Capital cycle worth revisiting", tone: colors.charcoal },
  ];
  const mobileTabs = frame.chips.slice(0, 3);
  const desktopSidebar = [
    { icon: LayoutGrid, label: "Home" },
    { icon: Search, label: "Scanner" },
    { icon: Star, label: "Watchlist" },
    { icon: TrendingUp, label: "Portfolio" },
    { icon: GitBranch, label: "AI Chat" },
  ];

  return (
    <div
      style={{
        borderRadius: 34,
        border: `1px solid ${colors.hairlineStrong}`,
        background: "linear-gradient(180deg, rgba(15,15,15,0.98), rgba(7,7,7,0.98))",
        padding: layoutIsMobile ? "18px" : "22px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.38)",
        position: "relative",
        overflow: "hidden",
        minHeight: layoutIsMobile ? 560 : 720,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 18% 12%, rgba(255,255,255,0.06), transparent 20%),
            radial-gradient(circle at 85% 16%, rgba(255,107,107,0.14), transparent 20%),
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))
          `,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "grid",
          gap: layoutIsMobile ? 16 : 20,
          height: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: colors.mute,
              }}
            >
              {frame.label}
            </span>
            <span style={{ color: colors.ink, fontSize: layoutIsMobile ? 18 : 22, fontWeight: 600 }}>
              {layoutIsMobile ? "Product walkthrough" : "Product walkthrough loop"}
            </span>
          </div>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: radius.full,
              border: `1px solid ${colors.hairline}`,
              background: "rgba(255,255,255,0.04)",
              color: colors.charcoal,
              fontSize: 12,
            }}
          >
            <Sparkles size={14} color={colors.accentRed} />
            Live product loop
          </div>
        </div>

        {layoutIsMobile ? (
          <div
            style={{
              margin: "0 auto",
              width: "min(100%, 320px)",
              borderRadius: 32,
              padding: 10,
              border: `1px solid rgba(255,255,255,0.14)`,
              background: "linear-gradient(180deg, rgba(25,25,25,0.98), rgba(10,10,10,0.98))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                background: colors.canvas,
                border: `1px solid ${colors.hairline}`,
                minHeight: 500,
                display: "grid",
                gridTemplateRows: "54px auto 70px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 16px",
                  borderBottom: `1px solid ${colors.hairline}`,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Stock detail
                </div>
              </div>

              <div style={{ padding: 16, display: "grid", gap: 14 }}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: "14px 14px 12px",
                    background: "linear-gradient(180deg, rgba(255,107,107,0.14), rgba(255,107,107,0.02))",
                    border: `1px solid ${colors.accentRedSoft}`,
                  }}
                >
                  <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    StockEx
                  </div>
                  <div style={{ color: colors.ink, fontSize: 20, fontWeight: 650, lineHeight: 1.08, marginTop: 10 }}>
                    {frame.chips[0] === "Search" ? "Understand the stock before you invest." : frame.title}
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 54,
                    padding: "0 14px",
                    borderRadius: 18,
                    border: `1px solid ${colors.hairline}`,
                    background: "rgba(255,255,255,0.02)",
                    color: colors.charcoal,
                    fontSize: 14,
                  }}
                >
                  <Search size={16} />
                  Search HDFCBANK, TCS, Infosys...
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${colors.hairline}`,
                    background: "rgba(255,255,255,0.02)",
                    padding: 14,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 8, height: 82 }}>
                    {metricBars.map((height, index) => (
                      <div
                        key={`${frame.label}-mobile-bar-${height}`}
                        style={{
                          flex: 1,
                          height: `${height}%`,
                          borderRadius: "10px 10px 4px 4px",
                          background: index === metricBars.length - 1
                            ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.8))"
                            : "linear-gradient(180deg, rgba(255,107,107,0.74), rgba(255,107,107,0.26))",
                          animation: `stockexBarLoop 3.4s ease-in-out ${index * 0.12}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: colors.mute, fontSize: 11 }}>
                    <span>{mobileTabs[0] ?? "Search"}</span>
                    <span>{mobileTabs[1] ?? "Review"}</span>
                    <span>{mobileTabs[2] ?? "Track"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {watchlistRows.slice(0, 2).map((row) => (
                    <div
                      key={`${frame.label}-${row.symbol}`}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${colors.hairline}`,
                        display: "grid",
                        gap: 5,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <span style={{ color: colors.ink, fontSize: 14, fontWeight: 600 }}>{row.symbol}</span>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: radius.full,
                            background: "rgba(255,255,255,0.05)",
                            color: row.tone,
                            fontSize: 11,
                          }}
                        >
                          Research
                        </span>
                      </div>
                      <div style={{ color: colors.charcoal, fontSize: 13, lineHeight: 1.55 }}>{row.thesis}</div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${colors.hairline}`,
                    background: "rgba(255,255,255,0.02)",
                    padding: 14,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    {frame.metrics.map((metric) => (
                      <div key={metric.label} style={{ display: "grid", gap: 4 }}>
                        <span style={{ color: colors.mute, fontSize: 11 }}>{metric.label}</span>
                        <span style={{ color: colors.ink, fontSize: 15, fontWeight: 600 }}>{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${colors.hairline}`,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  alignItems: "center",
                  padding: "0 10px",
                  gap: 8,
                }}
              >
                {["Home", "Scanner", "Watchlist", "Portfolio"].map((item, index) => (
                  <div
                    key={item}
                    style={{
                      height: 44,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      color: index === 1 ? colors.ink : colors.mute,
                      background: index === 1 ? "rgba(255,255,255,0.06)" : "transparent",
                      border: index === 1 ? `1px solid ${colors.hairlineStrong}` : "1px solid transparent",
                      fontSize: 11,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px minmax(0, 1fr)",
              gap: 16,
              minHeight: 560,
            }}
          >
            <aside
              style={{
                borderRadius: 24,
                padding: "16px 14px",
                border: `1px solid ${colors.hairline}`,
                background: "rgba(255,255,255,0.025)",
                display: "grid",
                gridTemplateRows: "auto auto 1fr auto",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 18,
                  border: `1px solid ${colors.hairlineStrong}`,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ color: colors.ink, fontWeight: 600, fontSize: 16 }}>Workspace</span>
                  <span style={{ color: colors.mute, fontSize: 11 }}>macOS-style frame</span>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: radius.full,
                  background: colors.surface,
                  border: `1px solid ${colors.hairline}`,
                  color: colors.charcoal,
                }}
              >
                <Command size={16} />
                Search listed companies
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {desktopSidebar.map((item, index) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      height: 46,
                      borderRadius: 16,
                      padding: "0 14px",
                      color: index === 1 ? colors.ink : colors.charcoal,
                      background: index === 1 ? "rgba(255,255,255,0.07)" : "transparent",
                      border: index === 1 ? `1px solid ${colors.hairlineStrong}` : "1px solid transparent",
                    }}
                  >
                    <item.icon size={16} />
                    <span style={{ fontSize: 14, fontWeight: index === 1 ? 600 : 500 }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", padding: "0 4px" }}>
                  Resources
                </div>
                {["R. Strength", "Trust & Safety", "What’s New", "Alerts"].map((label) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      height: 40,
                      borderRadius: 14,
                      padding: "0 14px",
                      color: colors.charcoal,
                      border: `1px solid transparent`,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: `1px solid ${colors.hairline}`,
                  background: "linear-gradient(180deg, rgba(255,107,107,0.12), rgba(255,107,107,0.03))",
                  padding: "14px 14px 16px",
                  display: "grid",
                  gap: 8,
                }}
              >
                <span style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Watch next
                </span>
                <span style={{ color: colors.ink, fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
                  Review TCS earnings posture and watchlist changes.
                </span>
              </div>
            </aside>

            <div
              style={{
                borderRadius: 28,
                border: `1px solid ${colors.hairline}`,
                background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                overflow: "hidden",
                display: "grid",
                gridTemplateRows: "70px auto",
              }}
            >
              <div
                style={{
                  padding: "0 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: `1px solid ${colors.hairline}`,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    {frame.label}
                  </span>
                  <span style={{ color: colors.ink, fontSize: 18, fontWeight: 600 }}>
                    StockEx research workspace
                  </span>
                </div>
                <div style={{ display: "inline-flex", gap: 10 }}>
                  {frame.chips.map((chip) => (
                    <span
                      key={chip}
                      style={{
                        padding: "8px 12px",
                        borderRadius: radius.full,
                        border: `1px solid ${colors.hairline}`,
                        background: "rgba(255,255,255,0.03)",
                        color: colors.charcoal,
                        fontSize: 12,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
                <div style={{ display: "grid", gap: 16 }}>
                  <div
                    style={{
                      borderRadius: 24,
                      padding: "18px 18px 20px",
                      border: `1px solid ${colors.hairline}`,
                      background: "linear-gradient(180deg, rgba(255,107,107,0.12), rgba(255,107,107,0.02))",
                    }}
                  >
                    <div style={{ color: colors.ink, fontSize: 34, fontWeight: 650, lineHeight: 1.02, maxWidth: 520 }}>
                      {frame.title}
                    </div>
                    <div style={{ color: colors.body, fontSize: 15, lineHeight: 1.7, marginTop: 14, maxWidth: 540 }}>
                      {frame.body}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 24,
                      padding: "18px",
                      border: `1px solid ${colors.hairline}`,
                      background: "rgba(255,255,255,0.025)",
                      display: "grid",
                      gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                          Market
                        </span>
                        <span style={{ color: colors.ink, fontSize: 24, fontWeight: 620 }}>
                          {frame.chips[0] === "Home" ? "Market Pulse" : frame.chips[0] === "Quality" ? "Scanner results" : "Track conviction"}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: radius.full,
                          border: `1px solid ${colors.hairline}`,
                          background: "rgba(255,255,255,0.03)",
                          color: colors.charcoal,
                          fontSize: 12,
                        }}
                      >
                        {frame.chips[0] === "Home" ? "Market Overview" : frame.chips[0] === "Quality" ? "Quality Compounders" : "Thesis changes"}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                      {frame.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          style={{
                            borderRadius: 18,
                            border: `1px solid ${colors.hairline}`,
                            background: "rgba(255,255,255,0.02)",
                            padding: "14px 14px 16px",
                            display: "grid",
                            gap: 6,
                          }}
                        >
                          <span style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                            {metric.label}
                          </span>
                          <span style={{ color: colors.ink, fontSize: 20, fontWeight: 600 }}>{metric.value}</span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        height: 170,
                        borderRadius: 20,
                        border: `1px solid ${colors.hairline}`,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                        padding: 18,
                        display: "grid",
                        alignItems: "end",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "end", gap: 10, height: 108 }}>
                        {metricBars.map((height, index) => (
                          <div
                            key={`${frame.label}-desktop-bar-${height}`}
                            style={{
                              flex: 1,
                              borderRadius: "14px 14px 4px 4px",
                              background: index >= 4
                                ? "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.78))"
                                : "linear-gradient(180deg, rgba(255,107,107,0.72), rgba(255,107,107,0.3))",
                              height: `${height}%`,
                              animation: `stockexBarLoop 3.6s ease-in-out ${index * 0.12}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: colors.mute, fontSize: 12 }}>
                        <span>Signals</span>
                        <span>Research depth</span>
                        <span>Follow-through</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div
                    style={{
                      borderRadius: 24,
                      border: `1px solid ${colors.hairline}`,
                      background: "rgba(255,255,255,0.02)",
                      padding: "18px 18px 16px",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {frame.highlights.map((highlight, index) => (
                      <div
                        key={highlight}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          padding: "12px 14px",
                          borderRadius: 18,
                          background: "rgba(255,255,255,0.025)",
                          border: `1px solid ${colors.hairline}`,
                          transform: `translateY(${index % 2 === 0 ? 0 : 2}px)`,
                        }}
                      >
                        <CheckCircle2 size={16} color={colors.accentRed} style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ color: colors.charcoal, fontSize: 14, lineHeight: 1.6 }}>{highlight}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      borderRadius: 24,
                      border: `1px solid ${colors.hairline}`,
                      background: "rgba(255,255,255,0.02)",
                      padding: 18,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                      Product depth
                    </div>
                    {watchlistRows.map((row, index) => (
                      <div
                        key={`${frame.label}-watch-${row.symbol}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 14px",
                          borderRadius: 18,
                          border: `1px solid ${colors.hairline}`,
                          background: index === 0 ? "rgba(255,107,107,0.09)" : "rgba(255,255,255,0.02)",
                          color: colors.ink,
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{row.symbol}</span>
                          <span style={{ fontSize: 12, color: colors.charcoal }}>{row.thesis}</span>
                        </div>
                        <ArrowRight size={15} color={index === 0 ? colors.accentRed : colors.mute} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const mode = useAdaptiveAboutMode();
  const frames = mode === "mobile" ? mobileDemoFrames : desktopDemoFrames;
  const activeFrameIndex = useLoopIndex(frames.length, mode === "mobile" ? 3200 : 3800);
  const activeFrame = frames[activeFrameIndex];

  const primaryLabel = useMemo(() => {
    if (loading) return "Checking session";
    if (transitioning) return "Opening workspace";
    if (user) return "Enter StockEx";
    if (signingIn) return "Connecting Google";
    return "Continue with Google";
  }, [loading, signingIn, transitioning, user]);

  const openWorkspace = () => {
    setTransitioning(true);
    window.setTimeout(() => {
      navigate("/", { replace: true });
    }, 420);
  };

  const handlePrimaryAction = async () => {
    if (user) {
      openWorkspace();
      return;
    }

    setAuthError(null);
    setSigningIn(true);
    try {
      await authService.signInWithGoogle();
      openWorkspace();
    } catch (error) {
      const message = mapAuthError(error);
      if (message.includes("popup blocked")) {
        try {
          await authService.beginGoogleRedirect();
          return;
        } catch (redirectError) {
          setAuthError(mapAuthError(redirectError));
        }
      } else {
        setAuthError(message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.canvas,
        color: colors.ink,
        fontFamily: typography.fontFamily,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 12% 10%, rgba(255,255,255,0.05), transparent 18%),
            radial-gradient(circle at 82% 12%, rgba(255,107,107,0.18), transparent 24%),
            radial-gradient(circle at 64% 72%, rgba(255,255,255,0.03), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
          `,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: "-12% -18% auto -18%",
          height: mode === "mobile" ? 340 : 520,
          pointerEvents: "none",
          background: "radial-gradient(closest-side, rgba(255,107,107,0.18), rgba(255,107,107,0.06) 45%, rgba(255,107,107,0) 72%)",
          filter: "blur(42px)",
          animation: "stockexFluid 16s ease-in-out infinite alternate",
          transformOrigin: "center",
        }}
      />

      {transitioning ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,0.84)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 18,
              justifyItems: "center",
              textAlign: "center",
            }}
          >
            <BrandMark size={76} />
            <div style={{ color: colors.ink, fontSize: 30, fontWeight: 650, letterSpacing: "-0.04em" }}>
              Opening StockEx
            </div>
            <div style={{ color: colors.body, fontSize: 15, maxWidth: 360, lineHeight: 1.65 }}>
              Moving you into the research workspace with your watchlists, scanner presets, and current review surfaces.
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          maxWidth: 1320,
          margin: "0 auto",
          padding: mode === "mobile" ? "20px 16px 64px" : "28px 28px 88px",
          display: "grid",
          gap: mode === "mobile" ? 44 : 64,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: mode === "mobile" ? "10px 14px 10px 10px" : "12px 18px 12px 12px",
              borderRadius: 24,
              border: `1px solid ${colors.hairlineStrong}`,
              background: "rgba(10,10,10,0.9)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <BrandMark size={mode === "mobile" ? 42 : 50} />
            <div style={{ display: "grid", gap: 3 }}>
              <span style={{ fontSize: mode === "mobile" ? 17 : 20, fontWeight: 650, color: colors.ink }}>
                StockEx
              </span>
              <span style={{ fontSize: 11, color: colors.mute, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                Research and broker system
              </span>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: mode === "mobile" ? "stretch" : "flex-end",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: radius.full,
                border: `1px solid ${colors.hairline}`,
                background: "rgba(255,255,255,0.03)",
                color: colors.charcoal,
                fontSize: 13,
              }}
            >
              <Command size={14} />
              Product intro
            </div>
            <button
              onClick={handlePrimaryAction}
              disabled={loading || signingIn || transitioning}
              style={{
                minHeight: 50,
                padding: "0 18px",
                borderRadius: radius.full,
                border: `1px solid ${colors.hairlineStrong}`,
                background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                color: colors.ink,
                fontSize: 14,
                fontWeight: 650,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                cursor: loading || signingIn || transitioning ? "default" : "pointer",
              }}
            >
              {primaryLabel}
              <ArrowRight size={16} />
            </button>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: mode === "mobile" ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1.1fr)",
            gap: mode === "mobile" ? 28 : 34,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: mode === "mobile" ? 22 : 26 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                width: "fit-content",
                padding: "8px 14px",
                borderRadius: radius.full,
                border: `1px solid ${colors.accentRedSoft}`,
                background: "rgba(255,107,107,0.09)",
                color: colors.accentRed,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Sparkles size={14} />
              Product walkthrough
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <h1
                style={{
                  margin: 0,
                  color: colors.ink,
                  fontSize: mode === "mobile" ? "52px" : "92px",
                  lineHeight: 0.93,
                  fontWeight: 650,
                  letterSpacing: "-0.065em",
                  maxWidth: mode === "mobile" ? "100%" : 680,
                }}
              >
                Research Indian stocks
                <br />
                with one
                <span style={{ color: colors.accentRed }}> complete system.</span>
              </h1>

              <p
                style={{
                  margin: 0,
                  color: colors.body,
                  fontSize: mode === "mobile" ? 17 : 20,
                  lineHeight: 1.72,
                  maxWidth: 640,
                }}
              >
                StockEx brings search, scanner presets, stock detail, financials, watchlists, portfolio follow-through,
                and broker-connected follow-through into one connected workspace instead of scattering them across separate tools.
              </p>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button
                onClick={handlePrimaryAction}
                disabled={loading || signingIn || transitioning}
                style={{
                  minHeight: 54,
                  padding: "0 22px",
                  borderRadius: radius.full,
                  border: "none",
                  background: colors.primary,
                  color: colors.onPrimary,
                  fontSize: 15,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: loading || signingIn || transitioning ? "default" : "pointer",
                }}
              >
                {primaryLabel}
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => {
                  const node = document.getElementById("stockex-about-details");
                  node?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  minHeight: 54,
                  padding: "0 22px",
                  borderRadius: radius.full,
                  border: `1px solid ${colors.hairlineStrong}`,
                  background: "rgba(255,255,255,0.03)",
                  color: colors.ink,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                See how StockEx works
              </button>
            </div>

            {authError ? (
              <p style={{ margin: 0, color: colors.accentRed, fontSize: 13, lineHeight: 1.6, maxWidth: 520 }}>
                {authError}
              </p>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: mode === "mobile" ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {[
                { label: "Core surfaces", value: "Scanner, stock detail, watchlist, portfolio" },
                { label: "Primary use", value: "Research, compare, track, and broker-ready follow-through" },
                { label: "System shape", value: "Deep research plus connected execution path" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "16px 16px 18px",
                    borderRadius: 22,
                    border: `1px solid ${colors.hairline}`,
                    background: "rgba(255,255,255,0.03)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    {item.label}
                  </div>
                  <div style={{ color: colors.ink, fontSize: 16, lineHeight: 1.55, fontWeight: 550 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DemoRail frame={activeFrame} mode={mode} />
        </section>

        <section
          id="stockex-about-details"
          style={{
            display: "grid",
            gap: 22,
          }}
        >
            <div style={{ display: "grid", gap: 10, maxWidth: 880 }}>
              <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                Why this product exists
              </div>
              <div style={{ color: colors.ink, fontSize: mode === "mobile" ? 34 : 52, fontWeight: 620, lineHeight: 1.02, letterSpacing: "-0.05em" }}>
              StockEx is built to connect deep equity research with the broker path in one product.
              </div>
              <div style={{ color: colors.body, fontSize: mode === "mobile" ? 16 : 18, lineHeight: 1.72 }}>
              Most products split screening, company detail, tracking, and execution into separate experiences.
              StockEx is designed to keep research depth and broker-connected follow-through inside one system so the decision path remains visible and useful.
              </div>
            </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: mode === "mobile" ? "1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {ecosystemCards.map((card, index) => (
              <article
                key={card.title}
                style={{
                  padding: "22px 20px",
                  borderRadius: 28,
                  border: `1px solid ${colors.hairline}`,
                  background: "rgba(255,255,255,0.03)",
                  minHeight: 240,
                  display: "grid",
                  alignContent: "start",
                  gap: 14,
                  animation: `stockexFloat 8s ease-in-out ${index * 0.35}s infinite`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    border: `1px solid ${colors.hairlineStrong}`,
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <card.icon size={18} color={colors.ink} />
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, lineHeight: 1.15, color: colors.ink }}>
                  {card.title}
                </h2>
                <p style={{ margin: 0, color: colors.body, fontSize: 14, lineHeight: 1.68 }}>
                  {card.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: mode === "mobile" ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1.1fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              padding: mode === "mobile" ? "22px 18px" : "28px 26px",
              borderRadius: 30,
              border: `1px solid ${colors.hairline}`,
              background: "linear-gradient(180deg, rgba(255,107,107,0.11), rgba(255,107,107,0.03))",
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Product position
            </div>
            <div style={{ color: colors.ink, fontSize: mode === "mobile" ? 28 : 42, fontWeight: 620, lineHeight: 1.04, letterSpacing: "-0.05em" }}>
              Open one system for company research, tracking, and broker-connected action.
            </div>
            <div style={{ color: colors.body, fontSize: 16, lineHeight: 1.72 }}>
              The about page introduces the product, Google sign-in unlocks the workspace, and the app opens directly into the operating surfaces rather than a blank shell.
              The goal is simple: research depth comparable to a dedicated equity analysis tool, with broker connectivity ready when the thesis turns into action.
            </div>
          </div>

          <div
            style={{
              padding: mode === "mobile" ? "22px 18px" : "28px 26px",
              borderRadius: 30,
              border: `1px solid ${colors.hairline}`,
              background: "rgba(255,255,255,0.03)",
              display: "grid",
              gap: 16,
            }}
          >
            {credibilityRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gap: 6,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${colors.hairline}`,
                }}
              >
                <div style={{ color: colors.ink, fontSize: 18, fontWeight: 600 }}>{row.label}</div>
                <div style={{ color: colors.body, fontSize: 14, lineHeight: 1.68 }}>{row.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            padding: mode === "mobile" ? "26px 20px" : "34px 30px",
            borderRadius: 34,
            border: `1px solid ${colors.hairlineStrong}`,
            background: "linear-gradient(180deg, rgba(16,16,16,0.96), rgba(8,8,8,0.98))",
            display: "grid",
            gap: 18,
            justifyItems: "start",
          }}
        >
          <div style={{ color: colors.mute, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Google sign-in
          </div>
          <div style={{ color: colors.ink, fontSize: mode === "mobile" ? 32 : 48, fontWeight: 620, lineHeight: 1.02, letterSpacing: "-0.05em", maxWidth: 760 }}>
            Use Google to unlock the StockEx workspace and continue into live research.
          </div>
          <div style={{ color: colors.body, fontSize: 16, lineHeight: 1.72, maxWidth: 760 }}>
            This is the handoff point from the public product page into the authenticated research surface.
            Once you sign in, the system transitions you directly into the workspace where research, watchlists, portfolio context, and broker-connected flows stay together.
          </div>
          <button
            onClick={handlePrimaryAction}
            disabled={loading || signingIn || transitioning}
            style={{
              minHeight: 56,
              padding: "0 22px",
              borderRadius: radius.full,
              border: "none",
              background: colors.primary,
              color: colors.onPrimary,
              fontSize: 15,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: loading || signingIn || transitioning ? "default" : "pointer",
            }}
          >
            {primaryLabel}
            <ArrowRight size={16} />
          </button>
        </section>

        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            color: colors.mute,
            fontSize: 12,
            padding: "0 4px",
          }}
        >
          <span>StockEx</span>
          <span>About page adapts to device size automatically without requiring user permission.</span>
        </footer>
      </div>

      <style>{`
        @keyframes stockexFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes stockexBarLoop {
          0%, 100% { transform: scaleY(1); opacity: 0.94; }
          50% { transform: scaleY(1.08); opacity: 1; }
        }

        @keyframes stockexFluid {
          0% { transform: translate3d(-2%, 0%, 0) scale(1) rotate(-5deg); opacity: 0.72; }
          50% { transform: translate3d(4%, 5%, 0) scale(1.08) rotate(2deg); opacity: 0.96; }
          100% { transform: translate3d(-1%, 8%, 0) scale(1.02) rotate(6deg); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
