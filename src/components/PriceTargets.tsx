/**
 * PriceTargets — Bull / Base / Bear case price targets with AI methodology.
 * 
 * Shows:
 *   - 3 scenarios with target prices and potential return %
 *   - Conviction level for each scenario
 *   - Key assumptions per scenario
 *   - Consensus analyst targets for reference
 * 
 * SEBI-compliant: "Algorithmic assessment" language, no directional advice.
 * 
 * Spec ref: Section "Price Targets" — Bull/Base/Bear.
 */

import { Target, TrendingUp, Minus, TrendingDown, Info } from "lucide-react";
import { colors, radius, animation } from "../design/tokens";
import { formatNumber } from "../services/ui/dataFormatting";
import { formatPercent } from "../services/ui/indianNumberFormat";

interface PriceTarget {
  scenario: "bull" | "base" | "bear";
  label: string;
  price: number;
  potentialReturn: number; // percentage
  probability: number;     // 0-100, sum across 3 scenarios ≈ 100
  methodology: string;
  assumptions: string[];
}

// Mock data — production uses AI model + DCF/PE/EV-EBITDA triangulation
const MOCK_TARGETS: PriceTarget[] = [
  {
    scenario: "bull",
    label: "Bull Case",
    price: 420,
    potentialReturn: 22.6,
    probability: 35,
    methodology: "DCF with 12% WACC, 15% terminal growth, P/E expansion to 28x FY27E",
    assumptions: [
      "Revenue CAGR 18% over next 3 years",
      "EBITDA margins expand to 24%",
      "P/E re-rating to sector average",
      "New product launches successful",
    ],
  },
  {
    scenario: "base",
    label: "Base Case",
    price: 375,
    potentialReturn: 9.5,
    probability: 45,
    methodology: "DCF with 13% WACC, 12% terminal growth, P/E at current 22x FY27E",
    assumptions: [
      "Revenue CAGR 12% over next 3 years",
      "EBITDA margins stable at 21%",
      "Market share maintained",
      "No major regulatory changes",
    ],
  },
  {
    scenario: "bear",
    label: "Bear Case",
    price: 280,
    potentialReturn: -18.2,
    probability: 20,
    methodology: "DCF with 15% WACC, 8% terminal growth, P/E contraction to 16x FY27E",
    assumptions: [
      "Revenue CAGR slows to 5%",
      "EBITDA margins compress to 17%",
      "Increased competition",
      "Raw material cost inflation",
    ],
  },
];

const SCENARIO_CONFIG: Record<PriceTarget["scenario"], { icon: React.ReactNode; color: string; bg: string; borderColor: string }> = {
  bull: {
    icon: <TrendingUp size={16} />,
    color: colors.marketGreen,
    bg: colors.marketGreenSoft,
    borderColor: "rgba(52, 199, 89, 0.3)",
  },
  base: {
    icon: <Minus size={16} />,
    color: colors.accentRed,
    bg: colors.accentRedSoft,
    borderColor: "rgba(255, 99, 99, 0.3)",
  },
  bear: {
    icon: <TrendingDown size={16} />,
    color: colors.marketRed,
    bg: colors.marketRedSoft,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
};

export function PriceTargets({ currentPrice = 342.50 }: { currentPrice?: number }) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Target size={16} color={colors.textSecondary} />
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: colors.textPrimary }}>
          Price Targets
        </h3>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: colors.textTertiary,
            background: colors.surfaceCard,
            padding: "2px 6px",
            borderRadius: "999px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          AI-Generated
        </span>
      </div>

      {/* Current price anchor */}
      <div
        style={{
          padding: "12px 16px",
          background: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.hairline}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "13px", color: colors.textSecondary }}>Current Price (CMP)</span>
        <span style={{ fontSize: "20px", fontWeight: 700, color: colors.textPrimary }}>
          ₹{formatNumber(currentPrice)}
        </span>
      </div>

      {/* Target cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {MOCK_TARGETS.map((target) => {
          const config = SCENARIO_CONFIG[target.scenario];
          return (
            <div
              key={target.scenario}
              style={{
                padding: "16px",
                background: config.bg,
                borderRadius: radius.md,
                border: `1px solid ${config.borderColor}`,
                transition: `all ${animation.fast}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: config.color }}>{config.icon}</span>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: config.color }}>
                    {target.label}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: config.color,
                      opacity: 0.7,
                    }}
                  >
                    {target.probability}% prob.
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: colors.textPrimary }}>
                    ₹{formatNumber(target.price)}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: target.potentialReturn >= 0 ? colors.marketGreen : colors.marketRed,
                    }}
                  >
                    {formatPercent(target.potentialReturn)}
                  </div>
                </div>
              </div>

              {/* Methodology */}
              <div style={{ fontSize: "12px", color: colors.textSecondary, marginBottom: "8px", lineHeight: "1.5" }}>
                <strong>Methodology:</strong> {target.methodology}
              </div>

              {/* Assumptions */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {target.assumptions.map((assumption, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 8px",
                      background: colors.surface,
                      borderRadius: radius.full,
                      fontSize: "11px",
                      color: colors.textSecondary,
                      border: `1px solid ${colors.hairline}`,
                    }}
                  >
                    {assumption}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div
        style={{
          marginTop: "14px",
          padding: "10px 12px",
          background: colors.surface,
          borderRadius: radius.sm,
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          fontSize: "11px",
          color: colors.textTertiary,
          lineHeight: "1.5",
        }}
      >
        <Info size={12} style={{ flexShrink: 0, marginTop: "2px" }} />
        <span>
          Price targets are algorithmic assessments based on financial modeling (DCF, P/E, EV/EBITDA triangulation).
          These are not recommendations. Actual results may differ materially. Consult a licensed advisor.
        </span>
      </div>
    </div>
  );
}
