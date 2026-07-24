import {
  BarChart3, Compass, Gauge, Shield,
  TrendingUp, Zap, Search, ArrowRight, ChevronDown,
  BookOpen, Scale, Layers, Activity, Wallet, Quote,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useResponsiveValue } from "../ui/responsive";
import { layout, media } from "../design/tokens";
import OnboardingWizard from "../components/GuidedOnboarding";
import { loadFirstDashboardFlag, dismissFirstDashboardOverlay, markFirstDashboardPending } from "../services/onboarding/onboardingFirstRunMemory";
import { HeroVisual } from "../components/HeroVisual";

/* ─── Quick actions (re-cast as plain words, no jargon) ──────────────── */

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: "Companies that compound",   desc: "Steady earners, low debt",        route: "/scanner?preset=quality-compounders" },
  { icon: Zap,        label: "Companies that are growing", desc: "Sales and profit on the rise",     route: "/scanner?preset=high-growth" },
  { icon: Compass,    label: "Companies that look cheap",   desc: "Trading below what they're worth", route: "/scanner?preset=value-opportunities" },
  { icon: Shield,     label: "Companies that pay you",     desc: "Steady dividends, year after year", route: "/scanner?preset=dividend-champions" },
  { icon: Gauge,      label: "Companies turning around",   desc: "Improving from a low base",        route: "/scanner?preset=turnaround-stories" },
  { icon: BarChart3,  label: "Compare two companies",      desc: "Side by side, on the same terms",  route: "/compare" },
];

/* The five "checks" we score on — explained in plain investor language. */
const SCORE_DIMS = [
  { key: "Quality",    label: "Are earnings real?",          hint: "Profit quality, return on equity, cash left over after the basics." },
  { key: "Growth",     label: "Is the business growing?",     hint: "Three, five, and ten-year revenue and profit trends." },
  { key: "Valuation",  label: "What does the price assume?", hint: "Margin of safety vs its own history and peers." },
  { key: "Momentum",   label: "Is the tape on its side?",     hint: "How price and volume have been behaving lately." },
  { key: "Risk",       label: "What can hurt it?",            hint: "Debt, sector cyclicality, single-customer dependency." },
];

const LESSONS = [
  {
    icon: BookOpen,
    title: "A low P/E is not a free lunch",
    body: "A cheap multiple can mean a business in trouble. Look at debt, returns on equity and how profit is growing before calling it a deal.",
  },
  {
    icon: Scale,
    title: "Profit on paper, cash in the bank",
    body: "A profitable company can still burn cash. Read the income, balance sheet and cash flow together — they tell different sides of the same story.",
  },
  {
    icon: Layers,
    title: "Compounding is a long game",
    body: "The best wealth creators in the PSXs compound through durable businesses and patient ownership. Consistency beats heroics.",
  },
  {
    icon: Activity,
    title: "Debt amplifies both ways",
    body: "Low debt and high returns usually means a sturdy business. High debt and low returns means a stock that hurts first in a downturn.",
  },
  {
    icon: Wallet,
    title: "Buy the business, not the headline",
    body: "A single good or bad news cycle can swing the quote 10 percent. The business underneath moves slower — invest in that.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const sectionGap = useResponsiveValue(layout.sectionGapMobile, layout.sectionGapDesktop);
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


  /* Scroll-reveal: sections below the fold fade/rise in as they enter view,
     instead of dumping the whole page at once (a real landing page paces
     itself — it doesn't show everything on load). */
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".stockex-reveal"));
    if (!targets.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ display: "grid", gap: sectionGap }}>
      {/* ════════════ HERO — full-viewport impact block, nothing else fights for attention ════════════ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          display: "grid",
          alignContent: "center",
          gap: 32,
          minHeight: "min(86vh, 780px)",
          paddingTop: "clamp(40px, 6vw, 72px)",
          paddingBottom: "clamp(20px, 3vw, 32px)",
        }}
      >
        {/* Central micro-animation — breathing core + slow rotating arc + two
            orbiting points, one hue throughout. The headline below is short
            on purpose so this has room to actually read as motion. */}
        <div className="stockex-beam-field" aria-hidden="true">
          <div className="stockex-beam" />
          <div className="stockex-beam-arc" />
          <div className="stockex-beam-orbit a" />
          <div className="stockex-beam-orbit b" />
        </div>

        {/* Everything above the fold sits in its own stacking layer, above the beam */}
        <div style={{ position: "relative", zIndex: 1, display: "grid", justifyItems: "center", gap: 28, textAlign: "center", maxWidth: 880, margin: "0 auto" }}>

        {/* Short, centered headline — small enough that the micro-animation
            behind it has room to actually read as motion, not wallpaper. */}
        <h1
          className="stockex-load-in"
          style={{
            animationDelay: "80ms",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            fontFeatureSettings: '"ss01" on, "kern" on, "liga" on',
            margin: 0,
          }}
        >
          Know before you invest.
        </h1>

        {/* One line, plain language. */}
        <p
          className="stockex-load-in"
          style={{
            animationDelay: "220ms",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(15px, 1.3vw, 18px)",
            fontWeight: 400,
            lineHeight: 1.5,
            color: "var(--text-body)",
            maxWidth: 460,
            margin: 0,
          }}
        >
          A quiet research desk for PSX equities.
        </p>

        {/* Single call to action — the fold makes one ask, not five */}
        <div className="stockex-load-in" style={{ animationDelay: "340ms", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Button onClick={() => searchRef.current?.focus()} size="lg">
            Find a stock
            <ArrowRight size={16} />
          </Button>
          <span style={{ color: "var(--text-secondary)", fontSize: 12.5, fontFamily: "var(--font-mono)" }}>
            or press ⌘ K
          </span>
        </div>
        </div>

        {/* Scroll cue */}
        <button
          onClick={() => document.getElementById("stockex-below-fold")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          aria-label="Scroll to explore"
          className="stockex-load-in"
          style={{
            animationDelay: "500ms",
            position: "relative",
            zIndex: 1,
            justifySelf: "center",
            alignSelf: "end",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <ChevronDown size={16} style={{ animation: "stockex-scroll-cue 2.2s ease-in-out infinite" }} />
        </button>
      </section>

      {/* ════════════ SEARCH + QUICK ACTIONS — revealed on scroll, not dumped on load ════════════ */}
      <section id="stockex-below-fold" className="stockex-reveal" style={{ display: "grid", gap: 32 }}>
        {/* Search + actions */}
        <div style={{ display: "grid", gap: 16, maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                position: "relative",
                flex: "1 1 320px",
                minWidth: 260,
                display: "block",
              }}
            >
              <Search
                size={18}
                style={{
                  position: "absolute", left: 16, top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-secondary)",
                  pointerEvents: "none",
                }}
              />
              <input
                ref={searchRef}
                aria-label="Search a stock on the PSE"
                placeholder="Type a company: BDO, Jollibee, Ayala…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const target = resolveSearchTarget();
                    if (target) navigate(`/stock/${target}`);
                  }
                }}
                style={{
                  width: "100%",
                  height: 52,
                  border: "1px solid var(--border)",
                  background: "var(--bg-sheet)",
                  borderRadius: 4,
                  padding: "0 56px 0 46px",
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--text-primary)",
                  outline: "none",
                  transition: "border-color 220ms var(--ease-soft), box-shadow 220ms var(--ease-soft)",
                  boxSizing: "border-box",
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
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: 14, top: "50%",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  border: "1px solid var(--border)",
                  borderRadius: 3,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                }}
              >
                ⌘ K
              </span>
            </label>
          <Button onClick={() => navigate(`/stock/${resolveSearchTarget() ?? "BDO"}`)} size="lg">
              Research it
              <ArrowRight size={16} />
            </Button>
          </div>

          {/* Search results — paper list */}
          {searchResults.length > 0 && (
            <div
              style={{
                display: "grid",
                gap: 0,
                border: "1px solid var(--border)",
                borderRadius: 4,
                background: "var(--bg-sheet)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  borderBottom: "1px solid var(--border-soft)",
                }}
              >
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
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px solid var(--border-soft)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 180ms var(--ease-soft)",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 500,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {r.symbol}
                  </span>
                  <span style={{ color: "var(--text-body)", fontSize: 13 }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick actions row — flat chips, no orphaned emojis */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_ACTIONS.map((a, i) => (
              <button
                key={a.label}
                onClick={() => navigate(a.route)}
                className={`stockex-rise stockex-rise-${i + 1}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 200ms var(--ease-soft)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
              >
                <a.icon size={13} strokeWidth={1.5} />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Abstract motion piece — not a data readout, just the room's ambience */}
        <div style={{ marginTop: 8 }}>
          <HeroVisual />
        </div>
      </section>

      {/* ════════════ FIVE CHECKS ════════════ */}
      <section className="stockex-reveal" style={{ display: "grid", gap: 24 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <span className="eyebrow">Methodology</span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3vw, 36px)",
              fontWeight: 500,
              lineHeight: 1.12,
              letterSpacing: "-0.018em",
              color: "var(--text-primary)",
              maxWidth: 780,
              margin: 0,
            }}
          >
            Five honest checks, in plain English. <em className="italic-serif" style={{ color: "var(--accent)" }}>No ratings, no “Buy / Sell”.</em>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 1,
            borderTop: "1px solid var(--border)",
            borderLeft: "1px solid var(--border)",
            background: "var(--border)",
          }}
        >
          {SCORE_DIMS.map((d, i) => (
            <article
              key={d.key}
              className={`stockex-rise stockex-rise-${i + 1}`}
              style={{
                background: "var(--bg-sheet)",
                padding: "22px 22px 24px",
                display: "grid",
                gap: 8,
                minHeight: 140,
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--accent)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                0{i + 1} · {d.key}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  letterSpacing: "-0.012em",
                  color: "var(--text-primary)",
                }}
              >
                {d.label}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: "var(--text-body)",
                }}
              >
                {d.hint}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ════════════ LESSONS ════════════ */}
      <section className="stockex-reveal" style={{ display: "grid", gap: 0 }}>
        <button
          type="button"
          onClick={() => setLessonsOpen((prev) => !prev)}
          aria-expanded={lessonsOpen}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            width: "100%",
            padding: "16px 20px",
            borderTop: "2px solid var(--text-primary)",
            borderBottom: lessonsOpen ? "1px solid var(--border)" : "2px solid var(--text-primary)",
            background: "transparent",
            color: "var(--text-primary)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <span
              style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "inline-flex",
                alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Quote size={14} strokeWidth={1.6} />
            </span>
            <div style={{ display: "grid", gap: 2 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  fontWeight: 500,
                }}
              >
                Five things worth remembering
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: "-0.012em",
                  color: "var(--text-primary)",
                }}
              >
                Old ideas that protect your money.
              </span>
            </div>
          </div>
          <ChevronDown
            size={16}
            style={{
              flexShrink: 0,
              transform: lessonsOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms var(--ease-soft)",
              color: "var(--text-secondary)",
            }}
          />
        </button>
        {lessonsOpen && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 1,
              background: "var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {LESSONS.map((fact, i) => (
              <article
                key={fact.title}
                className={`stockex-rise stockex-rise-${i + 1}`}
                style={{
                  background: "var(--bg-sheet)",
                  padding: "20px 22px 24px",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32, height: 32,
                    border: "1px solid var(--border)",
                    borderRadius: 0,
                    background: "transparent",
                    color: "var(--accent)",
                    display: "inline-flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <fact.icon size={16} strokeWidth={1.5} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 17,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    letterSpacing: "-0.012em",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {fact.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "var(--text-body)",
                  }}
                >
                  {fact.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ════════════ SHORTCUTS ════════════ */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1,
          background: "var(--border)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          padding: 1,
        }}
      >
        {[
          { keys: ["⌘", "K"], label: "Search a stock" },
          { keys: ["R"],      label: "Refresh numbers" },
          { keys: ["?"],      label: "All shortcuts" },
        ].map((shortcut) => (
          <div
            key={shortcut.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 18px",
              background: "var(--bg-sheet)",
            }}
          >
            <span style={{ display: "inline-flex", gap: 4 }}>
              {shortcut.keys.map((k) => (
                <kbd
                  key={k}
                  style={{
                    padding: "2px 7px",
                    border: "1px solid var(--border)",
                    borderRadius: 3,
                    background: "var(--bg-page)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    minWidth: 24,
                    textAlign: "center",
                  }}
                >
                  {k}
                </kbd>
              ))}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-body)" }}>{shortcut.label}</span>
          </div>
        ))}
      </section>

      <style>{`
        @media ${media.mobile} {
          .eyebrow { letter-spacing: 0.10em; }
        }
      `}</style>
    </div>
  );
}
