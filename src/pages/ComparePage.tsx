/**
 * ComparePage — Side-by-side stock comparison
 *
 * Rebuilt from scratch: the previous version generated every metric
 * (P/E, P/B, ROE, growth, dividend, risk, a radar chart, and an "AI
 * recommendation" narrative built directly from those numbers) via
 * for a hardcoded list of PSE companies. This version compares only
 * what's actually verifiable — live
 * price, % change, and volume for real PSE stocks — and says so plainly
 * instead of manufacturing fundamentals-based analysis.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Search, X, Info, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { colors, typography } from "../design/tokens";

// ── Shared motion presets (mirrors ScannerPage/StockPage's animation vocabulary) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

interface ComparableQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string | null;
}

const glassCard: React.CSSProperties = {
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  borderRadius: 12,
};

const SUGGESTIONS = [
  { symbol: "SM", name: "SM Investments Corporation" },
  { symbol: "BDO", name: "BDO Unibank, Inc." },
  { symbol: "AC", name: "Ayala Corporation" },
  { symbol: "ALI", name: "Ayala Land, Inc." },
  { symbol: "JFC", name: "Jollibee Foods Corporation" },
  { symbol: "ICT", name: "International Container Terminal Services, Inc." },
  { symbol: "TEL", name: "PLDT Inc." },
  { symbol: "GLO", name: "Globe Telecom, Inc." },
  { symbol: "BPI", name: "Bank of the Philippine Islands" },
  { symbol: "URC", name: "Universal Robina Corporation" },
];

function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ComparePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["BDO", "JFC"]);
  const [searchResults, setSearchResults] = useState<typeof SUGGESTIONS>([]);
  const [quotes, setQuotes] = useState<Record<string, ComparableQuote>>({});
  const [loading, setLoading] = useState(false);

  // Search — reuses the real /api/search endpoint (full PSE universe), falling
  // back to the curated suggestion list while the user is mid-query.
  useEffect(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 1) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
        const payload = await res.json();
        const results = (payload.results ?? []).map((r: { symbol: string; name: string }) => ({ symbol: r.symbol, name: r.name }));
        setSearchResults(results.length ? results : SUGGESTIONS.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)).slice(0, 6));
      } catch {
        setSearchResults(SUGGESTIONS.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)).slice(0, 6));
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch real quotes for every selected symbol whenever the selection changes.
  const [retryKey, setRetryKey] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (selectedSymbols.length === 0) { setQuotes({}); setFetchError(false); return; }
    setLoading(true);
    Promise.all(
      selectedSymbols.map((symbol) =>
        fetch(`/api/market-data/quote/${encodeURIComponent(symbol)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((q) => (q ? { symbol, name: q.name ?? symbol, price: q.price, change: q.change, changePercent: q.changePercent, sector: null } : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, ComparableQuote> = {};
      for (const r of results) if (r) map[r.symbol] = r;
      setQuotes(map);
      setFetchError(Object.keys(map).length === 0 && selectedSymbols.length > 0);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedSymbols, retryKey]);

  const addStock = (symbol: string) => {
    if (!selectedSymbols.includes(symbol) && selectedSymbols.length < 5) {
      setSelectedSymbols([...selectedSymbols, symbol]);
    }
    setQuery("");
    setSearchResults([]);
  };

  const removeStock = (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter((s) => s !== symbol));
  };

  const stocks = useMemo(
    () => selectedSymbols.map((s) => quotes[s]).filter((q): q is ComparableQuote => q !== undefined),
    [selectedSymbols, quotes],
  );

  const exportCsv = () => {
    const header = "Symbol,Name,Price,Change,Change %";
    const rows = stocks.map((s) => `${s.symbol},${s.name},${s.price},${s.change},${s.changePercent}`);
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compare.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ display: "grid", gap: 24, maxWidth: 1000, margin: "0 auto" }}
    >
      <motion.div variants={fadeUp} transition={pageTransition} style={{ display: "grid", gap: 6 }}>
        <span style={{ fontFamily: typography.monoFamily, fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.primary }}>
          Peer scorecard
        </span>
        <h1 style={{ fontFamily: typography.serifFamily, fontStyle: "italic", fontWeight: 500, color: colors.textPrimary, fontSize: 26, margin: "2px 0 2px", letterSpacing: "-0.01em" }}>
          Line them up.
        </h1>
        <p style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 1.5 }}>
          Real, live PSE prices side by side — up to 5 stocks at once.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} transition={pageTransition} style={{ ...glassCard, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={15} color={colors.textSecondary} style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.55 }}>
          Fundamentals-based comparison (P/E, ROE, growth, dividend, risk) isn't available yet — this only
          compares real current price and movement, not invented ratios.
        </span>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} transition={pageTransition} style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={selectedSymbols.length >= 5 ? "Maximum 5 stocks" : "Add a stock: BDO, Jollibee, Ayala…"}
              disabled={selectedSymbols.length >= 5}
              style={{
                width: "100%", height: 42, boxSizing: "border-box",
                border: `1px solid ${colors.hairline}`,background: colors.surface,
                borderRadius: 999, padding: "0 16px 0 40px",
                fontFamily: typography.fontFamily, fontSize: 14, color: colors.textPrimary, outline: "none",
              }}
            />
          </label>
          <motion.button
            whileHover={stocks.length ? { scale: 1.03 } : {}}
            whileTap={stocks.length ? { scale: 0.96 } : {}}
            onClick={exportCsv}
            disabled={stocks.length === 0}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px",
              borderRadius: 999, border: `1px solid ${colors.hairline}`,background: colors.surface,
              color: colors.textPrimary, fontSize: 13, fontWeight: 500, cursor: stocks.length ? "pointer" : "not-allowed",
              opacity: stocks.length ? 1 : 0.5,
            }}
          >
            <Download size={14} /> Export CSV
          </motion.button>
        </div>

        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ ...glassCard, position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, overflow: "hidden" }}
          >
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                onClick={() => addStock(r.symbol)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                  padding: "10px 14px", background: "transparent", border: "none", borderTop: "1px solid var(--glass-border)",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: colors.textPrimary }}>{r.symbol}</span>
                <span style={{ color: colors.textSecondary, fontSize: 12.5 }}>{r.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Selected chips */}
      <motion.div variants={fadeUp} transition={pageTransition} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {selectedSymbols.map((s) => (
          <motion.span
            key={s}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px 6px 12px",
              borderRadius: 999, border: `1px solid ${colors.hairline}`,background: colors.surface,
              fontSize: 12.5, fontWeight: 600, color: colors.textPrimary,
            }}
          >
            {s}
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => removeStock(s)} aria-label={`Remove ${s}`} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textSecondary, display: "flex" }}>
              <X size={12} />
            </motion.button>
          </motion.span>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} transition={pageTransition} style={{ ...glassCard, overflow: "hidden" }}>
        {loading && (
          <div style={{ padding: 32, display: "grid", justifyItems: "center", gap: 10 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ width: 20, height: 20, border: "2px solid var(--glass-border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
            />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Loading live prices…</span>
          </div>
        )}
        {!loading && fetchError && stocks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={pageTransition}
            style={{ padding: 32, textAlign: "center", display: "grid", gap: 10, justifyItems: "center" }}
          >
            <AlertCircle size={20} color={colors.textSecondary} />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Couldn't load live prices. Try again in a moment.</span>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setRetryKey((k) => k + 1)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
                borderRadius: 999, border: `1px solid ${colors.hairline}`,background: colors.surface,
                color: colors.textPrimary, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
              }}
            >
              <RefreshCw size={13} /> Try again
            </motion.button>
          </motion.div>
        )}
        {!loading && !fetchError && stocks.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: colors.textSecondary }}>
            Add at least one stock to compare.
          </div>
        )}
        {!loading && stocks.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textSecondary, borderBottom: "1px solid var(--glass-border)" }}>Company</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textSecondary, borderBottom: "1px solid var(--glass-border)" }}>Price</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textSecondary, borderBottom: "1px solid var(--glass-border)" }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s, i) => {
                const up = s.changePercent >= 0;
                return (
                  <motion.tr
                    key={s.symbol}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.03 }}
                    onClick={() => navigate(`/stock/${s.symbol}`)} style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--glass-border)" }}>
                      <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: colors.textPrimary, fontFamily: "var(--font-mono)" }}>{s.symbol}</span>
                      <span style={{ display: "block", fontSize: 12, color: colors.textSecondary }}>{s.name}</span>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13.5, color: colors.textPrimary, borderBottom: "1px solid var(--glass-border)" }}>
                      {formatPeso(s.price)}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", borderBottom: "1px solid var(--glass-border)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: up ? "var(--market-green)" : "var(--market-red)" }}>
                        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {up ? "+" : ""}{s.changePercent.toFixed(2)}%
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </motion.div>
    </motion.div>
  );
}
