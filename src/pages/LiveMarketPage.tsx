import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Signal, SignalMedium, SignalLow, Plus, X, TrendingUp, TrendingDown, Activity, Search, Wifi, WifiOff, Clock } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, typography, radius } from "../design/tokens";
import { livePriceStream, type LiveTick, type StreamStatus } from "../services/market/LivePriceStream";
import { MarketStatusBadge } from "../components/MarketStatusBadge";
import { useMarketStatus, type MarketSession } from "../hooks/useMarketStatus";

// ── Shared motion presets (mirrors ScannerPage/StockPage's animation vocabulary) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

interface SearchResult {
  symbol: string;
  name: string;
  sector: string;
}

function formatCurrency(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(status: StreamStatus): string {
  switch (status) {
    case "connected": return colors.marketGreen;
    case "connecting": return colors.warning;
    case "disconnected": return colors.stone;
    case "error": return colors.danger;
  }
}

function statusLabel(status: StreamStatus): string {
  switch (status) {
    case "connected": return "Connected";
    case "connecting": return "Connecting…";
    case "disconnected": return "Disconnected";
    case "error": return "Error";
  }
}

function StatusIcon({ status }: { status: StreamStatus }) {
  switch (status) {
    case "connected": return <Signal size={14} />;
    case "connecting": return <SignalMedium size={14} />;
    case "disconnected": return <SignalLow size={14} />;
    case "error": return <WifiOff size={14} />;
  }
}

/** Plain-language note for the live quotes view when the PSE isn't trading —
 * prices shown are from the last session, not the current moment. */
function closedSessionNote(session: MarketSession): string {
  switch (session) {
    case "holiday":
      return "PSE non-trading holiday today — quotes shown are from the last trading session.";
    case "weekend":
      return "Weekend — the PSE is closed. Quotes shown are from the most recent trading session.";
    case "closing":
      return "The trading session has ended — today's quotes are final.";
    case "lunch":
      return "Lunch break — the PSE reopens at 13:00 PHT. Quotes are from the morning session.";
    case "auction":
      return "Pre-open auction in progress — live quotes resume at 09:30 PHT.";
    default:
      return "Market closed — quotes shown are from the most recent trading session.";
  }
}

export default function LiveMarketPage() {
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const [ticks, setTicks] = useState<Record<string, LiveTick>>({});
  const [status, setStatus] = useState<StreamStatus>("disconnected");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const marketStatus = useMarketStatus();
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleStatus = useCallback((s: StreamStatus) => {
    setStatus(s);
  }, []);

  const handleTick = useCallback((tick: LiveTick) => {
    setTicks((prev) => ({
      ...prev,
      [tick.symbol]: tick,
    }));
  }, []);

  const subscribe = useCallback((symbol: string) => {
    if (subscribed.includes(symbol)) return;
    const newSubscribed = [...subscribed, symbol];
    setSubscribed(newSubscribed);

    if (cleanupRef.current) {
      cleanupRef.current();
    }

    const unsubscribe = livePriceStream.subscribe(newSubscribed, handleTick, handleStatus, 3000);
    cleanupRef.current = unsubscribe;
  }, [subscribed, handleTick, handleStatus]);

  const unsubscribe = useCallback((symbol: string) => {
    const newSubscribed = subscribed.filter((s) => s !== symbol);
    setSubscribed(newSubscribed);
    setTicks((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });

    if (cleanupRef.current) {
      cleanupRef.current();
    }

    if (newSubscribed.length > 0) {
      const unsub = livePriceStream.subscribe(newSubscribed, handleTick, handleStatus, 3000);
      cleanupRef.current = unsub;
    } else {
      cleanupRef.current = null;
    }
  }, [subscribed, handleTick, handleStatus]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      livePriceStream.destroy();
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) { setSearchResults([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.results)) setSearchResults(data.results);
        })
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const selectAndSubscribe = (symbol: string) => {
    subscribe(symbol);
    setQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}
    >
      <motion.section variants={fadeUp} transition={pageTransition} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <Activity size={24} color={colors.primary} /> Live Market
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: "4px 0 0" }}>
            {subscribed.length} symbol{subscribed.length !== 1 ? "s" : ""} active · updates every ~3s from the PSE quote feed
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MarketStatusBadge size="sm" />
          <motion.div
            animate={{ opacity: status === "connecting" ? [1, 0.55, 1] : 1 }}
            transition={{ duration: 1.4, repeat: status === "connecting" ? Infinity : 0 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: radius.full,
              border: `1px solid ${statusColor(status)}40`,
              background: `${statusColor(status)}12`,
              fontSize: 11, fontWeight: 600, color: statusColor(status),
            }}>
            <StatusIcon status={status} />
            {statusLabel(status)}
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
            <Button variant="primary" size="sm" onClick={() => setShowSearch(!showSearch)}>
              <Plus size={14} /> {showSearch ? "Close" : "Add Symbol"}
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {!marketStatus.isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={pageTransition}
          role="note"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            fontSize: 13, color: colors.textSecondary, lineHeight: 1.45,
          }}
        >
          <Clock size={15} style={{ flexShrink: 0, color: colors.textTertiary }} />
          <span>
            <strong style={{ color: colors.textPrimary, fontWeight: 600 }}>{marketStatus.label}.</strong>{" "}
            {closedSessionNote(marketStatus.session)}
          </span>
        </motion.div>
      )}

      {showSearch && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={pageTransition}
          style={{ position: "relative" }}>
          <input
            placeholder="Search PSE symbols…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              height: 40, width: "100%", borderRadius: radius.md,
              border: `1px solid ${colors.border}`, padding: "0 14px 0 38px",
              fontSize: 14, color: colors.textPrimary, background: colors.surface,
              outline: "none", boxSizing: "border-box",
            }}
          />
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.textTertiary, pointerEvents: "none" }} />
          {searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
              background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, zIndex: 10, overflow: "hidden",
            }}>
              {searchResults.map((r) => {
                const isSubscribed = subscribed.includes(r.symbol);
                return (
                  <button key={r.symbol} onClick={() => !isSubscribed && selectAndSubscribe(r.symbol)} disabled={isSubscribed}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", border: "none", borderBottom: `1px solid ${colors.hairline}`,
                      background: "transparent", cursor: isSubscribed ? "not-allowed" : "pointer",
                      textAlign: "left", fontSize: 13, color: isSubscribed ? colors.textTertiary : colors.textPrimary,
                      opacity: isSubscribed ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.fill}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span>
                      <span style={{ fontWeight: 600 }}>{r.symbol}</span>
                      <span style={{ color: colors.textTertiary, marginLeft: 8 }}>{r.name}</span>
                    </span>
                    {isSubscribed && <span style={{ fontSize: 11, color: colors.textTertiary }}>Already added</span>}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {subscribed.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={pageTransition}>
          <Card>
            <div style={{ textAlign: "center", padding: "48px 0", color: colors.textSecondary }}>
              <Wifi size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No symbols subscribed</p>
              <p style={{ fontSize: 12, margin: "8px 0 0", color: colors.textTertiary }}>
                Click "Add Symbol" to start tracking live PSE prices
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {subscribed.length > 0 && (
        <motion.div variants={fadeUp} transition={pageTransition} style={{ display: "grid", gap: 8 }}>
          {subscribed.map((symbol, i) => {
            const tick = ticks[symbol];
            return (
              <motion.div
                key={symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...pageTransition, delay: Math.min(i, 12) * 0.03 }}
                whileHover={{ scale: 1.005 }}
              >
              <Card style={{
                padding: "16px 18px",
                borderLeft: `3px solid ${tick
                  ? (tick.change >= 0 ? colors.marketGreen : colors.marketRed)
                  : colors.stone}`,
                transition: "border-color 0.3s ease",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 100 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, display: "block" }}>{symbol}</span>
                    {tick && (
                      <span style={{ fontSize: 11, color: colors.textTertiary }}>
                        {new Date(tick.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {tick ? (
                    <>
                      <div style={{ textAlign: "right", minWidth: 100 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(tick.price)}
                        </span>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                          color: tick.change >= 0 ? colors.marketGreen : colors.marketRed,
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          {tick.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {tick.change >= 0 ? "+" : ""}{formatCurrency(tick.change)}
                        </span>
                        <span style={{
                          fontSize: 12, fontWeight: 500, display: "block",
                          color: tick.changePercent >= 0 ? colors.marketGreen : colors.marketRed,
                        }}>
                          {tick.changePercent >= 0 ? "+" : ""}{tick.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontSize: 12, color: colors.textTertiary }}>Awaiting first tick…</span>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => unsubscribe(symbol)}
                    style={{
                      border: "none", background: "none", cursor: "pointer", padding: 6,
                      color: colors.stone, marginLeft: "auto",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.danger}
                    onMouseLeave={(e) => e.currentTarget.style.color = colors.stone}
                  >
                    <X size={16} />
                  </motion.button>
                </div>
              </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {subscribed.length > 0 && Object.keys(ticks).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={pageTransition}>
          <Card style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: colors.textTertiary }}>Stream Status: <strong style={{ color: statusColor(status) }}>{statusLabel(status)}</strong></span>
              <span style={{ fontSize: 11, color: colors.textTertiary }}>Subscribers: <strong style={{ color: colors.textPrimary }}>{livePriceStream.getSubscriberCount()}</strong></span>
              <span style={{ fontSize: 11, color: colors.textTertiary }}>Receiving: <strong style={{ color: colors.textPrimary }}>{Object.keys(ticks).length}/{subscribed.length}</strong></span>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
