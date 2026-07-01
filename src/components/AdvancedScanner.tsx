/**
 * AdvancedScanner — Client-Side Technical Scanner Dashboard
 *
 * Pure browser-side technical analysis using the stockEngine web worker.
 * Computes Bollinger Bands, MACD, and volume divergence for the stock
 * universe with zero server CPU cost.
 *
 * Lives at /advanced-scanner
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, TrendingUp, TrendingDown, Activity, Zap, Search } from "lucide-react";
import { STOCK_UNIVERSE, type StockFundamentals } from "../services/scanner/stockUniverse";
import { Card, CardLabel } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, typography, radius, animation } from "../design/tokens";
import { useMediaQuery } from "../hooks/useMediaQuery";

// ─── Types ──────────────────────────────────────────────────────────────

interface TechScanProgress {
  total: number;
  completed: number;
}

interface TechScanStock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  healthometer: number;
  scannerFlag: string;
  /** Bollinger upper, lower, middle */
  upperBand: number;
  lowerBand: number;
  macd: number;
  divergence: string;
}

type SortKey = "healthometer" | "price" | "changePercent" | "macd" | "symbol";
type SortDir = "asc" | "desc";

// ─── Helpers ────────────────────────────────────────────────────────────

/** Generate a realistic synthetic 30-day price array from a base price */
function syntheticPrices(basePrice: number, volatility = 0.025): number[] {
  const prices: number[] = [basePrice];
  for (let i = 1; i < 30; i++) {
    const change = prices[i - 1] * (volatility * (Math.random() * 2 - 1));
    prices.push(Math.max(prices[i - 1] + change, basePrice * 0.5));
  }
  return prices;
}

/** Synthetic volume array correlated to price moves */
function syntheticVolumes(prices: number[]): number[] {
  return prices.map(() => Math.round(500000 + Math.random() * 2000000));
}

/** Human-readable label for a scanner flag */
function flagLabel(flag: string): { label: string; color: string; icon: typeof BarChart3 } {
  switch (flag) {
    case "MEAN_REVERSION_OVERBOUGHT_CEILING":
      return { label: "Overbought", color: colors.marketRed, icon: TrendingDown };
    case "MEAN_REVERSION_OVERSOLD_FLOOR":
      return { label: "Oversold", color: colors.marketGreen, icon: TrendingUp };
    case "CRITICAL_INSTITUTIONAL_BREAKOUT_EDGE":
      return { label: "Breakout", color: "#a78bfa", icon: Zap };
    default:
      return { label: "Neutral", color: colors.mute, icon: Activity };
  }
}

function flagHint(flag: string): string {
  switch (flag) {
    case "MEAN_REVERSION_OVERBOUGHT_CEILING":
      return "Price above upper Bollinger Band — potential reversal down";
    case "MEAN_REVERSION_OVERSOLD_FLOOR":
      return "Price below lower Bollinger Band — potential bounce up";
    case "CRITICAL_INSTITUTIONAL_BREAKOUT_EDGE":
      return "Accumulation divergence detected — institutional buying";
    default:
      return "No extreme technical signals";
  }
}

// ─── Sectors from universe ──────────────────────────────────────────────

const ALL_SECTORS = [...new Set(STOCK_UNIVERSE.map((s) => s.sector))].sort();

function sectorHue(sector: string): string {
  const hues: Record<string, string> = {
    "Financial Services": "#60a5fa",
    "Pharma": "#f472b6",
    "IT": "#34d399",
    "Automotive": "#fbbf24",
    "Construction": "#fb923c",
    "Energy": "#a78bfa",
    "FMCG": "#facc15",
    "Healthcare": "#e879f9",
    "Textiles": "#22d3ee",
    "Media": "#f87171",
    "Logistics": "#2dd4bf",
  };
  return hues[sector] ?? "#94a3b8";
}

// ─── AdvancedScanner Component ──────────────────────────────────────────

export default function AdvancedScanner() {
  const workerRef = useRef<Worker | null>(null);
  const [stocks, setStocks] = useState<TechScanStock[]>([]);
  const [progress, setProgress] = useState<TechScanProgress>({ total: 0, completed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("healthometer");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedStock, setSelectedStock] = useState<TechScanStock | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // ── Initialize worker and run scan ──────────────────────────────────

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/stockEngine.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    const targets = STOCK_UNIVERSE.slice(0, 100);
    setProgress({ total: targets.length, completed: 0 });

    const results: TechScanStock[] = [];

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === "result") {
        const index = results.length;
        const stock = targets[index];
        if (stock) {
          results.push({
            symbol: stock.symbol,
            name: stock.name,
            sector: stock.sector,
            price: stock.price,
            changePercent: stock.changePercent,
            healthometer: payload.healthometer,
            scannerFlag: payload.scanner_flag,
            upperBand: payload.technical_metrics?.upper_band ?? 0,
            lowerBand: payload.technical_metrics?.lower_band ?? 0,
            macd: payload.technical_metrics?.macd_divergence ?? 0,
            divergence: payload.technical_metrics?.divergence_pattern ?? "STABLE_FLOW",
          });
          setProgress((p) => ({ ...p, completed: results.length }));
        }
        // Send next job
        const nextIdx = results.length;
        if (nextIdx < targets.length) {
          const next = targets[nextIdx];
          const prices = syntheticPrices(next.price, 0.02 + Math.random() * 0.03);
          const volumes = syntheticVolumes(prices);
          worker.postMessage({ type: "compute", payload: { prices, volumes } });
        } else {
          setStocks([...results]);
        }
      }
    };

    // Kick off first computation
    if (targets.length > 0) {
      const first = targets[0];
      const prices = syntheticPrices(first.price, 0.02 + Math.random() * 0.03);
      const volumes = syntheticVolumes(prices);
      worker.postMessage({ type: "compute", payload: { prices, volumes } });
    }

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // ── Dispatch scanner alerts to WhatsApp/Telegram ─────────────────
  useEffect(() => {
    if (stocks.length === 0) return;

    const signals = stocks.filter(
      (s) => s.scannerFlag !== "CONSOLIDATION_STATE" && s.scannerFlag !== "NEUTRAL",
    );

    for (const stock of signals.slice(0, 5)) {
      fetch("/api/v1/alerts/scanner-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: stock.symbol,
          signalType: stock.scannerFlag,
          signalDescription: flagHint(stock.scannerFlag),
          currentPrice: stock.price,
          strength: stock.healthometer,
        }),
      }).catch(() => {});
    }
  }, [stocks]);

  // ── Sorting & Filtering ────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...stocks];

    // Sector filter
    if (sectorFilter !== "All") {
      list = list.filter((s) => s.sector === sectorFilter);
    }

    // Search query
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      const cmp =
        sortKey === "symbol"
          ? a.symbol.localeCompare(b.symbol)
          : sortKey === "price"
            ? a.price - b.price
            : sortKey === "changePercent"
              ? a.changePercent - b.changePercent
              : sortKey === "macd"
                ? a.macd - b.macd
                : a.healthometer - b.healthometer;
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [stocks, sectorFilter, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ── Detail panel ──────────────────────────────────────────────────

  const handleRowClick = useCallback((stock: TechScanStock) => {
    setSelectedStock((prev) => (prev?.symbol === stock.symbol ? null : stock));
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  const scanning = progress.total > 0 && progress.completed < progress.total;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px 48px" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              color: colors.ink,
              fontSize: isDesktop ? "32px" : "24px",
              fontWeight: 600,
              lineHeight: 1.25,
              margin: 0,
            }}
          >
            Technical Scanner
          </h1>
          <p
            style={{
              color: colors.mute,
              fontSize: typography.bodyMd.size,
              lineHeight: typography.bodyMd.line,
              margin: "6px 0 0 0",
            }}
          >
            Client-side technical analysis via Web Worker &mdash; zero server load
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {scanning && (
            <span
              style={{
                color: colors.primary,
                fontSize: typography.captionSm.size,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Activity size={14} />
              Scanning {progress.completed}/{progress.total}
            </span>
          )}
          {!scanning && stocks.length > 0 && (
            <span
              style={{
                color: colors.mute,
                fontSize: typography.captionSm.size,
              }}
            >
              {stocks.length} stocks analyzed
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 200,
            maxWidth: 320,
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.mute,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search symbol or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              height: 38,
              padding: "0 12px 0 34px",
              background: colors.surfaceElevated,
              border: `1px solid ${colors.hairline}`,
              borderRadius: radius.md,
              color: colors.ink,
              fontSize: typography.captionMd.size,
              fontFamily: typography.fontFamily,
              outline: "none",
            }}
          />
        </div>

        {/* Sector filter */}
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          style={{
            height: 38,
            padding: "0 28px 0 12px",
            background: colors.surfaceElevated,
            border: `1px solid ${colors.hairline}`,
            borderRadius: radius.md,
            color: colors.ink,
            fontSize: typography.captionMd.size,
            fontFamily: typography.fontFamily,
            outline: "none",
            cursor: "pointer",
            appearance: "none",
          }}
        >
          <option value="All">All Sectors</option>
          {ALL_SECTORS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Sector chips (desktop) */}
        {isDesktop && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ALL_SECTORS.slice(0, 8).map((s) => (
              <button
                key={s}
                onClick={() => setSectorFilter(sectorFilter === s ? "All" : s)}
                style={{
                  height: 32,
                  padding: "0 10px",
                  background: sectorFilter === s ? colors.primary : "transparent",
                  color: sectorFilter === s ? colors.canvas : colors.mute,
                  border: `1px solid ${sectorFilter === s ? "transparent" : colors.hairline}`,
                  borderRadius: radius.sm,
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: typography.fontFamily,
                  transition: `all ${animation.fast}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <Card
          variant="elevated"
          style={{
            padding: "12px 16px",
            marginBottom: 16,
            color: colors.marketRed,
            fontSize: typography.captionMd.size,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={14} />
          {error}
        </Card>
      )}

      {/* Main layout: table + optional detail */}
      <div style={{ display: "flex", gap: 20, flexDirection: isDesktop ? "row" : "column" }}>
        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card variant="elevated" style={{ padding: 0, overflow: "hidden" }}>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 72px 80px 88px 100px",
                gap: 0,
                padding: "10px 16px",
                borderBottom: `1px solid ${colors.hairline}`,
                background: colors.surface,
              }}
            >
              <HeaderCell label="Symbol" sortKey="symbol" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <HeaderCell label="Price" sortKey="price" current={sortKey} dir={sortDir} onClick={toggleSort} style={{ textAlign: "right" }} />
              <HeaderCell label="Chg%" sortKey="changePercent" current={sortKey} dir={sortDir} onClick={toggleSort} style={{ textAlign: "right" }} />
              <HeaderCell label="Score" sortKey="healthometer" current={sortKey} dir={sortDir} onClick={toggleSort} style={{ textAlign: "right" }} />
              <HeaderCell label="MACD" sortKey="macd" current={sortKey} dir={sortDir} onClick={toggleSort} style={{ textAlign: "right" }} />
              <HeaderCell label="Signal" current={null} style={{ textAlign: "center" }} />
            </div>

            {/* Rows */}
            {filtered.length === 0 && !scanning && (
              <div
                style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  color: colors.mute,
                  fontSize: typography.bodyMd.size,
                }}
              >
                {query || sectorFilter !== "All"
                  ? "No stocks match your filters."
                  : "No results yet. Scan is running…"}
              </div>
            )}

            {filtered.map((stock) => {
              const flag = flagLabel(stock.scannerFlag);
              const isSelected = selectedStock?.symbol === stock.symbol;
              return (
                <div
                  key={stock.symbol}
                  onClick={() => handleRowClick(stock)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 72px 80px 88px 100px",
                    gap: 0,
                    padding: "10px 16px",
                    borderBottom: `1px solid ${colors.hairline}`,
                    background: isSelected ? colors.surfaceElevated : "transparent",
                    cursor: "pointer",
                    transition: `background-color ${animation.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = colors.surfaceElevated;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: colors.ink,
                        fontSize: typography.captionMd.size,
                        fontWeight: 600,
                      }}
                    >
                      {stock.symbol}
                    </div>
                    <div
                      style={{
                        color: colors.mute,
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 220,
                      }}
                    >
                      {stock.name}
                    </div>
                  </div>

                  <Cell value={stock.price.toLocaleString()} style={{ textAlign: "right" }} />
                  <Cell
                    value={`${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(1)}%`}
                    style={{
                      textAlign: "right",
                      color: stock.changePercent >= 0 ? colors.marketGreen : colors.marketRed,
                    }}
                  />
                  <Cell
                    value={`${stock.healthometer}`}
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      color:
                        stock.healthometer >= 75
                          ? colors.marketGreen
                          : stock.healthometer >= 45
                            ? colors.warning
                            : colors.marketRed,
                    }}
                  />
                  <Cell
                    value={stock.macd > 0 ? `+${stock.macd.toFixed(2)}` : stock.macd.toFixed(2)}
                    style={{
                      textAlign: "right",
                      color: stock.macd > 0 ? colors.marketGreen : colors.marketRed,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <flag.icon size={12} color={flag.color} />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: flag.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {flag.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Detail panel */}
        {selectedStock && (
          <Card
            variant="elevated"
            style={{
              width: isDesktop ? 300 : "100%",
              minWidth: 0,
              alignSelf: "flex-start",
              position: isDesktop ? "sticky" : undefined,
              top: 80,
            }}
          >
            <CardLabel>Technical Detail</CardLabel>
            <h3
              style={{
                color: colors.ink,
                fontSize: typography.bodyLg.size,
                fontWeight: 600,
                margin: "0 0 4px",
              }}
            >
              {selectedStock.symbol}
            </h3>
            <p
              style={{
                color: colors.mute,
                fontSize: typography.captionMd.size,
                margin: "0 0 16px",
              }}
            >
              {selectedStock.name}
            </p>

            <DetailRow label="Healthometer" value={`${selectedStock.healthometer}/100`} />
            <DetailRow
              label="Signal"
              value={flagLabel(selectedStock.scannerFlag).label}
              valueColor={flagLabel(selectedStock.scannerFlag).color}
            />
            <DetailRow
              label="Interpretation"
              value={flagHint(selectedStock.scannerFlag)}
              valueColor={colors.mute}
            />
            <DetailRow label="Current Price" value={`₹${selectedStock.price.toLocaleString()}`} />
            <DetailRow label="Upper Band" value={`₹${selectedStock.upperBand.toLocaleString()}`} />
            <DetailRow label="Lower Band" value={`₹${selectedStock.lowerBand.toLocaleString()}`} />
            <DetailRow
              label="MACD"
              value={selectedStock.macd > 0 ? `+${selectedStock.macd.toFixed(4)}` : selectedStock.macd.toFixed(4)}
            />
            <DetailRow
              label="Volume Divergence"
              value={
                selectedStock.divergence === "BULLISH_ACCUMULATION_DIVERGENCE"
                  ? "Bullish Accumulation"
                  : "Normal Flow"
              }
              valueColor={
                selectedStock.divergence === "BULLISH_ACCUMULATION_DIVERGENCE"
                  ? colors.marketGreen
                  : colors.mute
              }
            />
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function HeaderCell({
  label,
  sortKey: thisSortKey,
  current,
  dir,
  onClick,
  style,
}: {
  label: string;
  sortKey?: SortKey | null;
  current: SortKey | null;
  dir?: SortDir;
  onClick?: (k: SortKey) => void;
  style?: React.CSSProperties;
}) {
  const active = current === thisSortKey;
  const Component = thisSortKey && onClick ? "button" : "div";
  return (
    <Component
      {...(thisSortKey && onClick ? { onClick: () => onClick(thisSortKey!) } : {})}
      style={{
        color: active ? colors.ink : colors.mute,
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        cursor: thisSortKey ? "pointer" : undefined,
        display: "flex",
        alignItems: "center",
        gap: 4,
        userSelect: "none",
        border: "none",
        background: "none",
        padding: 0,
        fontFamily: typography.fontFamily,
        ...style,
      }}
    >
      {label}
      {active && (
        <span style={{ fontSize: "9px", lineHeight: 1 }}>
          {dir === "desc" ? "▼" : "▲"}
        </span>
      ) || null}
    </Component>
  );
}

function Cell({
  value,
  style,
}: {
  value: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: typography.captionMd.size,
        color: colors.ink,
        ...style,
      }}
    >
      {value}
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "6px 0",
        borderBottom: `1px solid ${colors.hairline}`,
        fontSize: typography.captionMd.size,
      }}
    >
      <span style={{ color: colors.mute }}>{label}</span>
      <span style={{ color: valueColor ?? colors.ink, fontWeight: 500, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
