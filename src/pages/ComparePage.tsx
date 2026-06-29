/**
 * ComparePage — Side-by-side stock comparison
 *
 * Feature set:
 * - Stock search + autocomplete to compare up to 5 stocks
 * - Tabbed metric table: Overview, Fundamentals, Growth, Health
 * - Color-coded best/worst values
 * - Visual bar chart + radar chart (SVG)
 * - AI Recommendation snapshot
 * - Export CSV / Print
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Printer, TrendingUp, TrendingDown, Minus, Search, X, BarChart3, Radar, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { HealthometerMini } from "../ui/HealthometerMini";
import { colors, typography, space, radius, layout, media } from "../design/tokens";
import type { ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────

interface StockMetric {
  label: string;
  valueA: string | number;
  valueB?: string | number;
  unit?: string;
  higherIsBetter?: boolean;
}

interface ComparableStock {
  symbol: string;
  name: string;
  sector: string;
  metrics: Record<string, number | string>;
  score: number;
}

type TabId = "overview" | "fundamentals" | "growth" | "health";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "growth", label: "Growth" },
  { id: "health", label: "Health" },
];

// ─── Mock data helpers ─────────────────────────────────────────────

const SAMPLE_STOCKS: { symbol: string; name: string; sector: string }[] = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd.", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd.", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", sector: "Banking" },
  { symbol: "INFY", name: "Infosys Ltd.", sector: "IT" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", sector: "Banking" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd.", sector: "Telecom" },
  { symbol: "ITC", name: "ITC Ltd.", sector: "FMCG" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd.", sector: "FMCG" },
  { symbol: "LT", name: "Larsen & Toubro Ltd.", sector: "Infrastructure" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd.", sector: "Banking" },
  { symbol: "WIPRO", name: "Wipro Ltd.", sector: "IT" },
];

function generateMockStock(symbol: string): ComparableStock | null {
  const meta = SAMPLE_STOCKS.find((s) => s.symbol === symbol);
  if (!meta) return null;
  const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
  return {
    symbol: meta.symbol,
    name: meta.name,
    sector: meta.sector,
    score: rand(40, 92),
    metrics: {
      pe: rand(12, 45),
      roe: rand(8, 36),
      epsGrowth3y: rand(5, 35),
      debtEquity: rand(0.05, 2.5),
      peg: rand(0.5, 3.5),
      revenueGrowth: rand(3, 30),
      profitMargin: rand(5, 28),
      currentRatio: rand(0.8, 3.0),
      promoterHolding: rand(40, 85),
      dividendYield: rand(0, 5),
      roce: rand(10, 40),
      salesGrowth5y: rand(5, 25),
      profitGrowth5y: rand(3, 30),
      assetTurnover: rand(0.5, 2.5),
    },
  };
}

// ─── Inline bar chart ──────────────────────────────────────────────

function MetricBar({ value, maxVal, higherIsBetter }: { value: number; maxVal: number; higherIsBetter: boolean }) {
  const pct = Math.min(100, (value / maxVal) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: colors.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 3,
          background: higherIsBetter ? (pct > 66 ? colors.success : pct > 33 ? colors.primary : colors.warning) : (pct < 33 ? colors.success : pct < 66 ? colors.primary : colors.warning),
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums", minWidth: 40, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Metric table row ──────────────────────────────────────────────

function MetricRow({ label, values, unit, higherIsBetter }: {
  label: string;
  values: (string | number)[];
  unit?: string;
  higherIsBetter?: boolean;
}) {
  const nums = values.map((v) => (typeof v === "number" ? v : parseFloat(String(v)) || 0));
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  const worst = higherIsBetter ? Math.min(...nums) : Math.max(...nums);

  return (
    <tr>
      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500, color: colors.textPrimary, borderBottom: `1px solid ${colors.border}`, whiteSpace: "nowrap" }}>
        {label}
      </td>
      {values.map((v, i) => {
        const num = nums[i];
        const isBest = num === best;
        const isWorst = num === worst && nums.length > 1 && best !== worst;
        return (
          <td key={i} style={{
            padding: "10px 12px",
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: isBest ? colors.success : isWorst ? colors.danger : colors.textPrimary,
            background: isBest ? "rgba(52,199,89,0.06)" : isWorst ? "rgba(255,59,48,0.06)" : "transparent",
            borderBottom: `1px solid ${colors.border}`,
            textAlign: "right",
          }}>
            {unit === "%" ? `${v}%` : v}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Radar Chart (SVG) ─────────────────────────────────────────────

function RadarComparison({ stocks }: { stocks: ComparableStock[] }) {
  const metrics = ["Score", "ROE", "Growth", "Health", "Value", "Momentum"];
  const NUM_AXES = metrics.length;
  const cx = 120, cy = 120, R = 100;
  const angleStep = (2 * Math.PI) / NUM_AXES;

  const maxValues = [100, 40, 35, 100, 50, 40];

  const points = stocks.slice(0, 3).map((stock) => {
    const vals = [
      stock.score,
      (stock.metrics.roe as number) ?? 20,
      (stock.metrics.epsGrowth3y as number) ?? 15,
      (stock.metrics.currentRatio as number) ?? 1.5 * 30,
      ((stock.metrics.pe as number) !== undefined && 40 - (stock.metrics.pe as number)) || 20,
      (stock.metrics.revenueGrowth as number) ?? 15,
    ];
    return vals.map((v, i) => (Math.min(1, Math.max(0, v / maxValues[i])) * R));
  });

  const radarColors = [colors.primary, colors.success, colors.warning];
  const radarSymbols = ["●", "■", "▲"];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={240} height={240} viewBox="0 0 240 240">
        {/* Background grid */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <polygon
            key={t}
            points={Array.from({ length: NUM_AXES }, (_, i) => {
              const a = -Math.PI / 2 + i * angleStep;
              const x = cx + R * t * Math.cos(a);
              const y = cy + R * t * Math.sin(a);
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke={colors.border}
            strokeWidth={0.5}
          />
        ))}
        {/* Axes */}
        {Array.from({ length: NUM_AXES }, (_, i) => {
          const a = -Math.PI / 2 + i * angleStep;
          return (
            <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} stroke={colors.border} strokeWidth={0.5} />
          );
        })}
        {/* Data polygons */}
        {points.map((pt, si) => (
          <polygon
            key={si}
            points={pt.map((v, i) => {
              const a = -Math.PI / 2 + i * angleStep;
              return `${cx + v * Math.cos(a)},${cy + v * Math.sin(a)}`;
            }).join(" ")}
            fill={radarColors[si]}
            fillOpacity={0.08}
            stroke={radarColors[si]}
            strokeWidth={1.5}
          />
        ))}
        {/* Labels */}
        {metrics.map((m, i) => {
          const a = -Math.PI / 2 + i * angleStep;
          const lx = cx + (R + 18) * Math.cos(a);
          const ly = cy + (R + 18) * Math.sin(a);
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill={colors.textSecondary} fontWeight={500}>
              {m}
            </text>
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {stocks.slice(0, 3).map((s, i) => (
          <span key={s.symbol} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: colors.textPrimary }}>
            <span style={{ color: radarColors[i] }}>{radarSymbols[i]}</span>
            {s.symbol}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────

export default function ComparePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["RELIANCE", "TCS"]);
  const [searchResults, setSearchResults] = useState<typeof SAMPLE_STOCKS>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [chartMode, setChartMode] = useState<"bar" | "radar">("bar");

  // Search
  useEffect(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 1) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearchResults(SAMPLE_STOCKS.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)).slice(0, 6));
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

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

  const stocks = useMemo(() => {
    return selectedSymbols.map((s) => generateMockStock(s)).filter(Boolean) as ComparableStock[];
  }, [selectedSymbols]);

  const metricRows = useMemo((): { id: TabId; rows: { label: string; key: string; higherIsBetter: boolean; unit?: string }[] }[] => [
    {
      id: "overview",
      rows: [
        { label: "Health Score", key: "score", higherIsBetter: true },
        { label: "P/E Ratio", key: "pe", higherIsBetter: false },
        { label: "ROE", key: "roe", higherIsBetter: true, unit: "%" },
        { label: "Profit Margin", key: "profitMargin", higherIsBetter: true, unit: "%" },
        { label: "Dividend Yield", key: "dividendYield", higherIsBetter: true, unit: "%" },
      ],
    },
    {
      id: "fundamentals",
      rows: [
        { label: "P/E Ratio", key: "pe", higherIsBetter: false },
        { label: "PEG Ratio", key: "peg", higherIsBetter: false },
        { label: "ROCE", key: "roce", higherIsBetter: true, unit: "%" },
        { label: "Asset Turnover", key: "assetTurnover", higherIsBetter: true },
        { label: "Promoter Holding", key: "promoterHolding", higherIsBetter: true, unit: "%" },
      ],
    },
    {
      id: "growth",
      rows: [
        { label: "EPS Growth (3Y)", key: "epsGrowth3y", higherIsBetter: true, unit: "%" },
        { label: "Revenue Growth", key: "revenueGrowth", higherIsBetter: true, unit: "%" },
        { label: "Sales Growth (5Y)", key: "salesGrowth5y", higherIsBetter: true, unit: "%" },
        { label: "Profit Growth (5Y)", key: "profitGrowth5y", higherIsBetter: true, unit: "%" },
      ],
    },
    {
      id: "health",
      rows: [
        { label: "Debt / Equity", key: "debtEquity", higherIsBetter: false },
        { label: "Current Ratio", key: "currentRatio", higherIsBetter: true },
        { label: "Profit Margin", key: "profitMargin", higherIsBetter: true, unit: "%" },
        { label: "ROE", key: "roe", higherIsBetter: true, unit: "%" },
      ],
    },
  ], []);

  const currentMetricRows = useMemo(() => metricRows.find((t) => t.id === activeTab)?.rows ?? [], [activeTab, metricRows]);

  const barMetrics = useMemo(() => [
    { label: "Health Score", key: "score", higherIsBetter: true },
    { label: "ROE", key: "roe", higherIsBetter: true },
    { label: "EPS Growth", key: "epsGrowth3y", higherIsBetter: true },
  ], []);

  const exportCSV = useCallback(() => {
    if (stocks.length === 0) return;
    let csv = "Metric," + stocks.map((s) => s.symbol).join(",") + "\n";
    for (const tab of metricRows) {
      for (const row of tab.rows) {
        csv += `${row.label},` + stocks.map((s) => `${s.metrics[row.key] ?? "-"}`).join(",") + "\n";
      }
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [stocks, metricRows]);

  return (
    <div style={{ display: "grid", gap: space[6] }}>
      {/* ════════════ HEADER ════════════ */}
      <section style={{ position: "relative", overflow: "hidden", paddingBottom: space[4] }}>
        {/* Red stripe */}
        <div style={{
          position: "absolute",
          top: -80, left: "50%", transform: "translateX(-50%)",
          width: "clamp(300px, 70%, 600px)", height: 280,
          background: "radial-gradient(ellipse 70% 70% at 50% 40%, rgba(255,69,58,0.18) 0%, rgba(255,159,10,0.06) 50%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: space[3] }}>
          <h1 style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: typography.h1.desktop.weight, lineHeight: typography.h1.desktop.line, margin: 0 }}>
            Compare{" "}
            <span style={{ background: "linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Stocks
            </span>
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, margin: 0 }}>
            Side-by-side fundamental comparison across key metrics. Add up to 5 stocks.
          </p>
        </div>
      </section>

      {/* ════════════ SEARCH + SELECTED ════════════ */}
      <section style={{ display: "grid", gap: space[4] }}>
        <div style={{ position: "relative" }}>
          <input
            aria-label="Add stock to compare"
            placeholder="Search by symbol or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              height: "44px",
              width: "100%",
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              padding: "0 16px 0 38px",
              fontSize: typography.body.desktop.size,
              color: colors.textPrimary,
              background: `${colors.card} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E") 12px center no-repeat`,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {query && searchResults.length === 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, padding: "12px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, zIndex: 10, textAlign: "center", fontSize: 13, color: colors.textSecondary }}>
              No stocks found
            </div>
          )}
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, zIndex: 10, overflow: "hidden" }}>
              {searchResults.map((r) => {
                const added = selectedSymbols.includes(r.symbol);
                return (
                  <button
                    key={r.symbol}
                    onClick={() => !added && addStock(r.symbol)}
                    disabled={added}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      border: "none",
                      borderBottom: `1px solid ${colors.border}`,
                      background: "transparent",
                      cursor: added ? "not-allowed" : "pointer",
                      textAlign: "left",
                      fontSize: 13,
                      color: added ? colors.textTertiary : colors.textPrimary,
                      opacity: added ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.fill; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontWeight: 600 }}>{r.symbol}</span>
                    <span style={{ color: colors.textSecondary }}>{r.name} · {r.sector}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected stock chips */}
        {selectedSymbols.length > 0 && (
          <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
            {selectedSymbols.map((sym) => (
              <div key={sym} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px 4px 12px",
                borderRadius: radius.full,
                background: "rgba(0,122,255,0.1)",
                color: colors.primary,
                fontSize: 12,
                fontWeight: 600,
              }}>
                {sym}
                <button
                  onClick={() => removeStock(sym)}
                  style={{
                    border: "none", background: "none", cursor: "pointer", padding: 2,
                    display: "flex", alignItems: "center",
                    color: colors.primary, opacity: 0.6,
                  }}
                  aria-label={`Remove ${sym}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════════ CHARTS ROW ════════════ */}
      {stocks.length >= 2 && (
        <section style={{ display: "grid", gap: space[4] }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, margin: 0 }}>
              Visual Comparison
            </h2>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setChartMode("bar")} style={{
                padding: "6px 10px", borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                background: chartMode === "bar" ? colors.primary : "transparent",
                color: chartMode === "bar" ? "#fff" : colors.textSecondary,
                cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
              }}>
                <BarChart3 size={14} /> Bars
              </button>
              <button onClick={() => setChartMode("radar")} style={{
                padding: "6px 10px", borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                background: chartMode === "radar" ? colors.primary : "transparent",
                color: chartMode === "radar" ? "#fff" : colors.textSecondary,
                cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
              }}>
                <Radar size={14} /> Radar
              </button>
            </div>
          </div>

          <Card>
            {chartMode === "bar" ? (
              <div style={{ display: "grid", gap: space[4] }}>
                {barMetrics.map((m) => (
                  <div key={m.key} style={{ display: "grid", gap: space[2] }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>{m.label}</span>
                    {stocks.map((s) => (
                      <div key={s.symbol} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, minWidth: 64 }}>{s.symbol}</span>
                        <MetricBar
                          value={typeof s.metrics[m.key] === "number" ? s.metrics[m.key] as number : 0}
                          maxVal={Math.max(...stocks.map((st) => typeof st.metrics[m.key] === "number" ? st.metrics[m.key] as number : 0), 1)}
                          higherIsBetter={m.higherIsBetter}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <RadarComparison stocks={stocks} />
            )}
          </Card>
        </section>
      )}

      {/* ════════════ TABS + METRIC TABLE ════════════ */}
      {stocks.length >= 2 && (
        <section style={{ display: "grid", gap: space[4] }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${colors.border}`, paddingBottom: 0 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderBottom: activeTab === tab.id ? `2px solid ${colors.primary}` : "2px solid transparent",
                  background: "transparent",
                  color: activeTab === tab.id ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Metric table */}
          <Card style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", borderBottom: `1px solid ${colors.separator}` }}>
                    Metric
                  </th>
                  {stocks.map((s) => (
                    <th key={s.symbol} style={{
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                      textAlign: "right",
                      borderBottom: `1px solid ${colors.separator}`,
                    }}>
                      {s.symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentMetricRows.map((row) => (
                  <MetricRow
                    key={row.key}
                    label={row.label}
                    values={stocks.map((s) => s.metrics[row.key] ?? "-")}
                    unit={row.unit}
                    higherIsBetter={row.higherIsBetter}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ════════════ AI RECOMMENDATION ════════════ */}
      {stocks.length >= 2 && (
        <section style={{ display: "grid", gap: space[4] }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: space[2], color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, margin: 0 }}>
            <Sparkles size={16} color={colors.warning} /> AI Comparison Insight
          </h2>
          <Card variant="accent">
            {(() => {
              const sorted = [...stocks].sort((a, b) => b.score - a.score);
              const top = sorted[0];
              return (
                <div style={{ display: "grid", gap: space[3] }}>
                  <p style={{ fontSize: 14, color: colors.textPrimary, margin: 0, lineHeight: 1.6 }}>
                    Based on fundamental metrics, <strong>{top.symbol}</strong> leads with a health score of <strong>{top.score}/100</strong>, driven by strong{" "}
                    {Number(top.metrics.roe) > 20 ? "ROE and profitability" : "growth and reasonable valuation"}.
                    {sorted.length > 1 && sorted[1].score >= top.score - 8
                      ? ` ${sorted[1].symbol} is close behind — consider evaluating both in detail.`
                      : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: space[3] }}>
                    {sorted.map((s, i) => (
                      <div key={s.symbol} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary }}>
                        <span style={{ fontWeight: 600, color: i === 0 ? colors.success : colors.textSecondary }}>
                          {i + 1}.
                        </span>
                        <HealthometerMini score={Math.round(s.score)} size="sm" />
                        <span style={{ fontWeight: 500 }}>{s.symbol}</span>
                        <span style={{ color: colors.textSecondary }}>({Math.round(s.score)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>
        </section>
      )}

      {/* ════════════ EMPTY STATE ════════════ */}
      {stocks.length < 2 && (
        <Card>
          <div style={{ display: "grid", gap: space[4], justifyItems: "center", textAlign: "center", padding: "48px 0" }}>
            <BarChart3 size={48} strokeWidth={1.5} color={colors.textTertiary} />
            <div>
              <h3 style={{ color: colors.textPrimary, margin: 0, fontSize: typography.h3.desktop.size }}>Select at least 2 stocks</h3>
              <p style={{ color: colors.textSecondary, margin: `${space[2]} 0 0`, fontSize: typography.body.desktop.size }}>
                Use the search above to add stocks and compare their fundamentals side by side.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════ EXPORT / SHARE ════════════ */}
      {stocks.length >= 2 && (
        <section style={{ display: "flex", gap: space[3], justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </Button>
        </section>
      )}

      {/* Responsive */}
      <style>{`
        @media ${media.mobile} {
          h1 { font-size: ${typography.h1.mobile.size} !important; }
          .ai-insights-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
