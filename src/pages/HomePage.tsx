import {
  Compass, Search, TrendingDown, TrendingUp, Eye,
  BarChart2, Bell, BookOpen, Zap, ArrowUpRight,
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

function timeOfDayGreeting(): string {
  const h = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false });
  const hour = parseInt(h, 10);
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const QUICK_LINKS = [
  { icon: TrendingUp,   label: "Top gainers",  route: "/scanner?mode=gainers", tint: "var(--market-green)" },
  { icon: TrendingDown, label: "Top losers",   route: "/scanner?mode=losers",  tint: "var(--market-red)" },
  { icon: Zap,          label: "Most active",  route: "/scanner?mode=active",  tint: "var(--accent)" },
  { icon: Compass,      label: "Sectors",      route: "/sectors",              tint: "var(--accent)" },
  { icon: BarChart2,    label: "Portfolio",    route: "/portfolio",            tint: "var(--accent)" },
  { icon: Bell,         label: "Alerts",       route: "/alerts",               tint: "var(--market-red)" },
  { icon: BookOpen,     label: "AI research",  route: "/chat",                 tint: "var(--accent)" },
  { icon: Search,       label: "Full scanner", route: "/scanner?mode=all",     tint: "var(--market-green)" },
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
    <div style={{ display: "grid", gap: 28, padding: "32px clamp(16px, 4vw, 40px) 40px", maxWidth: 1280, margin: "0 auto" }}>

      {/* ── Masthead row: editorial greeting + live session clock ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--accent)" }}>
            {marketStatus.label} · PSE
          </span>
          <h1
            style={{
              fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500,
              fontSize: "clamp(28px, 4vw, 38px)", letterSpacing: "-0.015em",
              color: "var(--text-primary)", margin: 0, lineHeight: 1.1,
            }}
          >
            {timeOfDayGreeting()}. Here's the tape.
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden="true"
            style={{ width: 6, height: 6, borderRadius: "50%", background: marketStatus.isOpen ? "var(--market-green)" : "var(--text-muted)" }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-body)", letterSpacing: "0.04em" }}>
            {clock} PHT
          </span>
        </div>
      </div>

      {/* ── Ticker search ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-secondary)", pointerEvents: "none",
          }} />
          <input
            ref={searchRef}
            aria-label="Search a PSE stock"
            placeholder="Search BDO, JFC, SMPH…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { const t = resolveTarget(); if (t) navigate(`/stock/${t}`); }
              if (e.key === "Escape") { setQuery(""); setSearchResults([]); }
            }}
            style={{
              width: "100%", height: 44, boxSizing: "border-box",
              border: "1px solid var(--border)", background: "var(--bg-card)",
              borderRadius: 8, padding: "0 44px 0 40px",
              fontSize: 14, color: "var(--text-primary)", outline: "none",
              fontFamily: "var(--font-sans)",
              transition: "border-color 160ms ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
          <kbd style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 4,
            color: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)",
            background: "transparent",
          }}>⌘K</kbd>

          {searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
              border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--bg-card)", overflow: "hidden",
              boxShadow: "var(--shadow-raised)",
            }}>
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => navigate(`/stock/${r.symbol}`)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "10px 14px", background: "transparent", border: "none",
                    borderBottom: "1px solid var(--border-soft)", cursor: "pointer", textAlign: "left",
                    transition: "background 100ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                    {r.symbol}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12.5 }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { const t = resolveTarget(); if (t) navigate(`/stock/${t}`); }}
          style={{
            padding: "0 18px", height: 44, borderRadius: 8,
            background: "var(--brand)", color: "var(--brand-ink)", border: "1px solid var(--brand)",
            fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "background 140ms ease",
            fontFamily: "var(--font-sans)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; }}
        >
          <Eye size={14} /> View
        </button>
      </div>

      {/* ── Quick access ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
        {QUICK_LINKS.map((l) => (
          <button
            key={l.label}
            onClick={() => navigate(l.route)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px",
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 8, cursor: "pointer", textAlign: "left",
              transition: "border-color 160ms ease, background 160ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = l.tint;
              e.currentTarget.style.background = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--bg-card)";
            }}
          >
            <l.icon size={15} style={{ color: l.tint, flexShrink: 0 }} strokeWidth={2} />
            <span style={{
              fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {l.label}
            </span>
            <ArrowUpRight size={12} style={{ color: "var(--text-muted)", marginLeft: "auto", flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {/* ── Market pulse ── */}
      <MarketPulse />

      {/* ── Two column: Foreign flow + Sectors ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="stockex-two-col">
        <ForeignFlowWidget />
        <SectorHeatmap />
      </div>

      <style>{`
        @media (max-width: 860px) {
          .stockex-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Footer: sources ── */}
      <div style={{
        fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 14, flexWrap: "wrap",
        padding: "16px 0 0", borderTop: "1px solid var(--border)",
        fontFamily: "var(--font-mono)",
      }}>
        <span>PHISIX · PSE Edge</span>
        <Link to="/trust" style={{
          color: "var(--accent)", textDecoration: "none",
          borderBottom: "1px solid var(--accent-soft)",
        }}>
          Data sources
        </Link>
      </div>
    </div>
  );
}
