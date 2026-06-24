import React, { useState, useEffect } from "react";
import { Search, Sparkles, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, Bookmark, GitCompare, X, ChevronRight, Star, Shield, Activity, AlertTriangle, LineChart, RefreshCw, Clock, Check, ChevronDown, SlidersHorizontal, Info } from "lucide-react";
import { productNavigate } from "../components/product/ProductUI";
import { api } from "../services/api/client";

/* ─── Design token references ─── */
const S = {
  bg: "var(--ss-bg)",
  bgSoft: "var(--ss-bg-soft)",
  surface: "var(--ss-surface)",
  surfaceWarm: "var(--ss-surface-warm)",
  ink: "var(--ss-ink)",
  ink2: "var(--ss-ink-2)",
  ink3: "var(--ss-ink-3)",
  ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)",
  borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)",
  positiveSoft: "var(--ss-positive-soft)",
  negative: "var(--ss-negative)",
  negativeSoft: "var(--ss-negative-soft)",
  caution: "var(--ss-caution)",
  cautionSoft: "var(--ss-caution-soft)",
  action: "var(--ss-action)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
  radiusLg: "var(--ss-radius-lg)",
  radiusXl: "var(--ss-radius-xl)",
  shadowCard: "var(--ss-shadow-card)",
  shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
};

/* ─── Helpers ─── */
function changeColor(v: number | null): string {
  if (v === null) return S.ink4;
  return v >= 0 ? S.positive : S.negative;
}

function fPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fChange(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

function scoreColor(v: number | null): string {
  if (v === null) return S.ink4;
  if (v >= 75) return S.positive;
  if (v >= 55) return S.ink;
  if (v >= 35) return S.caution;
  return S.negative;
}

function clsLabel(v: string): string {
  const m: Record<string, string> = { EXCELLENT: "High Conviction", HEALTHY: "Research", STABLE: "Watch", WEAKENING: "Needs Review", AT_RISK: "Risk Rising", INSUFFICIENT_DATA: "Insufficient Data" };
  return m[v] ?? v;
}

/* ─── Client-side mock data ─── */
interface IndexQuote {
  symbol: string; label: string; price: number | null; change: number | null;
}

const INDICES: Array<{ symbol: string; label: string }> = [
  { symbol: "NIFTY50", label: "NIFTY 50" },
  { symbol: "SENSEX", label: "SENSEX" },
  { symbol: "BANKNIFTY", label: "BANK NIFTY" },
  { symbol: "NIFTYIT", label: "NIFTY IT" },
];

function isMarketOpen(): boolean {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const d = ist.getUTCDay();
  if (d === 0 || d === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 555 && mins < 930;
}

/* ─────────────────────────────────────────────
   PremiumTopNav
   ───────────────────────────────────────────── */
export function PremiumTopNav({ activePage = "research" }: { activePage?: string }) {
  const navItems = [
    { key: "research", label: "Research", page: "landing" },
    { key: "scanner", label: "Scanner", page: "scanner" },
    { key: "compare", label: "Compare", page: "compare" },
    { key: "watchlist", label: "Watchlist", page: "watchlist" },
    { key: "pricing", label: "Pricing", page: "pricing" },
    { key: "learn", label: "Learn", page: "about" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      height: 72, background: "rgba(255,255,255,0.96)",
      borderBottom: `1px solid ${S.border}`,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}>
      <div style={{
        maxWidth: S.container, margin: "0 auto",
        padding: "0 52px", height: "100%",
        display: "flex", alignItems: "center", gap: 40,
      }}>
        <button onClick={() => productNavigate("landing")} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "none", cursor: "pointer", padding: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: S.ink, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: 16, fontWeight: 800, lineHeight: 1 }}>S</span>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: S.ink, lineHeight: 1.1, letterSpacing: "-0.3px" }}>StockStory</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: S.ink3, lineHeight: 1, letterSpacing: "0.3px", textTransform: "uppercase" }}>India</div>
          </div>
        </button>

        <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          {navItems.map((item) => (
            <button key={item.key} onClick={() => productNavigate(item.page)}
              style={{
                padding: "8px 16px", fontSize: 13, fontWeight: activePage === item.key ? 600 : 500,
                color: activePage === item.key ? S.ink : S.ink3,
                background: "none", border: "none", cursor: "pointer", borderRadius: S.radiusXs,
                position: "relative", transition: "color 0.15s",
              }}
              onMouseEnter={e => { if (activePage !== item.key) e.currentTarget.style.color = S.ink; }}
              onMouseLeave={e => { if (activePage !== item.key) e.currentTarget.style.color = S.ink3; }}
            >
              {item.label}
              {activePage === item.key && (
                <span style={{
                  position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)",
                  width: "70%", height: 2, background: S.ink, borderRadius: 1,
                }} />
              )}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => productNavigate("search")} style={{
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${S.border}`, borderRadius: S.radiusXs, background: "none", cursor: "pointer",
            color: S.ink3, transition: "color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = S.ink}
            onMouseLeave={e => e.currentTarget.style.color = S.ink3}
          >
            <Search size={16} />
          </button>
          <button onClick={() => productNavigate("login")} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 500, color: S.ink2,
            border: "none", background: "none", cursor: "pointer", borderRadius: S.radiusXs,
          }}
            onMouseEnter={e => e.currentTarget.style.color = S.ink}
            onMouseLeave={e => e.currentTarget.style.color = S.ink2}
          >
            Sign in
          </button>
          <button onClick={() => productNavigate("pricing")} style={{
            padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "white",
            border: "none", background: S.action, cursor: "pointer", borderRadius: S.radiusSm,
            display: "flex", alignItems: "center", gap: 6,
          }}
            onMouseEnter={e => e.currentTarget.style.background = S.action}
            onMouseLeave={e => e.currentTarget.style.background = S.action}
          >
            Start Free Trial <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   MarketTickerStrip
   ───────────────────────────────────────────── */
export function MarketTickerStrip() {
  const [quotes, setQuotes] = useState<IndexQuote[]>(INDICES.map(i => ({ ...i, price: null, change: null })));
  const marketOpen = isMarketOpen();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settled = await Promise.allSettled(INDICES.map(idx => api.getQuote(idx.symbol)));
      if (cancelled) return;
      setQuotes(INDICES.map((idx, i) => {
        const s = settled[i];
        if (s.status === "fulfilled") return { ...idx, price: s.value.price ?? null, change: s.value.changePercent ?? null };
        return { ...idx, price: null, change: null };
      }));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      maxWidth: S.container, margin: "0 auto", padding: "0 52px",
      width: "100%",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 28,
        height: 66, background: S.surface, borderRadius: S.radiusMd,
        border: `1px solid ${S.borderSoft}`,
        padding: "0 24px",
        boxShadow: S.shadowCard,
      }}>
        {quotes.map(q => (
          <div key={q.symbol} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: S.ink3, letterSpacing: "0.2px" }}>{q.label}</span>
            {q.price !== null ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums" }}>
                  {q.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: changeColor(q.change), fontVariantNumeric: "tabular-nums" }}>
                  {q.change !== null ? `${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)}%` : ""}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: S.ink4 }}>—</span>
            )}
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.positive }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3 }}>Market is Open</span>
          <span style={{ fontSize: 11, color: S.ink4 }}>Closes 3:30 PM</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PremiumButton
   ───────────────────────────────────────────── */
export function PremiumButton({ children, variant = "primary", onClick, style: extStyle = {} }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; onClick?: () => void; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: variant === "primary" ? "12px 24px" : variant === "secondary" ? "12px 24px" : "8px 16px",
    fontSize: 14, fontWeight: 600, lineHeight: 1,
    border: variant === "secondary" ? `1px solid ${S.border}` : "none",
    borderRadius: S.radiusSm,
    cursor: "pointer", transition: "all 0.15s",
    background: variant === "primary" ? S.action : variant === "ghost" ? "transparent" : "transparent",
    color: variant === "primary" ? "white" : variant === "ghost" ? S.ink3 : S.ink2,
  };
  return <button style={{ ...base, ...extStyle }} onClick={onClick}>{children}</button>;
}

/* ─────────────────────────────────────────────
   PremiumCard
   ───────────────────────────────────────────── */
export function PremiumCard({ children, style: extStyle = {}, onClick, padding = "24px" }: {
  children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; padding?: string;
}) {
  return (
    <div onClick={onClick} style={{
      background: S.surface, borderRadius: S.radiusMd,
      border: `1px solid ${S.borderSoft}`, padding,
      boxShadow: S.shadowCard,
      cursor: onClick ? "pointer" : undefined,
      transition: "box-shadow 0.2s",
      ...extStyle,
    }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = S.shadowFloating; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.boxShadow = S.shadowCard; }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ScoreRing
   ───────────────────────────────────────────── */
export function ScoreRing({ score, size = 72, showLabel = true }: { score: number | null; size?: number; showLabel?: boolean }) {
  const sw = Math.max(4, size * 0.09);
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const fill = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = scoreColor(score);
  const fs = size * 0.3;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={S.borderSoft} strokeWidth={sw} />
      {fill > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      )}
      {showLabel && (
        <>
          <text x="50%" y="46%" textAnchor="middle" dy="0" fontSize={fs} fontWeight="700" fill={color} fontFamily="Inter, sans-serif">
            {score !== null ? Math.round(score) : "—"}
          </text>
          <text x="50%" y="62%" textAnchor="middle" dy="0" fontSize={fs * 0.42} fontWeight="500" fill={S.ink3} fontFamily="Inter, sans-serif">
            Score
          </text>
        </>
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   FactorBar
   ───────────────────────────────────────────── */
export function FactorBar({ label, score, maxScore = 100 }: { label: string; score: number | null; maxScore?: number }) {
  const pct = score !== null ? Math.max(0, Math.min(maxScore, score)) / maxScore * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 64, fontSize: 11, fontWeight: 500, color: S.ink3, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: S.borderSoft, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: scoreColor(score), transition: "width 0.4s" }} />
      </div>
      <span style={{ width: 28, textAlign: "right", fontSize: 11, fontWeight: 600, color: scoreColor(score), fontVariantNumeric: "tabular-nums" }}>
        {score !== null ? Math.round(score) : "—"}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MetricCard
   ───────────────────────────────────────────── */
export function MetricCard({ label, value, change, icon }: { label: string; value: string | number | null; change?: { value: number; isUp: boolean } | null; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ color: S.ink3 }}>{icon}</span>}
        <span style={{ fontSize: 10, fontWeight: 500, color: S.ink4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color: S.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
        {value ?? <span style={{ color: S.ink4 }}>—</span>}
      </span>
      {change && (
        <span style={{ fontSize: 12, fontWeight: 600, color: change.isUp ? S.positive : S.negative }}>
          {change.isUp ? "+" : ""}{change.value.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MiniSparkline
   ───────────────────────────────────────────── */
export function MiniSparkline({ data, color, width = 60, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  const c = color || (data[data.length - 1] >= data[0] ? S.positive : S.negative);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   PerformanceChart (simple SVG)
   ───────────────────────────────────────────── */
export function PerformanceChart({ data, height = 200 }: { data: number[]; height?: number }) {
  if (data.length < 2) return <div style={{ height, background: S.bgSoft, borderRadius: S.radiusSm }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 600;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 20) - 10}`).join(" ");
  const areaPoints = `0,${height} ${points} ${w},${height}`;
  const isUp = data[data.length - 1] >= data[0];
  const c = isUp ? S.positive : S.negative;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.12} />
          <stop offset="100%" stopColor={c} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   ResearchTabBar
   ───────────────────────────────────────────── */
export function ResearchTabBar({ tabs, activeTab, onChange }: { tabs: string[]; activeTab: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${S.borderSoft}` }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding: "12px 20px", fontSize: 13, fontWeight: activeTab === t ? 600 : 500,
          color: activeTab === t ? S.ink : S.ink3, border: "none", background: "none", cursor: "pointer",
          borderBottom: activeTab === t ? `2px solid ${S.ink}` : "2px solid transparent",
          transition: "color 0.15s",
        }}>{t}</button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CompanyIdentity
   ───────────────────────────────────────────── */
export function CompanyIdentity({ symbol, name, sector, logo }: { symbol: string; name: string; sector?: string; logo?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 48, height: 48, borderRadius: S.radiusSm,
        background: S.bgSoft, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 700, color: S.ink3,
        border: `1px solid ${S.borderSoft}`,
      }}>
        {symbol.charAt(0)}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: S.ink, letterSpacing: "-0.3px" }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: S.ink2 }}>{symbol}</span>
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: S.radiusXs, background: S.bgSoft, color: S.ink3, fontWeight: 500 }}>NSE</span>
          {sector && <span style={{ fontSize: 11, color: S.ink3 }}>{sector}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   InsightCard
   ───────────────────────────────────────────── */
export function InsightCard({ icon, title, body, tone = "neutral" }: { icon?: React.ReactNode; title: string; body: string; tone?: "positive" | "negative" | "caution" | "neutral" }) {
  const dotColor = tone === "positive" ? S.positive : tone === "negative" ? S.negative : tone === "caution" ? S.caution : S.ink3;
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${S.borderSoft}` }}>
      {icon ? icon : <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, marginTop: 4, flexShrink: 0 }} />}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: S.ink3, marginTop: 2, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ScannerFilterRail
   ───────────────────────────────────────────── */
export function ScannerFilterRail({ filters, onChange, onRun, onSave }: {
  filters: Record<string, string>; onChange: (k: string, v: string) => void;
  onRun: () => void; onSave: () => void;
}) {
  const filterOptions: Record<string, string[]> = {
    universe: ["All", "Nifty 50", "Nifty Next 50", "Midcap 100"],
    scoreRange: ["All", "80-100", "60-79", "40-59", "Below 40"],
    sector: ["All", "IT", "Banking", "Auto", "Pharma", "FMCG", "Energy", "Metal", "Consumer"],
    quality: ["All", "Excellent", "Good", "Average", "Weak"],
    growth: ["All", "Strong", "Moderate", "Low"],
    valuation: ["All", "Undervalued", "Fair", "Overvalued"],
    momentum: ["All", "Positive", "Neutral", "Negative"],
    marketCap: ["All", "Large Cap", "Mid Cap", "Small Cap"],
    risk: ["All", "Low", "Medium", "High"],
  };

  return (
    <div style={{
      width: 292, background: S.surface, borderRadius: S.radiusMd,
      border: `1px solid ${S.borderSoft}`, padding: 20,
      boxShadow: S.shadowCard,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: S.ink, margin: 0 }}>AI Stock Scanner</h2>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: S.radiusXs, background: S.bgSoft, color: S.ink3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>AI-powered</span>
        </div>
        <p style={{ fontSize: 11, color: S.ink3, margin: 0, lineHeight: 1.5 }}>
          Find high-quality, high-conviction stocks using AI and factor intelligence.
        </p>
      </div>

      <button style={{
        width: "100%", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: S.ink2,
        border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer",
        textAlign: "left",
      }}>
        Saved Screens
      </button>

      <div style={{ height: 1, background: S.borderSoft }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {Object.entries(filterOptions).map(([key, options]) => (
          <div key={key}>
            <label style={{ fontSize: 10, fontWeight: 600, color: S.ink4, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "block" }}>
              {key.replace(/([A-Z])/g, " $1").trim()}
            </label>
            <select value={filters[key] || "All"} onChange={e => onChange(key, e.target.value)} style={{
              width: "100%", height: 36, padding: "0 12px", fontSize: 12, color: S.ink,
              border: `1px solid ${S.border}`, borderRadius: S.radiusXs, background: S.surface,
              cursor: "pointer", outline: "none",
            }}>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        <button onClick={onRun} style={{
          width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, color: "white",
          border: "none", borderRadius: S.radiusSm, background: S.action, cursor: "pointer",
        }}>Run Scan</button>
        <button onClick={onSave} style={{
          width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, color: S.ink2,
          border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer",
        }}>Save as New Screen</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ScannerResultsTable
   ───────────────────────────────────────────── */
export function ScannerResultsTable({ rows, onRowClick }: {
  rows: Array<{
    rank: number; symbol: string; name: string; sector: string;
    score: number | null; price: string | null; change: string | null; changePositive: boolean | null;
    factors: Array<{ label: string; value: number | null }>;
    conviction: string; confidence: number | null;
  }>;
  onRowClick: (symbol: string) => void;
}) {
  return (
    <div style={{
      background: S.surface, borderRadius: S.radiusMd,
      border: `1px solid ${S.borderSoft}`, overflow: "hidden",
      boxShadow: S.shadowCard,
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${S.borderSoft}` }}>
            {["#", "Company", "Sector", "AI Score", "Price", "1D Change", "Factors", "Signal", "Confidence"].map(h => (
              <th key={h} style={{
                padding: "12px 14px", fontSize: 10, fontWeight: 600, color: S.ink4,
                textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.symbol} onClick={() => onRowClick(row.symbol)} style={{
              cursor: "pointer", transition: "background 0.1s",
              borderBottom: i < rows.length - 1 ? `1px solid ${S.borderSoft}` : "none",
            }}
              onMouseEnter={e => e.currentTarget.style.background = S.bgSoft}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "12px 14px", fontSize: 11, color: S.ink3 }}>{row.rank}</td>
              <td style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: S.radiusXs,
                    background: S.bgSoft, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: S.ink3, border: `1px solid ${S.borderSoft}`,
                  }}>
                    {row.symbol.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: S.ink }}>{row.symbol}</div>
                    <div style={{ fontSize: 10, color: S.ink3 }}>{row.name}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "12px 14px", fontSize: 11, color: S.ink3 }}>{row.sector}</td>
              <td style={{ padding: "12px 14px" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: S.radiusXs,
                  background: row.score !== null && row.score >= 75 ? S.positiveSoft : row.score !== null && row.score >= 55 ? S.bgSoft : "transparent",
                  border: `1px solid ${row.score !== null ? scoreColor(row.score) : S.border}`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: row.score !== null ? scoreColor(row.score) : S.ink3 }}>
                    {row.score !== null ? Math.round(row.score) : "—"}
                  </span>
                </div>
              </td>
              <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: S.ink, fontVariantNumeric: "tabular-nums" }}>
                {row.price ?? "—"}
              </td>
              <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: row.changePositive === true ? S.positive : row.changePositive === false ? S.negative : S.ink3, fontVariantNumeric: "tabular-nums" }}>
                {row.change ?? "—"}
              </td>
              <td style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {row.factors.map(f => {
                    const c = f.value !== null ? scoreColor(f.value) : S.ink4;
                    return (
                      <span key={f.label} style={{
                        fontSize: 9, fontWeight: 600, padding: "2px 5px",
                        borderRadius: 3, background: f.value !== null && f.value >= 70 ? S.positiveSoft : f.value !== null && f.value < 40 ? "transparent" : S.bgSoft,
                        color: c, border: `1px solid ${c}20`,
                      }}>
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: row.score !== null && row.score >= 75 ? S.positive : row.score !== null && row.score >= 55 ? S.ink : S.ink3 }}>
                  {row.conviction}
                </span>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <ScoreRing score={row.confidence} size={32} showLabel={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RightInsightRail
   ───────────────────────────────────────────── */
export function RightInsightRail({ insights, topSectors, onSave }: {
  insights: Array<{ title: string; body: string; tone?: "positive" | "negative" | "caution" | "neutral" }>;
  topSectors: Array<{ name: string; count: number }>;
  onSave?: () => void;
}) {
  return (
    <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 16 }}>
      <PremiumCard>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Sparkles size={14} color={S.ink} />
          <span style={{ fontSize: 14, fontWeight: 700, color: S.ink }}>AI Insights</span>
        </div>
        <p style={{ fontSize: 10, color: S.ink3, margin: "0 0 12px 0" }}>Why these stocks rank high today</p>
        {insights.map((ins, i) => (
          <InsightCard key={i} title={ins.title} body={ins.body} tone={ins.tone} />
        ))}
      </PremiumCard>

      <PremiumCard>
        <span style={{ fontSize: 13, fontWeight: 700, color: S.ink, display: "block", marginBottom: 12 }}>Top Sectors in Scan</span>
        {topSectors.map((s, i) => (
          <div key={s.name} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 0", borderBottom: i < topSectors.length - 1 ? `1px solid ${S.borderSoft}` : "none",
          }}>
            <span style={{ fontSize: 12, color: S.ink }}>{s.name}</span>
            <span style={{ fontSize: 11, color: S.ink3 }}>{s.count}</span>
          </div>
        ))}
      </PremiumCard>

      <PremiumCard>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: S.ink, display: "block", marginBottom: 4 }}>Make it Yours</span>
          <p style={{ fontSize: 11, color: S.ink3, margin: "0 0 12px 0" }}>Save this scan configuration</p>
          {onSave && (
            <button onClick={onSave} style={{
              width: "100%", padding: "10px", fontSize: 12, fontWeight: 600, color: "white",
              border: "none", borderRadius: S.radiusSm, background: S.action, cursor: "pointer",
            }}>Save This Scan</button>
          )}
        </div>
      </PremiumCard>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EmptyProductState
   ───────────────────────────────────────────── */
export function EmptyProductState({ icon, title, body }: { icon?: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 24px", textAlign: "center",
      background: S.surface, borderRadius: S.radiusMd,
      border: `1px solid ${S.borderSoft}`,
    }}>
      {icon || <Info size={24} color={S.ink4} />}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: S.ink, margin: "12px 0 4px 0" }}>{title}</h3>
      <p style={{ fontSize: 12, color: S.ink3, margin: 0, maxWidth: 320 }}>{body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MethodologyNote
   ───────────────────────────────────────────── */
export function MethodologyNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "12px 16px", borderRadius: S.radiusSm,
      background: S.bgSoft, border: `1px solid ${S.borderSoft}`,
      fontSize: 11, color: S.ink3, lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   InvestmentReviewSheet
   ───────────────────────────────────────────── */
export function InvestmentReviewSheet({ open, onClose, symbol, companyName }: { open: boolean; onClose: () => void; symbol: string; companyName?: string }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 480,
        background: S.surface, borderRadius: `${S.radiusLg} ${S.radiusLg} 0 0`,
        padding: "28px 24px", maxHeight: "85vh", overflow: "auto",
        boxShadow: S.shadowFloating,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: S.ink }}>Investment Review</span>
            <span style={{ fontSize: 12, color: S.ink3, marginLeft: 8 }}>{symbol} · {companyName}</span>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: S.ink3, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ borderBottom: `1px solid ${S.borderSoft}`, paddingBottom: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3, textTransform: "uppercase", letterSpacing: "0.5px" }}>Thesis Summary</span>
          <p style={{ fontSize: 12, color: S.ink2, margin: "8px 0 0 0", lineHeight: 1.6 }}>
            Strong business quality with consistent revenue growth and healthy margins. Valuation is reasonable relative to peers.
          </p>
        </div>

        <div style={{ borderBottom: `1px solid ${S.borderSoft}`, paddingBottom: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3, textTransform: "uppercase", letterSpacing: "0.5px" }}>Key Risks to Review</span>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {["Sector cyclicality may impact near-term earnings", "Regulatory changes in the industry", "Competition from new entrants"].map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, color: S.negative, marginTop: 2 }}>●</span>
                <span style={{ fontSize: 12, color: S.ink2 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderBottom: `1px solid ${S.borderSoft}`, paddingBottom: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3, textTransform: "uppercase", letterSpacing: "0.5px" }}>Before You Invest</span>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {["Review the full thesis on the company page", "Compare with peer companies in the sector", "Consider your portfolio allocation and risk appetite",
              "Final order placement happens with your broker"].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Check size={12} color={S.positive} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: S.ink2 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderRadius: S.radiusSm, background: S.bgSoft, marginBottom: 20, fontSize: 11, color: S.ink3, lineHeight: 1.6 }}>
          Broker handoff is being prepared. Final order placement happens with your broker. StockStory does not handle your money or execute trades.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => productNavigate("track")} style={{
            flex: 1, padding: "12px", fontSize: 13, fontWeight: 600, color: S.ink2,
            border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer",
          }}>Track instead</button>
          <button onClick={() => productNavigate("compare", symbol)} style={{
            flex: 1, padding: "12px", fontSize: 13, fontWeight: 600, color: S.ink2,
            border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer",
          }}>Compare first</button>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", fontSize: 13, fontWeight: 600, color: "white",
            border: "none", borderRadius: S.radiusSm, background: S.action, cursor: "pointer",
          }}>Back to research</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BrokerHandoffSheet
   ───────────────────────────────────────────── */
export function BrokerHandoffSheet({ open, onClose, symbol }: { open: boolean; onClose: () => void; symbol?: string }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "relative", width: "90%", maxWidth: 400,
        background: S.surface, borderRadius: S.radiusMd,
        padding: "32px 24px", textAlign: "center",
        boxShadow: S.shadowFloating,
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: S.ink, margin: "0 0 8px 0" }}>Continue with your broker</h3>
        <p style={{ fontSize: 12, color: S.ink3, margin: "0 0 24px 0", lineHeight: 1.6 }}>
          Broker handoff is being prepared. StockStory is a research platform — we help you decide, not execute.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={{
            width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, color: "white",
            border: "none", borderRadius: S.radiusSm, background: S.action, cursor: "pointer",
          }}>Track instead</button>
          <button onClick={() => { if (symbol) productNavigate("compare", symbol); }} style={{
            width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, color: S.ink2,
            border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer",
          }}>Compare first</button>
          <button onClick={onClose} style={{
            width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, color: S.ink3,
            border: "none", background: "none", cursor: "pointer",
          }}>Back to research</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PremiumAppShell
   ───────────────────────────────────────────── */
export function PremiumAppShell({ children, activePage }: { children: React.ReactNode; activePage?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: S.bg }}>
      <PremiumTopNav activePage={activePage} />
      <div style={{ paddingTop: 16, paddingBottom: 40 }}>
        <MarketTickerStrip />
        <div style={{ maxWidth: S.container, margin: "0 auto", padding: "0 52px", paddingTop: 28 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
