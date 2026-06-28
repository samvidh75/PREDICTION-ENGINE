/**
 * StockStory Scenario Presets
 *
 * Stock-agnostic, compliance-safe scenario presets.
 * Every preset shows explicit assumptions to the user.
 * Assumption magnitudes are documented and reasonable.
 *
 * Language rules:
 * - Use "could", "may", "under this assumption"
 * - Never "will", "definitely", "guaranteed"
 */

import type { ScenarioInput, ScenarioKind, ScenarioSeverity } from "./ScenarioTypes";

export interface PresetDefinition {
  kind: ScenarioKind;
  severity: ScenarioSeverity;
  userFacingName: string;
  userFacingDescription: string;
}

export const SCENARIO_PRESETS: PresetDefinition[] = [
  // ── 1. Base Case ──────────────────────────────────────────────
  {
    kind: "base_case",
    severity: "moderate",
    userFacingName: "Base Case — No Change",
    userFacingDescription:
      "Current view under existing data. No assumption changes applied. This reflects the latest available financial, valuation, and technical data as-is.",
  },

  // ── 2. Bull Case ──────────────────────────────────────────────
  {
    kind: "bull_case",
    severity: "moderate",
    userFacingName: "Bull Case — Improving Conditions",
    userFacingDescription:
      "Under this scenario, revenue growth could improve by 10%, profit growth by 10%, and operating margins could improve by 3%. Risk remains stable. Valuation may stay at current levels or command a modest premium. This is a hypothetical scenario, not a forecast.",
  },

  // ── 3. Bear Case ──────────────────────────────────────────────
  {
    kind: "bear_case",
    severity: "moderate",
    userFacingName: "Bear Case — Deteriorating Conditions",
    userFacingDescription:
      "Under this scenario, growth could weaken — revenue growth may decline by 10%, profit growth by 15%. Operating margins could compress by 3%. Risk may rise, and valuation multiples could compress by 10%. This is a hypothetical scenario, not a forecast.",
  },

  // ── 4. Margin Pressure ────────────────────────────────────────
  {
    kind: "margin_change",
    severity: "moderate",
    userFacingName: "Margin Pressure",
    userFacingDescription:
      "Under this scenario, operating margins could compress by 5%. This may affect earnings quality, financial health, and thesis confidence. This is a hypothetical scenario, not a forecast.",
  },

  // ── 5. Earnings Acceleration ──────────────────────────────────
  {
    kind: "earnings_growth_change",
    severity: "moderate",
    userFacingName: "Earnings Acceleration",
    userFacingDescription:
      "Under this scenario, revenue and profit growth could accelerate by 10%. If margins remain stable, this may improve earnings quality and thesis confidence. This is a hypothetical scenario, not a forecast.",
  },

  // ── 6. Valuation Derating ─────────────────────────────────────
  {
    kind: "valuation_multiple_change",
    severity: "moderate",
    userFacingName: "Valuation Derating",
    userFacingDescription:
      "Under this scenario, PE and EV/EBITDA multiples could compress by 15%. This may change valuation context and reduce the growth premium. A cheap stock with weak quality may still present a value trap risk. This is a hypothetical scenario, not a forecast.",
  },

  // ── 7. Debt Stress ────────────────────────────────────────────
  {
    kind: "debt_change",
    severity: "moderate",
    userFacingName: "Debt Stress",
    userFacingDescription:
      "Under this scenario, debt-to-equity could increase by 0.5. This may raise balance sheet risk and affect financial health and thesis confidence. This is a hypothetical scenario, not a forecast.",
  },

  // ── 8. Momentum Reversal ──────────────────────────────────────
  {
    kind: "technical_regime_change",
    severity: "moderate",
    userFacingName: "Momentum Reversal",
    userFacingDescription:
      "Under this scenario, price momentum could weaken by 15% and volatility could increase by 10%. This may change the technical regime and timing context. Technical context does not override business quality. This is a hypothetical scenario, not a forecast.",
  },

  // ── 9. Sector Headwind ────────────────────────────────────────
  {
    kind: "sector_shock",
    severity: "moderate",
    userFacingName: "Sector Headwind",
    userFacingDescription:
      "Under this scenario, the sector's median PE could compress by 10% and sector growth expectations could weaken by 5%. This may affect sector-relative valuation and peer comparison. Company-specific fundamentals may show resilience. This is a hypothetical scenario, not a forecast.",
  },

  // ── 10. Sector Tailwind ───────────────────────────────────────
  {
    kind: "sector_shock",
    severity: "moderate",
    userFacingName: "Sector Tailwind",
    userFacingDescription:
      "Under this scenario, the sector's median PE could expand by 10% and sector growth expectations could improve by 5%. This may improve sector-relative valuation context. Company-specific execution remains key. This is a hypothetical scenario, not a forecast.",
  },

  // ── 11. Risk Event ────────────────────────────────────────────
  {
    kind: "risk_event",
    severity: "moderate",
    userFacingName: "Hypothetical Risk Event",
    userFacingDescription:
      "Under this hypothetical scenario, a risk event could raise the overall risk score by 10 points. This may affect the risk radar, thesis lifecycle, and review priority. No actual event is claimed. This is a hypothetical scenario, not a forecast.",
  },
];

// ─── Preset builder ───────────────────────────────────────────────

let presetCounter = 0;

export function buildPresetScenario(
  symbol: string,
  presetIndex: number
): ScenarioInput {
  const preset = SCENARIO_PRESETS[presetIndex];
  if (!preset) {
    throw new Error(`Invalid preset index: ${presetIndex}`);
  }

  presetCounter++;
  const id = `preset-${preset.kind}-${presetCounter}-${Date.now()}`;

  return {
    id,
    symbol,
    kind: preset.kind,
    severity: preset.severity,
    assumptions: getPresetAssumptions(preset.kind, preset.severity),
    createdAt: new Date().toISOString(),
    userFacingName: preset.userFacingName,
    userFacingDescription: preset.userFacingDescription,
  };
}

/** Get default assumption values for a preset scenario */
function getPresetAssumptions(
  kind: ScenarioKind,
  _severity: ScenarioSeverity
): ScenarioInput["assumptions"] {
  switch (kind) {
    case "base_case":
      return {};
    case "bull_case":
      return {
        revenueGrowthDeltaPct: 10,
        profitGrowthDeltaPct: 10,
        operatingMarginDeltaPct: 3,
      };
    case "bear_case":
      return {
        revenueGrowthDeltaPct: -10,
        profitGrowthDeltaPct: -15,
        operatingMarginDeltaPct: -3,
        peMultipleDeltaPct: -10,
        riskShockScoreDelta: 5,
      };
    case "earnings_growth_change":
      return {
        revenueGrowthDeltaPct: 10,
        profitGrowthDeltaPct: 10,
      };
    case "margin_change":
      return {
        operatingMarginDeltaPct: -5,
      };
    case "valuation_multiple_change":
      return {
        peMultipleDeltaPct: -15,
        evEbitdaDeltaPct: -15,
      };
    case "debt_change":
      return {
        debtToEquityDelta: 0.5,
      };
    case "interest_rate_pressure":
      return {
        debtToEquityDelta: 0.3,
        peMultipleDeltaPct: -10,
      };
    case "sector_shock":
      return {
        sectorMedianPeDeltaPct: -10,
        sectorGrowthDeltaPct: -5,
      };
    case "technical_regime_change":
      return {
        priceMomentumDeltaPct: -15,
        volatilityDeltaPct: 10,
      };
    case "risk_event":
      return {
        riskShockScoreDelta: 10,
      };
    case "custom":
      return {};
    default:
      return {};
  }
}
