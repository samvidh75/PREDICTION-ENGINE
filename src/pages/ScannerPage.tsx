import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { scanByPreset, SCAN_PRESETS, type EnhancedScanType, type EnhancedScannedStock, type ScanPresetDefinition } from "../services/scanner/presets";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, radius } from "../design/tokens";
import { ScannerPresets } from "../components/ScannerPresets";
import { Sparkles, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

const FALLBACK_PRESET: EnhancedScanType = "quality-compounders";

const FACTOR_COLUMNS = [
  { key: "quality", label: "Quality", width: "64px" },
  { key: "growth", label: "Growth", width: "64px" },
  { key: "momentum", label: "Mom", width: "56px" },
  { key: "valuation", label: "Val", width: "56px" },
  { key: "risk", label: "Risk", width: "56px" },
  { key: "stability", label: "Stability", width: "72px" },
  { key: "dividend", label: "Div", width: "56px" },
] as const;

export default function ScannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFromUrl = searchParams.get("preset") as EnhancedScanType | null;

  const [activePresetId, setActivePresetId] = useState<EnhancedScanType>(
    presetFromUrl && SCAN_PRESETS.find((p) => p.id === presetFromUrl) ? presetFromUrl : FALLBACK_PRESET,
  );
  const [query, setQuery] = useState("");
  const [hoveredStock, setHoveredStock] = useState<EnhancedScannedStock | null>(null);
  const label = useResponsiveValue("13px", "14px");

  const activePreset = SCAN_PRESETS.find((p) => p.id === activePresetId)!;

  const results = useMemo(
    () =>
      scanByPreset(activePresetId).filter(
        (item) =>
          item.symbol.toLowerCase().includes(query.toLowerCase()) ||
          item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, activePresetId],
  );

  const displayResults = results.slice(0, 50);

  // AI-style factor explanations
  const getFactorLabel = (value: number): { label: string; icon: typeof TrendingUp; color: string } => {
    if (value >= 70) return { label: "Strong", icon: TrendingUp, color: colors.success };
    if (value >= 50) return { label: "Solid", icon: TrendingUp, color: colors.primary };
    if (value >= 35) return { label: "Average", icon: Minus, color: colors.warning };
    return { label: "Weak", icon: TrendingDown, color: colors.marketRed };
  };

  const getFactorExplanation = (key: string, value: number, symbol: string): string => {
    if (key === "quality") {
      return value >= 70
        ? `${symbol} has excellent quality metrics — high ROE, strong balance sheet, and consistent earnings.`
        : value >= 50
          ? `${symbol} shows decent quality with stable fundamentals and manageable debt.`
          : `${symbol} has below-average quality indicators. Consider reviewing balance sheet strength.`;
    }
    if (key === "growth") {
      return value >= 70
        ? `${symbol} demonstrates outstanding revenue and profit growth trajectory.`
        : value >= 50
          ? `${symbol} shows steady growth. Expansion may be moderating but remains positive.`
          : `${symbol} has sluggish growth. Check if this is cyclical or structural.`;
    }
    if (key === "momentum") {
      return value >= 70
        ? `Strong price momentum for ${symbol} — technical indicators are bullish.`
        : value >= 50
          ? `${symbol} has neutral momentum. No clear directional signal.`
          : `Weak momentum for ${symbol}. Watch for potential trend reversal.`;
    }
    if (key === "valuation") {
      return value >= 70
        ? `${symbol} is attractively valued relative to peers and historical ranges.`
        : value >= 50
          ? `${symbol} trades near fair value. Not cheap, not expensive.`
          : `${symbol} appears expensive on valuation metrics. Growth expectations may be priced in.`;
    }
    if (key === "risk") {
      return value >= 70
        ? `${symbol} shows low risk characteristics — stable earnings, low debt, diversified revenue.`
        : value >= 50
          ? `${symbol} carries moderate risk. Monitor leverage and industry headwinds.`
          : `${symbol} has elevated risk. High debt or volatile earnings warrant caution.`;
    }
    if (key === "stability") {
      return value >= 70
        ? `${symbol} is a stable compounder with consistent performance history.`
        : value >= 50
          ? `${symbol} has reasonable stability. Earnings are generally predictable.`
          : `${symbol} shows earnings volatility. Suitable for higher risk tolerance.`;
    }
    if (key === "dividend") {
      return value >= 70
        ? `${symbol} offers strong and sustainable dividend yield with good payout ratio.`
        : value >= 50
          ? `${symbol} pays a modest dividend. Yield is average but sustainable.`
          : `${symbol} has limited dividend appeal. Better suited for growth investors.`;
    }
    return `${symbol} scores ${value}% on ${key}.`;
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <div className="raycast-slideUp" style={{ display: "grid", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <h1 style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: 600, lineHeight: "1.25", margin: 0 }}>Scanner</h1>
          <span style={{ fontSize: "12px", color: colors.textSecondary }}>
            <kbd style={{ background: colors.surface, border: `1px solid ${colors.hairlineStrong}`, borderRadius: 4, padding: "1px 6px", fontSize: 11, fontFamily: "inherit", color: colors.textSecondary }}>⌘K</kbd> to search
          </span>
        </div>

        <div className="raycast-stagger-1" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SCAN_PRESETS.map((preset, i) => (
            <Button
              key={preset.id}
              variant={preset.id === activePresetId ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActivePresetId(preset.id)}
              title={preset.description}
            >
              {preset.icon} {preset.shortLabel}
            </Button>
          ))}
        </div>

        <div className="raycast-stagger-2" style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.45", maxWidth: "520px" }}>
          <strong style={{ color: colors.textPrimary }}>{activePreset.label}</strong> — {activePreset.description}
          {activePreset.filters && (
            <span style={{ display: "block", marginTop: "4px", fontSize: "12px", color: colors.textTertiary }}>
              Filters: {[
                activePreset.filters.maxPe !== undefined && `PE ≤ ${activePreset.filters.maxPe}`,
                activePreset.filters.maxDebtToEquity !== undefined && `D/E ≤ ${activePreset.filters.maxDebtToEquity}`,
                activePreset.filters.minRevenueGrowth !== undefined && `Rev growth ≥ ${activePreset.filters.minRevenueGrowth}%`,
                activePreset.filters.minDividendYield !== undefined && `Yield ≥ ${activePreset.filters.minDividendYield}%`,
                activePreset.filters.minRoe !== undefined && `ROE ≥ ${activePreset.filters.minRoe}%`,
              ].filter(Boolean).join(" · ")}
              {activePreset.thresholds && Object.keys(activePreset.thresholds).length > 0 && (
                <> · Thresholds: {Object.entries(activePreset.thresholds).map(([k, v]) => `${k} ≥ ${v}`).join(" · ")}</>
              )}
            </span>
          )}
        </div>

        <div className="raycast-stagger-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search symbol or company"
            style={{
              maxWidth: "360px",
              minHeight: "44px",
              border: `1px solid ${colors.hairline}`,
              borderRadius: "44px",
              padding: "0 16px",
              background: "rgba(255,255,255,0.04)",
              color: colors.textPrimary,
              outline: "none",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transition: "border-color 0.15s ease, background 0.15s ease",
            }}
            onFocus={(e) => { e.target.style.borderColor = colors.hairlineStrong; e.target.style.background = "rgba(255,255,255,0.06)"; }}
            onBlur={(e) => { e.target.style.borderColor = colors.hairline; e.target.style.background = "rgba(255,255,255,0.04)"; }}
          />
        </div>

        <div className="raycast-stagger-4">
          <ScannerPresets
            scanType={activePresetId}
            query={query}
            onApply={(preset) => {
              setQuery((preset.filters.query as string) || "");
            }}
          />
        </div>
      </div>

      <div className="raycast-stagger-5">
        <Card variant="elevated">
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `32px 1fr repeat(${FACTOR_COLUMNS.length}, auto) 64px`,
                gap: "8px",
                minWidth: "680px",
                padding: "4px",
              }}
            >
              {/* Header */}
              {[
                { key: "rank", label: "#", width: "32px" },
                { key: "company", label: "Company", width: "1fr" },
                ...FACTOR_COLUMNS,
                { key: "composite", label: "%", width: "64px" },
              ].map((col) => (
                <div
                  key={col.key}
                  style={{
                    color: colors.textSecondary,
                    fontSize: label,
                    fontWeight: 500,
                    lineHeight: "1.4",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: `0 6px 8px`,
                    borderBottom: `1px solid ${colors.hairline}`,
                    textAlign: col.key === "company" ? "left" : "right",
                  }}
                >
                  {col.label}
                </div>
              ))}

              {/* Rows */}
              {displayResults.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                  onMouseEnter={() => setHoveredStock(stock)}
                  onMouseLeave={() => setHoveredStock((prev) => (prev?.symbol === stock.symbol ? null : prev))}
                  style={{
                    all: "unset",
                    display: "contents",
                    cursor: "pointer",
                  }}
                >
                  {[
                    { value: String(stock.rank), color: colors.textSecondary, bold: false },
                    { value: stock.name ? `${stock.name} (${stock.symbol})` : stock.symbol, color: colors.textPrimary, bold: true },
                    ...FACTOR_COLUMNS.map((fc) => ({
                      value: String(Math.round((stock as any)[fc.key] ?? 0)),
                      color: colors.textPrimary,
                      bold: false,
                    })),
                    { value: `${Math.round(stock.composite)}%`, color: colors.primary, bold: true },
                  ].map((cell, ci) => {
                    const isLast = ci === FACTOR_COLUMNS.length + 2;
                    return (
                      <div
                        key={ci}
                        style={{
                          color: cell.color,
                          fontSize: label,
                          fontWeight: cell.bold ? 600 : 400,
                          lineHeight: "1.4",
                          padding: "8px 6px",
                          textAlign: ci === 1 ? "left" : "right",
                          borderBottom: `1px solid ${colors.hairline}`,
                          background: (stock.rank - 1) % 2 === 0 ? "transparent" : `rgba(255,255,255,0.02)`,
                          transition: "background 120ms ease",
                          borderRadius: ci === 0 ? "6px 0 0 6px" : isLast ? "0 6px 6px 0" : "0",
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        {cell.value}
                      </div>
                    );
                  })}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* AI Detail Panel — appears on row hover */}
      {hoveredStock && (
        <div className="raycast-slideUp raycast-stagger-6" style={{
          padding: "16px 20px",
          background: "rgba(20,20,24,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${colors.hairline}`,
          borderRadius: radius.md,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Sparkles size={14} color={colors.primary} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: colors.primary }}>
              AI Factor Breakdown
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: colors.textPrimary }}>
              {hoveredStock.name} ({hoveredStock.symbol})
            </span>
            <span style={{
              marginLeft: "auto",
              fontSize: "13px",
              fontWeight: 600,
              color: colors.textSecondary,
              background: colors.fill,
              padding: "3px 10px",
              borderRadius: radius.md,
            }}>
              Rank #{hoveredStock.rank} · Score {Math.round(hoveredStock.composite)}%
            </span>
          </div>

          {/* Factor bars with AI explanations */}
          <div style={{ display: "grid", gap: "6px" }}>
            {FACTOR_COLUMNS.map((fc) => {
              const value = (hoveredStock as any)[fc.key] ?? 0;
              const { label: strengthLabel, icon: Icon, color: strengthColor } = getFactorLabel(value);
              const explanation = getFactorExplanation(fc.key, value, hoveredStock.symbol);
              const barColor = value >= 70 ? colors.success : value >= 50 ? colors.primary : value >= 35 ? colors.warning : colors.marketRed;

              return (
                <div
                  key={fc.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 60px 2fr",
                    gap: "12px",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: radius.md,
                    background: value >= 70 ? `${colors.success}0A` : value >= 50 ? `${colors.primary}0A` : `${colors.marketRed}0A`,
                    transition: "background 150ms ease",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {fc.label}
                  </span>
                  <div style={{ height: "6px", background: colors.border, borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${value}%`, background: barColor, borderRadius: "3px", transition: "width 300ms ease" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Icon size={12} color={strengthColor} />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: strengthColor }}>
                      {Math.round(value)}%
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: colors.textSecondary, lineHeight: "1.5" }}>
                    {explanation}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary insight */}
          <div style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}>
            <BarChart3 size={14} color={colors.textSecondary} style={{ marginTop: "1px", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: colors.textSecondary, lineHeight: "1.6" }}>
              <strong style={{ color: colors.textPrimary }}>Preset Match: </strong>
              {hoveredStock.matchReason || `${hoveredStock.symbol} matches the ${activePreset.label} preset with a composite score of ${Math.round(hoveredStock.composite)}%. Top factor: ${FACTOR_COLUMNS.reduce((best, fc) => ((hoveredStock as any)[fc.key] ?? 0) > ((hoveredStock as any)[best.key] ?? 0) ? fc : best, FACTOR_COLUMNS[0]).label}.`}
              <br />
              <span style={{ color: colors.textTertiary, fontSize: "11px" }}>
                Click to view full stock detail · {new Date().toLocaleTimeString()} snapshot
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Results summary */}
      <div className="raycast-stagger-7" style={{ fontSize: "12px", color: colors.textSecondary, textAlign: "center" }}>
        Showing <strong style={{ color: colors.textPrimary }}>{displayResults.length}</strong> of{" "}
        <strong style={{ color: colors.textPrimary }}>{results.length}</strong> results for{" "}
        <strong style={{ color: colors.primary }}>{activePreset.label}</strong>
        &nbsp;· Hover a row for AI factor breakdown
      </div>
    </div>
  );
}
