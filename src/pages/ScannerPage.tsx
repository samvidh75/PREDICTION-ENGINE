import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { scanByType, type ScanType } from "../services/scanner/scoringEngine";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, radius } from "../design/tokens";
import { SEBIComplianceBanner } from "../components/SEBICompliance";

const SCANS: ScanType[] = ["quality", "value", "momentum", "stable"];

const COLUMNS = [
  { key: "rank", label: "#", width: "32px" },
  { key: "company", label: "Company", width: "1fr" },
  { key: "quality", label: "Quality", width: "64px" },
  { key: "valuation", label: "Val", width: "56px" },
  { key: "growth", label: "Growth", width: "64px" },
  { key: "risk", label: "Risk", width: "56px" },
  { key: "technical", label: "Tech", width: "56px" },
  { key: "overall", label: "%", width: "48px" },
] as const;

export default function ScannerPage() {
  const navigate = useNavigate();
  const [scanType, setScanType] = useState<ScanType>("quality");
  const [query, setQuery] = useState("");
  const label = useResponsiveValue("13px", "14px");
  const results = useMemo(
    () =>
      scanByType(scanType).filter(
        (item) =>
          item.symbol.toLowerCase().includes(query.toLowerCase()) ||
          item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, scanType],
  );

  const displayResults = results.slice(0, 50);

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <SEBIComplianceBanner />
      <div style={{ display: "grid", gap: "16px" }}>
        <h1 style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: 600, lineHeight: "1.25" }}>Scanner</h1>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {SCANS.map((scan) => (
            <Button key={scan} variant={scan === scanType ? "primary" : "secondary"} onClick={() => setScanType(scan)}>
              {scan}
            </Button>
          ))}
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
      </div>

      <Card>
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLUMNS.map((c) => c.width).join(" "),
              gap: "12px",
              minWidth: "600px",
              padding: "4px",
            }}
          >
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                style={{
                  color: colors.textSecondary,
                  fontSize: label,
                  fontWeight: 500,
                  lineHeight: "1.4",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: `0 8px 8px`,
                  borderBottom: `1px solid ${colors.border}`,
                  textAlign: col.key === "company" ? "left" : "right",
                }}
              >
                {col.label}
              </div>
            ))}
            {displayResults.map((stock, index) => (
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
                  { value: String(index + 1), color: colors.textSecondary },
                  { value: stock.name || stock.symbol, color: colors.textPrimary, bold: true },
                  { value: String(stock.quality ?? "-"), color: colors.textPrimary },
                  { value: String(stock.valuation ?? "-"), color: colors.textPrimary },
                  { value: String(stock.growth ?? "-"), color: colors.textPrimary },
                  { value: String(stock.risk ?? "-"), color: colors.textPrimary },
                  { value: String(stock.technical ?? "-"), color: colors.textPrimary },
                  { value: `${stock.overall ?? "-"}%`, color: colors.textPrimary },
                ].map((cell, ci) => (
                  <div
                    key={ci}
                    style={{
                      color: cell.color,
                      fontSize: label,
                      fontWeight: cell.bold ? 600 : 400,
                      lineHeight: "1.4",
                      padding: "8px 8px",
                      textAlign: ci === 1 ? "left" : "right",
                      borderBottom: `1px solid ${colors.border}`,
                      background: index % 2 === 0 ? "transparent" : colors.fill,
                      transition: "background 120ms ease",
                      borderRadius: ci === 0 ? "6px 0 0 6px" : ci === 7 ? "0 6px 6px 0" : "0",
                    }}
                  >
                    {cell.value}
                  </div>
                ))}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
