import {
  Activity, Compass, Search, TrendingDown, TrendingUp, Eye,
  BarChart2, Bell, BookOpen, Zap,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import OnboardingWizard from "../components/GuidedOnboarding";
import { loadFirstDashboardFlag, dismissFirstDashboardOverlay, markFirstDashboardPending } from "../services/onboarding/onboardingFirstRunMemory";
import { MarketPulse } from "../components/dashboard/MarketPulse";
import { SectorHeatmap } from "../components/dashboard/SectorHeatmap";
import { ForeignFlowWidget } from "../components/dashboard/ForeignFlowWidget";
import { useMarketStatus } from "../hooks/useMarketStatus";

function liveClock(): string {
  return new Date().toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const QUICK_LINKS = [
  { icon: TrendingUp,  label: "Top Gainers",   route: "/scanner?mode=gainers", color: "#0F9D58" },
  { icon: TrendingDown, label: "Top Losers",   route: "/scanner?mode=losers",  color: "#DC2626" },
  { icon: Activity,    label: "Most Active",   route: "/scanner?mode=active",  color: "#0B5FA5" },
  { icon: Compass,     label: "Sectors",       route: "/sectors",              color: "#0B5FA5" },
  { icon: BarChart2,   label: "Portfolio",     route: "/portfolio",            color: "#0B5FA5" },
  { icon: Bell,        label: "Alerts",        route: "/alerts",               color: "#DC2626" },
  { icon: BookOpen,    label: "AI Research",   route: "/chat",                 color: "#0B5FA5" },
  { icon: Zap,         label: "Full Scanner",  route: "/scanner?mode=all",     color: "#0F9D58" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [clock, setClock] = useState(liveClock);
  const marketStatus = useMarketStatus();
  const normalizedQuery = query.trim().toUpperCase();

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    const existingFlag = loadFirstDashboardFlag();
    if (!existingFlag) markFirstDashboardPending();
    const flag = loadFirstDashboardFlag();
    if (flag?.pending && !flag.dismissedAt) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setClock(liveClock()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = query.trim();
    if (t.length < 2) { setSearchResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(t)}&limit=6`);
        const payload = await res.json();
        if (!cancelled) {
          const results = payload.results ?? [];
          const exact = t.toUpperCase();
          setSearchResults([...results].sort((a, b) => {
            const aE = a.symbol.toUpperCase() === exact ? 1 : 0;
            const bE = b.symbol.toUpperCase() === exact ? 1 : 0;
            return bE - aE;
          }));
        }
      } catch { /* search is optional */ }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const resolveTarget = () => {
    if (!normalizedQuery) return null;
    const exact = searchResults.find((s) => s.symbol.toUpperCase() === normalizedQuery);
    if (exact) return exact.symbol;
    return searchResults[0]?.symbol ?? normalizedQuery;
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => { dismissFirstDashboardOverlay(); setShowOnboarding(false); }} />;
  }

  return (
    <div style={{ display: "grid", gap: 14, padding: "16px 20px", maxWidth: 1400, margin: "0 auto" }}>

      {/* ── TRADING TERMINAL HEADER ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 14px", minHeight: 36,
        background: "#EEF1F4",
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: marketStatus.isOpen ? "#0F9D58" : "#94A3B8",
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: marketStatus.isOpen ? "#0F9D58" : "#94A3B8",
            fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
          }}>
            {marketStatus.label}
          </span>
          <span style={{
            fontSize: 11, color: "#9CA3AF",
            fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
          }}>
            PSE
          </span>
        </div>
        <span style={{
          fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
          fontSize: 11, color: "#9CA3AF", letterSpacing: "0.05em",
        }}>
          {clock}
        </span>
      </div>

      {/* ── TICKER SEARCH BAR ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "#9CA3AF", pointerEvents: "none",
          }} />
          <input
            ref={searchRef}
            aria-label="Search a PSE stock"
            placeholder="BDO, JFC, SMPH…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { const t = resolveTarget(); if (t) navigate(`/stock/${t}`); }
              if (e.key === "Escape") { setQuery(""); setSearchResults([]); }
            }}
            style={{
              width: "100%", height: 38, boxSizing: "border-box",
              border: "1px solid rgba(0,0,0,0.14)", background: "#FFFFFF",
              borderRadius: 4, padding: "0 36px 0 32px",
              fontSize: 12, color: "#1A1A1A", outline: "none",
              fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
              transition: "border-color 120ms ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(181, 80, 46, 0.4)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.14)"; }}
          />
          <kbd style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            padding: "1px 4px", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 2,
            color: "#9CA3AF", fontSize: 9, fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
            background: "transparent",
          }}>⌘K</kbd>

          {searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
              border: "1px solid rgba(0,0,0,0.14)", borderRadius: 4,
              background: "#FFFFFF", overflow: "hidden",
              boxShadow: "0 8px 24px rgba(16,24,40,0.14)",
            }}>
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => navigate(`/stock/${r.symbol}`)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "8px 12px", background: "transparent", border: "none",
                    borderBottom: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", textAlign: "left",
                    transition: "background 80ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(181, 80, 46, 0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{
                    fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
                    fontWeight: 700, fontSize: 11, color: "#1A1A1A",
                  }}>
                    {r.symbol}
                  </span>
                  <span style={{ color: "#9CA3AF", fontSize: 11 }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { const t = resolveTarget(); if (t) navigate(`/stock/${t}`); }}
          style={{
            padding: "0 16px", height: 38, borderRadius: 4,
            background: "#0B5FA5", color: "#F0F2F5", border: "1px solid #0B5FA5",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            transition: "background 120ms ease, border-color 120ms ease",
            fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#084A80";
            e.currentTarget.style.borderColor = "#084A80";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#0B5FA5";
            e.currentTarget.style.borderColor = "#0B5FA5";
          }}
        >
          <Eye size={12} /> View
        </button>
      </div>

      {/* ── QUICK ACCESS TOOLBAR ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 6,
      }}>
        {QUICK_LINKS.map((l) => (
          <button
            key={l.label}
            onClick={() => navigate(l.route)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 12px",
              background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.10)",
              borderRadius: 4, cursor: "pointer", textAlign: "left",
              transition: "border-color 120ms ease, background 120ms ease",
              minHeight: 36,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${l.color}40`;
              e.currentTarget.style.background = `${l.color}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)";
              e.currentTarget.style.background = "#FFFFFF";
            }}
          >
            <l.icon size={12} style={{ color: l.color, flexShrink: 0 }} strokeWidth={2.5} />
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.2,
              fontFamily: '"Plus Jakarta Sans", "SF Pro Display", sans-serif',
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {l.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── MARKET PULSE WIDGET ── */}
      <MarketPulse />

      {/* ── TWO COLUMN: Foreign Flow + Sectors ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ForeignFlowWidget />
        <SectorHeatmap />
      </div>

      {/* ── FOOTER: Data Sources ── */}
      <div style={{
        fontSize: 10, color: "#9CA3AF", display: "flex", gap: 12, flexWrap: "wrap",
        padding: "4px 0", borderTop: "1px solid rgba(0,0,0,0.06)",
        marginTop: 6, paddingTop: 12,
        fontFamily: '"SF Mono", "JetBrains Mono", "Roboto Mono", monospace',
      }}>
        <span>PHISIX · PSE Edge</span>
        <Link to="/trust" style={{
          color: "#0B5FA5", textDecoration: "none",
          borderBottom: "1px solid rgba(181, 80, 46, 0.3)",
        }}>
          Data sources
        </Link>
      </div>
    </div>
  );
}
