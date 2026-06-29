import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { scanByPreset, SCAN_PRESETS, type EnhancedScanType, type EnhancedScannedStock, type ScanPresetDefinition } from "../services/scanner/presets";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, radius } from "../design/tokens";
import { SEBIComplianceBanner } from "../components/SEBICompliance";
import { ScannerPresets } from "../components/ScannerPresets";

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

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <SEBIComplianceBanner />
      <div style={{ display: "grid", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <h1 style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: 600, lineHeight: "1.25", margin: 0 }}>Scanner</h1>
          <span style={{ fontSize: "12px", color: colors.textSecondary }}>
            <kbd style={{ background: colors.surfaceCard, border: `1px solid ${colors.hairlineStrong}`, borderRadius: 4, padding: "1px 6px", fontSize: 11, fontFamily: "inherit", color: colors.textSecondary }}>⌘K</kbd> to search
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SCAN_PRESETS.map((preset) => (
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

        <div style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.45", maxWidth: "520px" }}>
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

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search symbol or company"
          style={{
            maxWidth: "360px",
            minHeight: "44px",
            border: `1px solid ${colors.border}`,
            borderRadius: "44px",
            padding: "0 16px",
          }}
        />

        <ScannerPresets
          scanType={activePresetId}
          query={query}
          onApply={(preset) => {
            setQuery((preset.filters.query as string) || "");
          }}
        />
      </div>

      <Card>
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
                  borderBottom: `1px solid ${colors.border}`,
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
                        borderBottom: `1px solid ${colors.border}`,
                        background: (stock.rank - 1) % 2 === 0 ? "transparent" : colors.fill,
                        transition: "background 120ms ease",
                        borderRadius: ci === 0 ? "6px 0 0 6px" : isLast ? "0 6px 6px 0" : "0",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      {cell.value}
                    </div>
                  );
                })}
                {/* hidden match reason tooltip via title */}
                <div style={{ display: "none" }} data-match={stock.matchReason} />
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Results summary */}
      <div style={{ fontSize: "12px", color: colors.textSecondary, textAlign: "center" }}>
        Showing {displayResults.length} of {results.length} results for <strong>{activePreset.label}</strong>
        &nbsp;· Hover a row for match reason
      </div>
    </div>
  );
}
