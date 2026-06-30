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
import React from "react";
import { useNavigate } from "react-router-dom";
import { Download, Printer, TrendingUp, TrendingDown, Minus, Search, X, BarChart3, Radar, Sparkles, AlertTriangle, Award } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { HealthometerMini } from "../ui/HealthometerMini";
import { PriceFlash } from "../ui/PriceFlash";
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

type TabId = "valuation" | "quality" | "growth" | "dividend" | "risk";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "valuation", label: "Valuation", icon: <BarChart3 size={14} /> },
  { id: "quality", label: "Quality", icon: <Award size={14} /> },
  { id: "growth", label: "Growth", icon: <TrendingUp size={14} /> },
  { id: "dividend", label: "Dividend", icon: <TrendingUp size={14} /> },
  { id: "risk", label: "Risk", icon: <AlertTriangle size={14} /> },
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
      // Valuation
      pe: rand(12, 45),
      pb: rand(1, 8),
      evToEbitda: rand(8, 30),
      peg: rand(0.5, 3.5),
      earningsYield: rand(2, 12),
      fcfYield: rand(1, 10),
      // Quality
      roe: rand(8, 36),
      roce: rand(10, 40),
      profitMargin: rand(5, 28),
      netMargin: rand(3, 22),
      promoterHolding: rand(40, 85),
      interestCoverage: rand(2, 15),
      // Growth
      epsGrowth3y: rand(5, 35),
      revenueGrowth: rand(3, 30),
      salesGrowth5y: rand(5, 25),
      profitGrowth5y: rand(3, 30),
      bookValueGrowth: rand(2, 25),
      // Dividend
      dividendYield: rand(0, 5),
      dividendPayoutRatio: rand(10, 60),
      dividendGrowth5y: rand(0, 20),
      // Risk
      debtEquity: rand(0.05, 2.5),
      currentRatio: rand(0.8, 3.0),
      assetTurnover: rand(0.5, 2.5),
      beta: rand(0.5, 2.2),
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
            background: isBest ? colors.marketGreenSoft : isWorst ? colors.marketRedSoft : "transparent",
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
  const [activeTab, setActiveTab] = useState<TabId>("valuation");
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

  const metricRows = useMemo((): { id: TabId; rows: { label: string; key: string; higherIsBetter: boolean; unit?: string; highlight?: boolean }[] }[] => [
    {
      id: "valuation",
      rows: [
        { label: "P/E Ratio", key: "pe", higherIsBetter: false, highlight: true },
        { label: "P/B Ratio", key: "pb", higherIsBetter: false },
        { label: "PEG Ratio", key: "peg", higherIsBetter: false },
        { label: "EV / EBITDA", key: "evToEbitda", higherIsBetter: false },
        { label: "Earnings Yield", key: "earningsYield", higherIsBetter: true, unit: "%" },
        { label: "FCF Yield", key: "fcfYield", higherIsBetter: true, unit: "%" },
      ],
    },
    {
      id: "quality",
      rows: [
        { label: "ROE", key: "roe", higherIsBetter: true, unit: "%", highlight: true },
        { label: "ROCE", key: "roce", higherIsBetter: true, unit: "%" },
        { label: "Net Margin", key: "netMargin", higherIsBetter: true, unit: "%" },
        { label: "Profit Margin", key: "profitMargin", higherIsBetter: true, unit: "%" },
        { label: "Interest Coverage", key: "interestCoverage", higherIsBetter: true },
        { label: "Promoter Holding", key: "promoterHolding", higherIsBetter: true, unit: "%" },
      ],
    },
    {
      id: "growth",
      rows: [
        { label: "EPS Growth (3Y)", key: "epsGrowth3y", higherIsBetter: true, unit: "%", highlight: true },
        { label: "Revenue Growth", key: "revenueGrowth", higherIsBetter: true, unit: "%" },
        { label: "Sales Growth (5Y)", key: "salesGrowth5y", higherIsBetter: true, unit: "%" },
        { label: "Profit Growth (5Y)", key: "profitGrowth5y", higherIsBetter: true, unit: "%" },
        { label: "Book Value Growth", key: "bookValueGrowth", higherIsBetter: true, unit: "%" },
      ],
    },
    {
      id: "dividend",
      rows: [
        { label: "Dividend Yield", key: "dividendYield", higherIsBetter: true, unit: "%", highlight: true },
        { label: "Payout Ratio", key: "dividendPayoutRatio", higherIsBetter: false, unit: "%" },
        { label: "Dividend Growth (5Y)", key: "dividendGrowth5y", higherIsBetter: true, unit: "%" },
        { label: "FCF Yield", key: "fcfYield", higherIsBetter: true, unit: "%" },
      ],
    },
    {
      id: "risk",
      rows: [
        { label: "Debt / Equity", key: "debtEquity", higherIsBetter: false, highlight: true },
        { label: "Current Ratio", key: "currentRatio", higherIsBetter: true },
        { label: "Asset Turnover", key: "assetTurnover", higherIsBetter: true },
        { label: "Beta", key: "beta", higherIsBetter: false },
        { label: "Interest Coverage", key: "interestCoverage", higherIsBetter: true },
      ],
    },
  ], []);

  const currentMetricRows = useMemo(() => metricRows.find((t) => t.id === activeTab)?.rows ?? [], [activeTab, metricRows]);

  const barMetrics = useMemo(() => [
    { label: "Health Score", key: "score", higherIsBetter: true },
    { label: "ROE", key: "roe", higherIsBetter: true },
    { label: "EPS Growth", key: "epsGrowth3y", higherIsBetter: true },
    { label: "FCF Yield", key: "fcfYield", higherIsBetter: true },
    { label: "Debt / Equity", key: "debtEquity", higherIsBetter: false },
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
    <div className="raycast-slideUp" style={{ display: "grid", gap: space[6] }}>
      {/* ════════════ HEADER ════════════ */}
      <section className="raycast-slideUp" style={{ position: "relative", overflow: "hidden", paddingBottom: space[4] }}>
        {/* Red stripe */}
        <div style={{
          position: "absolute",
          top: -80, left: "50%", transform: "translateX(-50%)",
          width: "clamp(300px, 70%, 600px)", height: 280,
          background: `radial-gradient(ellipse 70% 70% at 50% 40%, ${colors.marketRedSoft} 0%, ${colors.marketOrangeSoft} 50%, transparent 70%)`,
          pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: space[3] }}>
          <h1 style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: typography.h1.desktop.weight, lineHeight: typography.h1.desktop.line, margin: 0 }}>
            Compare{" "}
            <span style={{ background: `linear-gradient(135deg, ${colors.danger} 0%, ${colors.warning} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Stocks
            </span>
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, margin: 0 }}>
            Side-by-side fundamental comparison across key metrics. Add up to 5 stocks.
          </p>
        </div>
      </section>

      {/* ════════════ SEARCH + SELECTED ════════════ */}
      <section className="raycast-slideUp" style={{ animationDelay: "0.1s", animationFillMode: "both", display: "grid", gap: space[4] }}>
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
                background: colors.hairlineStrong,
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
        <section className="raycast-slideUp" style={{ animationDelay: "0.2s", animationFillMode: "both", display: "grid", gap: space[4] }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, margin: 0 }}>
              Visual Comparison
            </h2>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setChartMode("bar")} style={{
                padding: "6px 10px", borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                background: chartMode === "bar" ? colors.primary : "transparent",
                color: chartMode === "bar" ? colors.onPrimary : colors.textSecondary,
                cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
              }}>
                <BarChart3 size={14} /> Bars
              </button>
              <button onClick={() => setChartMode("radar")} style={{
                padding: "6px 10px", borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                background: chartMode === "radar" ? colors.primary : "transparent",
                color: chartMode === "radar" ? colors.onPrimary : colors.textSecondary,
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
        <section className="raycast-slideUp" style={{ animationDelay: "0.3s", animationFillMode: "both", display: "grid", gap: space[4] }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${colors.border}`, paddingBottom: 0 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderBottom: isActive ? `2px solid ${colors.primary}` : "2px solid transparent",
                    background: isActive ? colors.fill : "transparent",
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: "4px 4px 0 0",
                    transition: "all 0.15s ease",
                  }}
                >
                  {React.cloneElement(tab.icon as React.ReactElement, { color: isActive ? colors.primary : colors.textTertiary })}
                  {tab.label}
                </button>
              );
            })}
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
        <section className="raycast-slideUp" style={{ animationDelay: "0.4s", animationFillMode: "both", display: "grid", gap: space[4] }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: space[2], color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: typography.h3.desktop.weight, margin: 0 }}>
            <Sparkles size={16} color={colors.warning} /> AI Comparison Insight
          </h2>
          <div style={{ display: "grid", gap: space[4], gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            {/* Allocation recommendation */}
            <Card variant="elevated">
              {(() => {
                const sorted = [...stocks].sort((a, b) => b.score - a.score);
                const top = sorted[0];
                const worst = sorted[sorted.length - 1];
                return (
                  <div style={{ display: "grid", gap: space[3] }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Award size={16} color={colors.success} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>AI Allocation</span>
                    </div>
                    <p style={{ fontSize: 14, color: colors.textPrimary, margin: 0, lineHeight: 1.6 }}>
                      <strong>{top.symbol}</strong> leads with a score of <PriceFlash value={top.score}><strong>{top.score}/100</strong></PriceFlash>, driven by strong{" "}
                      {Number(top.metrics.roe) > 20 ? "ROE and profitability" : "growth and reasonable valuation"}.
                    </p>
                    {/* Per-stock conviction allocation */}
                    <div style={{ display: "grid", gap: 8 }}>
                      {sorted.map((s, i) => {
                        const pct = sorted.length > 1 ? Math.round((s.score / sorted.reduce((sum, st) => sum + st.score, 0)) * 100) : 100;
                        return (
                          <div key={s.symbol} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? colors.success : colors.textSecondary, minWidth: 18 }}>
                              {i + 1}.
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary, minWidth: 80 }}>{s.symbol}</span>
                            <div style={{ flex: 1, height: 6, background: colors.border, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{
                                width: `${pct}%`,
                                height: "100%",
                                borderRadius: 3,
                                background: i === 0 ? colors.success : i === 1 ? colors.primary : colors.textTertiary,
                                transition: "width 0.5s ease",
                              }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, minWidth: 36, textAlign: "right" }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 12, color: colors.textTertiary, margin: 0, lineHeight: 1.5 }}>
                      {sorted.length > 1 && sorted[1].score >= top.score - 8
                        ? `${sorted[1].symbol} is close behind — diversify across both for balanced exposure.`
                        : `Concentrate on ${top.symbol} for best risk-adjusted returns.`}
                      {worst.score < 50 && ` Consider removing ${worst.symbol} (low overall health).`}
                    </p>
                  </div>
                );
              })()}
            </Card>

            {/* Sector concentration warning */}
            <Card variant="elevated">
              {(() => {
                const sectorCounts: Record<string, number> = {};
                stocks.forEach((s) => { sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1; });
                const maxSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];
                const hasConcentration = maxSector && maxSector[1] >= 2 && stocks.length >= 3;
                return (
                  <div style={{ display: "grid", gap: space[3] }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={16} color={hasConcentration ? colors.warning : colors.success} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Sector Analysis</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).map(([sector, count]) => (
                        <span key={sector} style={{
                          padding: "3px 10px",
                          borderRadius: radius.full,
                          fontSize: 11,
                          fontWeight: 600,
                          background: count >= 2 ? colors.marketOrangeSoft : colors.fill,
                          color: count >= 2 ? colors.warning : colors.textSecondary,
                          border: `1px solid ${count >= 2 ? colors.warning : colors.border}`,
                        }}>
                          {sector} ({count})
                        </span>
                      ))}
                    </div>
                    {hasConcentration ? (
                      <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
                        <strong style={{ color: colors.warning }}>⚠️ Sector concentration detected:</strong>{" "}
                        {maxSector[1]} of {stocks.length} stocks are in {maxSector[0]}. Consider diversifying across different sectors to reduce systematic risk.
                      </p>
                    ) : (
                      <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
                        <span style={{ color: colors.success }}>✓</span> Well-diversified across sectors. No single sector dominates your comparison set.
                      </p>
                    )}
                    {/* Summary stats */}
                    <div style={{ display: "flex", gap: 16, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                      <div>
                        <div style={{ fontSize: 11, color: colors.textTertiary }}>Avg Score</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                          {Math.round(stocks.reduce((s, st) => s + st.score, 0) / stocks.length)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: colors.textTertiary }}>Avg ROE</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                          {Math.round(stocks.reduce((s, st) => s + (st.metrics.roe as number), 0) / stocks.length)}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: colors.textTertiary }}>Sectors</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                          {Object.keys(sectorCounts).length}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>
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
