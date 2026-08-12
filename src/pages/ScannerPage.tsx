import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, TrendingDown, Activity, RefreshCw, ArrowUpDown } from "lucide-react";
import { useMarketStatus } from "../hooks/useMarketStatus";

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
type SortField = "changePercent" | "price" | "volume" | "symbol";
type SortDir = "asc" | "desc";

const VALID_MODES: SortMode[] = ["gainers", "losers", "active", "all"];
const LEGACY_MAP: Record<string, SortMode> = {
  "quality-compounders": "all",
  "high-growth": "gainers",
  "value-opportunities": "all",
  "dividend-champions": "all",
  "turnaround-stories": "all",
};

function resolveInitialMode(p: string | null): SortMode {
  if (p && VALID_MODES.includes(p as SortMode)) return p as SortMode;
  if (p && LEGACY_MAP[p]) return LEGACY_MAP[p];
  return "gainers";
}

function fmtPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtVol(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const SECTOR_COLORS: Record<string, string> = {
  "Financials": "#1E5FAD",
  "Industrial": "#1A7A5A",
  "Holding Firms": "#5B3EA6",
  "Property": "#8A3A3A",
  "Services": "#0A7A9A",
  "Mining & Oil": "#8A6020",
};

export default function ScannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<UniverseQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingRatio, setReportingRatio] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>(() =>
    resolveInitialMode(searchParams.get("mode") ?? searchParams.get("preset")),
  );
  const [colSort, setColSort] = useState<{ field: SortField; dir: SortDir } | null>(null);
  const marketStatus = useMarketStatus();

  const load = () => {
    setLoading(true);
    setError(false);
    fetch("/api/market-universe")
      .then((r) => r.json())
      .then((p) => {
        if (p.ok && Array.isArray(p.quotes)) {
          setQuotes(p.quotes);
          setReportingRatio(p.reportingRatio ?? null);
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = quotes.filter(
      (s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
    if (colSort) {
      const { field, dir } = colSort;
      const mul = dir === "desc" ? -1 : 1;
      list = [...list].sort((a, b) => {
        if (field === "symbol") return mul * a.symbol.localeCompare(b.symbol);
        return mul * ((a[field] ?? 0) - (b[field] ?? 0));
      });
    } else {
      switch (sortMode) {
        case "gainers": list = [...list].sort((a, b) => b.changePercent - a.changePercent); break;
        case "losers":  list = [...list].sort((a, b) => a.changePercent - b.changePercent); break;
        case "active":  list = [...list].sort((a, b) => b.volume - a.volume); break;
        case "all":     list = [...list].sort((a, b) => a.symbol.localeCompare(b.symbol)); break;
      }
    }
    return list;
  }, [quotes, query, sortMode, colSort]);

  const displayed = results.slice(0, 100);

  const handleModeClick = (m: SortMode) => {
    setSortMode(m);
    setColSort(null);
  };

  const handleColSort = (field: SortField) => {
    setColSort((prev) => {
      if (prev?.field === field) return { field, dir: prev.dir === "desc" ? "asc" : "desc" };
      return { field, dir: "desc" };
    });
  };

  const gains = quotes.filter((q) => q.changePercent > 0).length;
  const losses = quotes.filter((q) => q.changePercent < 0).length;

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            PSE Market Scanner
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>
            {loading ? "Loading…" : error ? "Feed unavailable" : `${reportingRatio ?? "—"} reporting · ${marketStatus.isOpen ? "Market open" : "Market closed"}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!loading && !error && (
            <div style={{ display: "flex", gap: 12, fontSize: 12, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--market-green)" }}>▲ {gains}</span>
              <span style={{ color: "var(--market-red)" }}>▼ {losses}</span>
              <span style={{ color: "var(--text-muted)" }}>– {quotes.length - gains - losses}</span>
            </div>
          )}
          <button
            onClick={load}
            title="Refresh"
            style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-chip)", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <label style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol or name…"
            style={{
              width: "100%", height: 34, boxSizing: "border-box",
              border: "1px solid var(--border)", background: "var(--bg-sheet)",
              borderRadius: 6, padding: "0 12px 0 30px",
              fontSize: 13, color: "var(--text-primary)", outline: "none",
              fontFamily: "inherit",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </label>

        {/* Mode pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { id: "gainers" as SortMode, label: "Gainers", icon: TrendingUp },
            { id: "losers" as SortMode, label: "Losers", icon: TrendingDown },
            { id: "active" as SortMode, label: "Active", icon: Activity },
            { id: "all" as SortMode, label: "All", icon: Search },
          ]).map(({ id, label, icon: Icon }) => {
            const active = sortMode === id && !colSort;
            return (
              <button
                key={id}
                onClick={() => handleModeClick(id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "0 12px", height: 34, borderRadius: 6,
                  border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: active ? "var(--accent-soft)" : "var(--bg-chip)",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 12.5, fontWeight: active ? 600 : 400, cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Data Table ── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-card)" }}>

        {/* Table Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr 110px 100px 90px 80px 90px",
          padding: "9px 16px",
          background: "var(--bg-sheet)",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          userSelect: "none",
        }}>
          <span>#</span>
          <span>Symbol / Company</span>
          <span>Sector</span>
          <SortHeader label="Price" field="price" colSort={colSort} onSort={handleColSort} align="right" />
          <SortHeader label="Change" field="changePercent" colSort={colSort} onSort={handleColSort} align="right" />
          <SortHeader label="Abs" field="changePercent" colSort={colSort} onSort={handleColSort} align="right" />
          <SortHeader label="Volume" field="volume" colSort={colSort} onSort={handleColSort} align="right" />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              style={{ width: 18, height: 18, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
            />
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Fetching live PSE prices…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>
            Couldn't reach the PSE feed.{" "}
            <button onClick={load} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}>
              Retry
            </button>
          </div>
        )}

        {/* Rows */}
        {!loading && !error && (
          <AnimatePresence mode="popLayout">
            {displayed.map((s, i) => {
              const up = s.changePercent >= 0;
              const neutral = Math.abs(s.changePercent) < 0.01;
              const priceColor = neutral ? "var(--text-secondary)" : up ? "var(--market-green)" : "var(--market-red)";
              const sectorColor = s.sector ? (SECTOR_COLORS[s.sector] ?? "var(--text-muted)") : "var(--text-muted)";

              return (
                <motion.button
                  key={s.symbol}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: Math.min(i, 30) * 0.008 }}
                  onClick={() => navigate(`/stock/${s.symbol}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr 110px 100px 90px 80px 90px",
                    padding: "10px 16px",
                    alignItems: "center",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 100ms ease",
                    minHeight: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {i + 1}
                  </span>

                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", letterSpacing: "0.01em" }}>
                      {s.symbol}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                      {s.name}
                    </span>
                  </span>

                  <span style={{ fontSize: 11, color: sectorColor, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.sector ?? "—"}
                  </span>

                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {fmtPeso(s.price)}
                  </span>

                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: priceColor }}>
                    {neutral ? "–" : `${up ? "+" : ""}${s.changePercent.toFixed(2)}%`}
                  </span>

                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: priceColor }}>
                    {neutral ? "–" : `${up ? "+" : ""}${fmtPeso(Math.abs(s.change))}`}
                  </span>

                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    {fmtVol(s.volume)}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}

        {/* Footer row */}
        {!loading && !error && (
          <div style={{ padding: "10px 16px", fontSize: 11.5, color: "var(--text-muted)", background: "var(--bg-sheet)", borderTop: displayed.length > 0 ? "1px solid var(--border)" : "none" }}>
            {results.length === 0
              ? "No matching stocks"
              : `Showing ${displayed.length} of ${results.length} stocks · Prices via PHISIX`}
          </div>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label, field, colSort, onSort, align,
}: {
  label: string;
  field: SortField;
  colSort: { field: SortField; dir: SortDir } | null;
  onSort: (f: SortField) => void;
  align?: "right" | "left";
}) {
  const active = colSort?.field === field;
  return (
    <button
      onClick={() => onSort(field)}
      style={{
        display: "flex", alignItems: "center", gap: 3,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        background: "none", border: "none", cursor: "pointer", padding: 0,
        fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
        color: active ? "var(--accent)" : "var(--text-muted)",
        transition: "color 150ms ease",
      }}
    >
      {label}
      <ArrowUpDown size={9} style={{ opacity: active ? 1 : 0.4 }} />
    </button>
  );
}
