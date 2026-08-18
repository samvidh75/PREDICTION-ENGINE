/* StockEX Philippines — app chrome, ported 1:1 from the StockStory design pages.
 *
 * Drop into src/app/ and use inside PublicLayout / AppShell:
 *
 *   import "../../handoff/stockex-theme.css";
 *   import { SiteHeader, MarketTape, BottomNav, Shell } from "./AppChrome";
 *
 *   <SiteHeader />
 *   <MarketTape indices={indices} marketOpen closesAt="3:30 PM PHT" />
 *   <Shell>{children}</Shell>
 *   <BottomNav active="home" />
 *
 * Geometry, weights and colors match the designs exactly — change tokens in the
 * CSS file, not here.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

/* ---------------------------------------------------------------- viewport */

const useWidth = () => {
  const [w, setW] = useState(() => (typeof window === "undefined" ? 1400 : window.innerWidth));
  useEffect(() => {
    const r = () => setW(window.innerWidth);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  return w;
};

/* ------------------------------------------------------------------- marks */

export function BrandMark() {
  return (
    <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0A0A0A" />
        <path
          d="M21 11.4 C21 8.6 11.6 8.8 11.6 13 C11.6 17.2 21 15.6 21 19.8 C21 24 11.6 23.6 11.6 20.8"
          stroke="#FFFFFF"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span style={{ lineHeight: 1.1 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>
          StockEX
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 500,
              verticalAlign: "super",
              letterSpacing: 0,
              marginLeft: 1,
              color: "var(--sx-ink-5)",
            }}
          >
            ™
          </span>
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--sx-ink-3)" }}>Philippines</span>
      </span>
    </Link>
  );
}

const ArrowUpRight = ({ stroke = "#FFFFFF", size = 11 }: { stroke?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M3 9 L9 3 M9 3 H4.6 M9 3 V7.4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SearchGlyph = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="10.8" cy="10.8" r="6.6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M15.6 15.6 L20.4 20.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------ header */

const TOP_NAV = [
  { label: "Research", to: "/research", caret: true },
  { label: "Scanner", to: "/scanner", caret: false },
  { label: "Compare", to: "/compare", caret: false },
  { label: "Watchlist", to: "/watchlist", caret: false },
  { label: "Portfolio", to: "/portfolio", caret: false },
  { label: "Pricing", to: "/pricing", caret: false },
  { label: "Methodology", to: "/trust", caret: false },
];

export function SiteHeader() {
  const w = useWidth();
  const { pathname } = useLocation();
  const showNav = w >= 1080;
  const showSearchText = w >= 1240;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--sx-bg)",
        borderBottom: "1px solid var(--sx-rule)",
      }}
    >
      <div
        className="sx-shell"
        style={{
          height: "var(--sx-header-h)",
          display: "flex",
          alignItems: "center",
          gap: "clamp(14px,2.4vw,34px)",
        }}
      >
        <BrandMark />

        {showNav && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(12px,1.6vw,26px)",
              marginLeft: "clamp(8px,2vw,28px)",
            }}
          >
            {TOP_NAV.map((t) => {
              const on = pathname.startsWith(t.to);
              return (
                <Link
                  key={t.label}
                  to={t.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 14,
                    fontWeight: on ? 600 : 500,
                    color: on ? "var(--sx-ink)" : "var(--sx-ink-2)",
                    padding: "20px 0",
                    borderBottom: `2px solid ${on ? "var(--sx-ink)" : "transparent"}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                  {t.caret && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2.5 4.5 L6 8 L9.5 4.5" stroke="#6B6B66" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <Link
          to="/search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 34,
            padding: "0 11px",
            borderRadius: "var(--sx-radius-field)",
            border: "1px solid var(--sx-rule-strong)",
            background: "var(--sx-surface)",
            color: "var(--sx-ink-4)",
          }}
        >
          <SearchGlyph />
          {showSearchText && <span style={{ fontSize: 12.5 }}>Search</span>}
          {showSearchText && (
            <span
              className="n"
              style={{
                padding: "2px 6px",
                borderRadius: 5,
                background: "var(--sx-surface-sunken)",
                fontSize: 10,
                color: "var(--sx-ink-3)",
              }}
            >
              ⌘K
            </span>
          )}
        </Link>

        {showNav && (
          <Link to="/signin" style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}>
            Sign in
          </Link>
        )}

        <Link to="/pricing" className="sx-btn-sm">
          Start Free Trial <ArrowUpRight />
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- index tape */

export type IndexQuote = {
  name: string;
  value: string;
  change: string;
  direction: "up" | "down";
  low: string;
  high: string;
  /** position of last price inside the day range, 0–100 */
  posPct: number;
};

export function MarketTape({
  indices,
  marketOpen = true,
  closesAt = "3:30 PM PHT",
}: {
  indices: IndexQuote[];
  marketOpen?: boolean;
  closesAt?: string;
}) {
  const w = useWidth();
  const cols =
    w < 940 ? "repeat(2, minmax(0,1fr))" : w < 1180 ? "repeat(4, minmax(0,1fr))" : "repeat(4, minmax(0,1fr)) auto";
  const showRange = w >= 400;

  return (
    <div className="sx-shell" style={{ paddingTop: "clamp(14px,2vw,22px)" }}>
      <div className="cd" style={{ display: "grid", gridTemplateColumns: cols, overflow: "hidden" }}>
        {indices.map((ix, i) => {
          const color = ix.direction === "up" ? "var(--sx-up)" : "var(--sx-down)";
          return (
            <div
              key={ix.name}
              style={{
                padding: "13px 17px",
                borderRight: "1px solid var(--sx-rule)",
                borderTop: w < 940 && i > 1 ? "1px solid var(--sx-rule)" : 0,
                display: "flex",
                flexDirection: "column",
                gap: 9,
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  className="sx-eyebrow"
                  style={{ marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {ix.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, whiteSpace: "nowrap" }}>
                  <span className="n" style={{ fontSize: 17.5, fontWeight: 600, letterSpacing: "-0.025em" }}>
                    {ix.value}
                  </span>
                  <span className="n" style={{ fontSize: 12.5, fontWeight: 500, color }}>
                    {ix.change}
                  </span>
                </div>
              </div>

              {showRange && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <div style={{ position: "relative", height: 4, borderRadius: 2, background: "var(--sx-rule-chart)" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        width: `${ix.posPct}%`,
                        height: 4,
                        borderRadius: 2,
                        background: color,
                        opacity: 0.26,
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: `${ix.posPct}%`,
                        top: -2,
                        width: 2,
                        height: 8,
                        borderRadius: 1,
                        background: color,
                        transform: "translateX(-1px)",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                    <span className="n" style={{ fontSize: 11, color: "var(--sx-ink-3)", whiteSpace: "nowrap" }}>
                      {ix.low}
                    </span>
                    <span style={{ fontSize: 10, letterSpacing: "0.06em", color: "var(--sx-ink-3)" }}>DAY</span>
                    <span className="n" style={{ fontSize: 11, color: "var(--sx-ink-3)", whiteSpace: "nowrap" }}>
                      {ix.high}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 3,
            gridColumn: w < 1180 ? "1 / -1" : "auto",
            borderTop: w < 1180 ? "1px solid var(--sx-rule)" : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: marketOpen ? "var(--sx-up)" : "var(--sx-ink-3)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              className="sx-dot"
              style={{ background: marketOpen ? "var(--sx-up)" : "var(--sx-ink-5)" }}
            />
            {marketOpen ? "Market is Open" : "Market is Closed"}
          </div>
          <div className="lb" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
            {marketOpen ? `Closes ${closesAt}` : "Opens 9:30 AM PHT"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- bottom nav */

const BOTTOM = [
  { id: "home", label: "Home", to: "/dashboard", icon: "M4.4 19.6 V9.8 L12 4.2 L19.6 9.8 V19.6 Z M9.4 19.6 V13.6 H14.6 V19.6" },
  { id: "scanner", label: "Scanner", to: "/scanner", icon: "M10.8 4.2 A6.6 6.6 0 1 1 10.79 4.2 Z M15.6 15.6 L20.4 20.4" },
  { id: "watchlist", label: "Watchlist", to: "/watchlist", icon: "M12 3.8 L14.5 9.1 L20.3 9.9 L16.1 14 L17.2 19.8 L12 17 L6.8 19.8 L7.9 14 L3.7 9.9 L9.5 9.1 Z" },
  { id: "portfolio", label: "Portfolio", to: "/portfolio", icon: "M3.8 19.6 H20.2 M6.8 19.6 V12.8 M11.2 19.6 V7.8 M15.6 19.6 V10.6 M20 19.6 V5.2" },
  { id: "alerts", label: "Alerts", to: "/alerts", icon: "M7.2 10.2 A4.8 4.8 0 0 1 16.8 10.2 C16.8 15 18.4 17 18.4 17 H5.6 C5.6 17 7.2 15 7.2 10.2 Z M10.2 19.6 A2.2 2.2 0 0 0 13.8 19.6" },
];

export function BottomNav({ active }: { active?: string }) {
  const w = useWidth();
  if (w >= 1080) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: "#FFFFFFF2",
        backdropFilter: "saturate(180%) blur(12px)",
        borderTop: "1px solid var(--sx-rule-strong)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
        {BOTTOM.map((b) => {
          const on = b.id === active;
          const color = on ? "#0A0A0A" : "#9A9A94";
          return (
            <Link
              key={b.id}
              to={b.to}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                minHeight: 56,
                padding: "8px 2px",
                color,
              }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d={b.icon}
                  stroke={color}
                  strokeWidth={on ? 1.9 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: 10, fontWeight: on ? 600 : 500, letterSpacing: "0.01em" }}>{b.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- shell */

export function Shell({ children, pad = true }: { children: ReactNode; pad?: boolean }) {
  const w = useWidth();
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--sx-bg)",
        paddingBottom: w < 1080 ? "calc(66px + env(safe-area-inset-bottom))" : 0,
      }}
    >
      <div className="sx-shell" style={{ paddingTop: pad ? "clamp(24px,3.4vw,44px)" : 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ chart helpers */

/** Polyline path through values, matching the designs' sparkline geometry. */
export function linePath(vals: number[], w: number, h: number, pad = 2) {
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  return vals
    .map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - lo) / span) * (h - pad * 2);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Closed area path for the tinted fill under a line (opacity 0.07 in the design). */
export function areaPath(vals: number[], w: number, h: number, pad = 8) {
  return `${linePath(vals, w, h, pad)} L${w - pad} ${h - pad} L${pad} ${h - pad} Z`;
}
