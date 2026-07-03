import { useState, useEffect, useCallback, useRef } from "react";
import { Signal, SignalHigh, SignalMedium, SignalLow, Plus, X, TrendingUp, TrendingDown, BarChart3, Activity, Volume2, Search, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { Card, CardLabel } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, typography, radius } from "../design/tokens";
import { livePriceStream, type LiveTick, type StreamStatus } from "../services/market/LivePriceStream";

const SAMPLE_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "WIPRO", "AXISBANK", "LT", "HINDUNILVR"];

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(n: number): string {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  return n.toLocaleString("en-IN");
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

export default function LiveMarketPage() {
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const [ticks, setTicks] = useState<Record<string, LiveTick>>({});
  const [status, setStatus] = useState<StreamStatus>("disconnected");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof SAMPLE_SYMBOLS>([]);
  const [showSearch, setShowSearch] = useState(false);
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
    if (query.trim().length < 1) { setSearchResults([]); return; }
    const q = query.trim().toUpperCase();
    const timer = setTimeout(() => {
      setSearchResults(SAMPLE_SYMBOLS.filter((s) => s.includes(q)).slice(0, 8));
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const selectAndSubscribe = (symbol: string) => {
    subscribe(symbol);
    setQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <Activity size={24} color={colors.primary} /> Live Market
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: "4px 0 0" }}>
            {subscribed.length} symbol{subscribed.length !== 1 ? "s" : ""} active
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: radius.full,
            border: `1px solid ${statusColor(status)}40`,
            background: `${statusColor(status)}12`,
            fontSize: 11, fontWeight: 600, color: statusColor(status),
          }}>
            <StatusIcon status={status} />
            {statusLabel(status)}
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowSearch(!showSearch)}>
            <Plus size={14} /> {showSearch ? "Close" : "Add Symbol"}
          </Button>
        </div>
      </section>

      {showSearch && (
        <div style={{ position: "relative" }}>
          <input
            placeholder="Search symbols…"
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
              {searchResults.map((s) => {
                const isSubscribed = subscribed.includes(s);
                return (
                  <button key={s} onClick={() => !isSubscribed && selectAndSubscribe(s)} disabled={isSubscribed}
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
                    <span style={{ fontWeight: 600 }}>{s}</span>
                    {isSubscribed && <span style={{ fontSize: 11, color: colors.textTertiary }}>Already added</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subscribed.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "48px 0", color: colors.textSecondary }}>
            <Wifi size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No symbols subscribed</p>
            <p style={{ fontSize: 12, margin: "8px 0 0", color: colors.textTertiary }}>
              Click "Add Symbol" to start tracking live prices
            </p>
          </div>
        </Card>
      )}

      {subscribed.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {subscribed.map((symbol) => {
            const tick = ticks[symbol];
            return (
              <Card key={symbol} style={{
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
                        Source: {tick.source.replace(/_/g, " ")} · {new Date(tick.timestamp).toLocaleTimeString()}
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
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <span style={{ fontSize: 11, color: colors.textTertiary, display: "block" }}>Volume</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                          {formatVolume(tick.volume)}
                        </span>
                      </div>
                      {tick.high != null && (
                        <div style={{ textAlign: "right", minWidth: 70 }}>
                          <span style={{ fontSize: 11, color: colors.textTertiary, display: "block" }}>H/L</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: colors.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                            {formatCurrency(tick.high)} / {formatCurrency(tick.low ?? 0)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontSize: 12, color: colors.textTertiary }}>Awaiting first tick…</span>
                    </div>
                  )}

                  <button onClick={() => unsubscribe(symbol)}
                    style={{
                      border: "none", background: "none", cursor: "pointer", padding: 6,
                      color: colors.stone, marginLeft: "auto",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.danger}
                    onMouseLeave={(e) => e.currentTarget.style.color = colors.stone}
                  >
                    <X size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {subscribed.length > 0 && Object.keys(ticks).length > 0 && (
        <Card style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: colors.textTertiary }}>Stream Status: <strong style={{ color: statusColor(status) }}>{statusLabel(status)}</strong></span>
            <span style={{ fontSize: 11, color: colors.textTertiary }}>Subscribers: <strong style={{ color: colors.textPrimary }}>{livePriceStream.getSubscriberCount()}</strong></span>
            <span style={{ fontSize: 11, color: colors.textTertiary }}>Receiving: <strong style={{ color: colors.textPrimary }}>{Object.keys(ticks).length}/{subscribed.length}</strong></span>
          </div>
        </Card>
      )}
    </div>
  );
}
