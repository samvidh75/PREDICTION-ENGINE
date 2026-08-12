import {
  Activity, Compass, Search, TrendingDown, TrendingUp, ArrowRight,
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
  { icon: TrendingUp,  label: "Top Gainers",   route: "/scanner?mode=gainers", color: "var(--market-green)" },
  { icon: TrendingDown, label: "Top Losers",   route: "/scanner?mode=losers",  color: "var(--market-red)" },
  { icon: Activity,    label: "Most Active",   route: "/scanner?mode=active",  color: "var(--accent)" },
  { icon: Compass,     label: "Sectors",       route: "/sectors",              color: "#7B61FF" },
  { icon: BarChart2,   label: "Portfolio",     route: "/portfolio",            color: "var(--amber)" },
  { icon: Bell,        label: "Alerts",        route: "/alerts",               color: "#FF6B9D" },
  { icon: BookOpen,    label: "AI Research",   route: "/chat",                 color: "#22D3EE" },
  { icon: Zap,         label: "Full Scanner",  route: "/scanner?mode=all",     color: "var(--market-orange)" },
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
    <div style={{ display: "grid", gap: 24 }}>

      {/* ── Top bar: status + search ── */}
      <div style={{ display: "grid", gap: 14 }}>
        {/* Status strip */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8,
          padding: "10px 14px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                background: marketStatus.isOpen ? "var(--market-green)" : "var(--text-muted)",
                boxShadow: marketStatus.isOpen ? "0 0 0 2px rgba(38,166,154,0.3)" : "none",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: marketStatus.isOpen ? "var(--market-green)" : "var(--text-secondary)" }}>
              {marketStatus.label}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Philippine Stock Exchange
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
            PHT {clock}
          </span>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              ref={searchRef}
              aria-label="Search a PSE stock"
              placeholder="Search a company or ticker: BDO, JFC, SMPH…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { const t = resolveTarget(); if (t) navigate(`/stock/${t}`); }
                if (e.key === "Escape") { setQuery(""); setSearchResults([]); }
              }}
              style={{
                width: "100%", height: 44, boxSizing: "border-box",
                border: "1px solid var(--border)", background: "var(--bg-sheet)",
                borderRadius: 8, padding: "0 44px 0 38px",
                fontSize: 14, color: "var(--text-primary)", outline: "none",
                fontFamily: "inherit",
                transition: "border-color 150ms ease, box-shadow 150ms ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <kbd style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 4,
              color: "var(--text-muted)", fontSize: 10.5, fontFamily: "var(--font-mono)",
              background: "var(--bg-chip)",
            }}>⌘K</kbd>

            {searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
                border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--bg-card)", overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}>
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => navigate(`/stock/${r.symbol}`)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", padding: "9px 14px", background: "transparent", border: "none",
                      borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{r.symbol}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: 12.5 }}>{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { const t = resolveTarget(); if (t) navigate(`/stock/${t}`); }}
            style={{
              padding: "0 20px", height: 44, borderRadius: 8,
              background: "var(--accent)", color: "var(--accent-ink)", border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-dark)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
          >
            Research <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Quick links grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
        {QUICK_LINKS.map((l) => (
          <button
            key={l.label}
            onClick={() => navigate(l.route)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10,
              padding: "14px 14px 12px",
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 8, cursor: "pointer", textAlign: "left",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(228,168,83,0.32)";
              e.currentTarget.style.background = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--bg-card)";
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 6,
              background: `${l.color}18`,
              border: `1px solid ${l.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: l.color, flexShrink: 0,
            }}>
              <l.icon size={14} strokeWidth={2} />
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {l.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Market Pulse ── */}
      <MarketPulse />

      {/* ── Two column: Foreign Flow + Sectors ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ForeignFlowWidget />
        <SectorHeatmap />
      </div>

      {/* ── Footer note ── */}
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>Prices via PHISIX · Fundamentals via PSE Edge</span>
        <Link to="/trust" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>Data sources & methodology</Link>
      </div>
    </div>
  );
}
