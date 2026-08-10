import {
  Activity, Compass, Search, TrendingDown, TrendingUp, ArrowRight,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import OnboardingWizard from "../components/GuidedOnboarding";
import { loadFirstDashboardFlag, dismissFirstDashboardOverlay, markFirstDashboardPending } from "../services/onboarding/onboardingFirstRunMemory";
import { CommandCenter } from "../components/dashboard/CommandCenter";
import { useMarketStatus } from "../hooks/useMarketStatus";
import { WatchStrip } from "../components/dashboard/WatchStrip";
import { MarketPulse } from "../components/dashboard/MarketPulse";
import { SectorHeatmap } from "../components/dashboard/SectorHeatmap";
import { MarketHeatmap } from "../components/dashboard/MarketHeatmap";
import { ForeignFlowWidget } from "../components/dashboard/ForeignFlowWidget";

/* ─── Quick screens — one-click preset scans, re-cast in plain words ──── */

const QUICK_ACTIONS = [
  { icon: TrendingUp,  label: "Top Gainers",   desc: "Live % movers this session",    route: "/scanner?mode=gainers" },
  { icon: Activity,    label: "Most Active",   desc: "Highest trading volume today",  route: "/scanner?mode=active" },
  { icon: TrendingDown, label: "Top Losers",   desc: "Live decliners this session",   route: "/scanner?mode=losers" },
  { icon: Search,      label: "Full Universe", desc: "All PSE common shares, A–Z",    route: "/scanner?mode=all" },
  { icon: Compass,     label: "Sector Lens",   desc: "PSE sector-level performance",  route: "/sectors" },
];

function liveClock(): string {
  // Manila time, not the browser's local timezone — the whole product is
  // PSE-first and visitors may be anywhere in the world.
  return new Date().toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function HomePage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [clock, setClock] = useState(liveClock);
  const marketStatus = useMarketStatus();
  const normalizedQuery = query.trim().toUpperCase();

  /* Onboarding for first-time visitors */
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    const existingFlag = loadFirstDashboardFlag();
    if (!existingFlag) markFirstDashboardPending();
    const flag = loadFirstDashboardFlag();
    if (flag?.pending && !flag.dismissedAt) setShowOnboarding(true);
  }, []);
  const handleOnboardingComplete = () => {
    dismissFirstDashboardOverlay();
    setShowOnboarding(false);
  };

  const resolveSearchTarget = () => {
    if (!normalizedQuery) return null;
    const exactSymbol = searchResults.find((stock) => stock.symbol.toUpperCase() === normalizedQuery);
    if (exactSymbol) return exactSymbol.symbol;
    const exactName = searchResults.find((stock) => stock.name.toUpperCase() === normalizedQuery);
    if (exactName) return exactName.symbol;
    return searchResults[0]?.symbol ?? normalizedQuery;
  };

  /* Cmd-K shortcut to focus search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Live clock — ticks once a second, purely cosmetic but reads as "live" */
  useEffect(() => {
    const t = window.setInterval(() => setClock(liveClock()), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* Debounced search */
  useEffect(() => {
    let cancelled = false;
    const normalized = query.trim();
    if (normalized.length < 2) { setSearchResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(normalized)}&limit=6`);
        const payload = await res.json();
        if (!cancelled) {
          const results = payload.results ?? [];
          const exact = normalized.toUpperCase();
          const sorted = [...results].sort((a, b) => {
            const aExact = a.symbol.toUpperCase() === exact || a.name.toUpperCase() === exact ? 1 : 0;
            const bExact = b.symbol.toUpperCase() === exact || b.name.toUpperCase() === exact ? 1 : 0;
            return bExact - aExact;
          });
          setSearchResults(sorted);
        }
      } catch {
        /* search is optional */
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* ════════════ TOOLBAR — compact app header, not a landing-page hero ════════════ */}
      <section className="stockex-stagger" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 3 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
              Dashboard
            </h1>
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              Your PSE research desk, at a glance.
            </span>
          </div>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 12px", borderRadius: 999, border: "1px solid var(--border)",
              fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)",
            }}
          >
            <span className="stockex-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: marketStatus.isOpen ? "var(--market-green)" : "var(--text-muted)" }} />
            PSE · {clock}
            <span aria-hidden="true" style={{ color: "var(--border-strong)" }}>|</span>
            <span style={{ color: marketStatus.isOpen ? "var(--market-green)" : "var(--text-secondary)", fontWeight: 600 }}>
              {marketStatus.label}
            </span>
          </div>
        </div>

        {/* Search — a toolbar element, sized for daily use, not a hero centerpiece */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap" }}>
          <label style={{ position: "relative", flex: "1 1 320px", minWidth: 240, display: "block" }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            <input
              ref={searchRef}
              aria-label="Search a stock on the PSE"
              placeholder="Search a company: BDO, Jollibee, Ayala…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const target = resolveSearchTarget();
                  if (target) navigate(`/stock/${target}`);
                }
              }}
              style={{
                width: "100%", height: 42,
                border: "1px solid var(--border)", background: "var(--bg-sheet)",
                borderRadius: 8, padding: "0 46px 0 40px",
                fontFamily: "var(--font-display)", fontSize: 14.5, color: "var(--text-primary)",
                outline: "none", transition: "border-color 220ms var(--ease-soft), box-shadow 220ms var(--ease-soft)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <span
              aria-hidden="true"
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                padding: "2px 7px", border: "1px solid var(--border)", borderRadius: 3,
                color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10.5,
              }}
            >
              ⌘K
            </span>

            {searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20,
                  border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-sheet)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)", overflow: "hidden",
                }}
              >
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => navigate(`/stock/${r.symbol}`)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", padding: "10px 14px", background: "transparent", border: "none",
                      borderTop: "1px solid var(--border-soft)", cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{r.symbol}</span>
                    <span style={{ color: "var(--text-body)", fontSize: 12.5 }}>{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </label>
          <Button onClick={() => { const t = resolveSearchTarget(); if (t) navigate(`/stock/${t}`); }} size="md">
            Research <ArrowRight size={14} />
          </Button>
        </div>

        {/* Quick screens — compact chips, not a hero action row */}
        <div className="stockex-stagger" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.route)}
              title={a.desc}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", background: "transparent", border: "1px solid var(--border)",
                borderRadius: 999, color: "var(--text-primary)", fontFamily: "var(--font-sans)",
                fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                transition: "border-color 200ms var(--ease-soft), color 200ms var(--ease-soft), transform 200ms var(--ease-soft), background 200ms var(--ease-soft)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <a.icon size={13} strokeWidth={1.5} />
              {a.label}
            </button>
          ))}
        </div>
      </section>

      {/* ════════════ MARKET PULSE — live PSEi-30 gainers/losers ════════════ */}
      <MarketPulse />

      {/* ════════════ FOREIGN FLOW — real net foreign buying/selling ════════════ */}
      <ForeignFlowWidget />

      {/* ════════════ SECTOR HEATMAP — real sector-level performance ════════════ */}
      <SectorHeatmap />

      {/* ════════════ MARKET HEATMAP — all PSEi-30 constituents, per-stock ════════════ */}
      <MarketHeatmap />

      {/* ════════════ COMMAND CENTER — real feature launch grid ════════════ */}
      <CommandCenter />

      {/* ════════════ WATCH STRIP — curated PSE tickers ════════════ */}
      <WatchStrip />
    </div>
  );
}
