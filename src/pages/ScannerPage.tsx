import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, TrendingDown, Activity, Info } from "lucide-react";
import { colors, typography } from "../design/tokens";
import { MarketStatusBadge } from "../components/MarketStatusBadge";
import { useMarketStatus } from "../hooks/useMarketStatus";

/**
 * Ranks the PSE universe (~294 tickers, from /api/market-universe) by
 * actual price/volume signals. This intentionally does NOT show
 * fundamentals-based factor scores (quality/growth/valuation/risk) — the
 * only fundamentals dataset previously wired into this page was synthetic
 * (a hash-seeded generator standing in for real financials, with corrupted
 * names left over from an earlier India/Pakistan-market purge — e.g.
 * "Bank of the PSE Islands" for BPI). Showing confident-looking invented
 * ratios is worse than showing none, so this screen only ranks by what's
 * verifiably real: current price, % change, and volume.
 */

interface UniverseQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  sector: string | null;
}

type SortMode = "gainers" | "losers" | "active" | "all";

const SORT_OPTIONS: { id: SortMode; label: string; icon: typeof TrendingUp }[] = [
  { id: "gainers", label: "Top Gainers", icon: TrendingUp },
  { id: "losers", label: "Top Losers", icon: TrendingDown },
  { id: "active", label: "Most Active", icon: Activity },
  { id: "all", label: "All (A–Z)", icon: Search },
];

const VALID_MODES: SortMode[] = ["gainers", "losers", "active", "all"];

/** Legacy preset ids from the old quick-action chips, mapped to the honest
 * sort modes this page can actually back with real data. */
const LEGACY_PRESET_TO_MODE: Record<string, SortMode> = {
  "quality-compounders": "all",
  "high-growth": "gainers",
  "value-opportunities": "all",
  "dividend-champions": "all",
  "turnaround-stories": "all",
};

function resolveInitialMode(param: string | null): SortMode {
  if (param && VALID_MODES.includes(param as SortMode)) return param as SortMode;
  if (param && LEGACY_PRESET_TO_MODE[param]) return LEGACY_PRESET_TO_MODE[param];
  return "gainers";
}

const glassCard: React.CSSProperties = {
  border: "1px solid var(--glass-border)",
  background: "var(--glass-bg)",
  backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
  borderRadius: 14,
};

function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVolume(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function ScannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFromUrl = searchParams.get("mode") ?? searchParams.get("preset");

  const [quotes, setQuotes] = useState<UniverseQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingRatio, setReportingRatio] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>(() => resolveInitialMode(presetFromUrl));
  const marketStatus = useMarketStatus();

  useEffect(() => {
    fetch("/api/market-universe")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.ok && Array.isArray(payload.quotes)) {
          setQuotes(payload.quotes);
          setReportingRatio(payload.reportingRatio);
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = quotes.filter(
      (s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
    switch (sortMode) {
      case "gainers":
        filtered = [...filtered].sort((a, b) => b.changePercent - a.changePercent);
        break;
      case "losers":
        filtered = [...filtered].sort((a, b) => a.changePercent - b.changePercent);
        break;
      case "active":
        filtered = [...filtered].sort((a, b) => b.volume - a.volume);
        break;
      case "all":
        filtered = [...filtered].sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
    }
    return filtered;
  }, [quotes, query, sortMode]);

  const displayResults = results.slice(0, 60);

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ color: colors.textPrimary, fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 600, letterSpacing: "-0.03em", margin: 0 }}>
            Scanner
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <MarketStatusBadge size="sm" />
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 999, border: "1px solid var(--glass-border)",
                fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)",
              }}
            >
              <motion.span
                animate={error ? {} : { opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: error ? "var(--text-secondary)" : "var(--market-green)" }}
              />
              {error ? "Feed unavailable" : loading ? "Loading live PSE data…" : `${reportingRatio} ${marketStatus.isOpen ? "live" : "reporting"}`}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 1.5, maxWidth: 640 }}>
          Ranked by the latest PSE price and volume — the full common-share universe, not just the index.
        </p>
      </div>

      {/* Honesty note — no invented fundamentals scoring */}
      <div style={{ ...glassCard, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={15} color={colors.textSecondary} style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.55 }}>
          Fundamentals-based scoring (quality, growth, valuation, risk) isn't available yet — this scanner
          ranks by real current-price movement and trading volume only. We're not going to show made-up P/E or
          ROE numbers dressed up as research.
        </span>
      </div>

      {/* Search + sort */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol or company"
            style={{
              width: "100%", height: 42, boxSizing: "border-box",
              border: "1px solid var(--glass-border)", background: "var(--glass-bg)",
              backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))",
              borderRadius: 999, padding: "0 16px 0 40px",
              fontFamily: typography.fontFamily, fontSize: 14, color: colors.textPrimary, outline: "none",
            }}
          />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SORT_OPTIONS.map((opt) => {
            const active = sortMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSortMode(opt.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "9px 14px", borderRadius: 999,
                  border: active ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                  background: active ? "var(--accent-soft)" : "var(--glass-bg)",
                  color: active ? "var(--accent)" : colors.textPrimary,
                  fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
                  transition: "all 180ms ease",
                }}
              >
                <opt.icon size={13} /> {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div style={{ ...glassCard, overflow: "hidden" }}>
        {loading && (
          <div style={{ padding: 40, display: "grid", justifyItems: "center", gap: 10 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ width: 20, height: 20, border: "2px solid var(--glass-border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
            />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>
              Fetching current prices for the full PSE universe — this takes a few seconds.
            </span>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: colors.textSecondary }}>
            Couldn't reach the live PSE feed. Try refreshing in a moment.
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: "grid" }}>
            <div
              style={{
                display: "grid", gridTemplateColumns: "40px 1fr 100px 90px 90px 90px",
                gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--glass-border)",
                fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textSecondary,
              }}
            >
              <span>#</span>
              <span>Company</span>
              <span>Sector</span>
              <span style={{ textAlign: "right" }}>Price</span>
              <span style={{ textAlign: "right" }}>Change</span>
              <span style={{ textAlign: "right" }}>Volume</span>
            </div>
            <AnimatePresence mode="popLayout">
              {displayResults.map((s, i) => {
                const up = s.changePercent >= 0;
                return (
                  <motion.button
                    key={s.symbol}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 20) * 0.015 }}
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                    style={{
                      display: "grid", gridTemplateColumns: "40px 1fr 100px 90px 90px 90px",
                      gap: 8, padding: "12px 16px", alignItems: "center",
                      border: "none", borderBottom: "1px solid var(--glass-border)",
                      background: "transparent", cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "background 140ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "var(--font-mono)" }}>{i + 1}</span>
                    <span style={{ minWidth: 0, overflow: "hidden" }}>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.symbol}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: colors.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.name}
                      </span>
                    </span>
                    <span style={{ fontSize: 11.5, color: colors.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.sector ?? "—"}
                    </span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: colors.textPrimary }}>
                      {formatPeso(s.price)}
                    </span>
                    <span
                      style={{
                        textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700,
                        color: up ? "var(--market-green)" : "var(--market-red)",
                      }}
                    >
                      {up ? "+" : ""}{s.changePercent.toFixed(2)}%
                    </span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: colors.textSecondary }}>
                      {formatVolume(s.volume)}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!loading && !error && (
        <div style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
          Showing <strong style={{ color: colors.textPrimary }}>{displayResults.length}</strong> of{" "}
          <strong style={{ color: colors.textPrimary }}>{results.length}</strong> matching stocks
        </div>
      )}
    </div>
  );
}
