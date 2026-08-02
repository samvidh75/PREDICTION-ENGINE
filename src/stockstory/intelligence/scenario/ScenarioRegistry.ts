/**
 * Lensory Scenario Registry
 *
 * Central registry for scenario kinds, severity levels,
 * and scenario validation. Provides lookup and metadata
 * for all supported scenario types.
 */

import type {
  ScenarioKind,
  ScenarioSeverity,
  ScenarioAssumptions,
  ScenarioInput,
} from "./ScenarioTypes";

// ─── Scenario kind metadata ───────────────────────────────────────

export interface ScenarioKindMeta {
  kind: ScenarioKind;
  label: string;
  description: string;
  allowedAssumptionKeys: (keyof ScenarioAssumptions)[];
  isPreset: boolean;
}

const SCENARIO_KINDS: Record<ScenarioKind, ScenarioKindMeta> = {
  base_case: {
    kind: "base_case",
    label: "Base Case",
    description: "No change — current view under existing data.",
    allowedAssumptionKeys: [],
    isPreset: true,
  },
  bull_case: {
    kind: "bull_case",
    label: "Bull Case",
    description: "Growth and margins improve; valuation stable or modest premium.",
    allowedAssumptionKeys: [
      "revenueGrowthDeltaPct",
      "profitGrowthDeltaPct",
      "operatingMarginDeltaPct",
    ],
    isPreset: true,
  },
  bear_case: {
    kind: "bear_case",
    label: "Bear Case",
    description: "Growth weakens; margins compress; risk rises; valuation multiple compresses.",
    allowedAssumptionKeys: [
      "revenueGrowthDeltaPct",
      "profitGrowthDeltaPct",
      "operatingMarginDeltaPct",
      "peMultipleDeltaPct",
      "riskShockScoreDelta",
    ],
    isPreset: true,
  },
  earnings_growth_change: {
    kind: "earnings_growth_change",
    label: "Earnings Growth Change",
    description: "Revenue and profit growth change under the assumption.",
    allowedAssumptionKeys: [
      "revenueGrowthDeltaPct",
      "profitGrowthDeltaPct",
    ],
    isPreset: true,
  },
  margin_change: {
    kind: "margin_change",
    label: "Margin Change",
    description: "Operating margin changes under the assumption.",
    allowedAssumptionKeys: [
      "operatingMarginDeltaPct",
    ],
    isPreset: true,
  },
  valuation_multiple_change: {
    kind: "valuation_multiple_change",
    label: "Valuation Multiple Change",
    description: "PE, PB, or EV/EBITDA multiple compresses or expands.",
    allowedAssumptionKeys: [
      "peMultipleDeltaPct",
      "pbMultipleDeltaPct",
      "evEbitdaDeltaPct",
    ],
    isPreset: true,
  },
  debt_change: {
    kind: "debt_change",
    label: "Debt Change",
    description: "Debt-to-equity ratio changes under the assumption.",
    allowedAssumptionKeys: [
      "debtToEquityDelta",
    ],
    isPreset: true,
  },
  interest_rate_pressure: {
    kind: "interest_rate_pressure",
    label: "Interest Rate Pressure",
    description: "Interest rate environment changes affect debt, valuation, and growth.",
    allowedAssumptionKeys: [
      "debtToEquityDelta",
      "peMultipleDeltaPct",
    ],
    isPreset: true,
  },
  sector_shock: {
    kind: "sector_shock",
    label: "Sector Shock",
    description: "Sector-wide valuation or growth change affects sector-relative context.",
    allowedAssumptionKeys: [
      "sectorMedianPeDeltaPct",
      "sectorGrowthDeltaPct",
    ],
    isPreset: true,
  },
  technical_regime_change: {
    kind: "technical_regime_change",
    label: "Technical Regime Change",
    description: "Price momentum or volatility shift changes timing context.",
    allowedAssumptionKeys: [
      "priceMomentumDeltaPct",
      "volatilityDeltaPct",
    ],
    isPreset: true,
  },
  risk_event: {
    kind: "risk_event",
    label: "Risk Event",
    description: "Hypothetical event or risk shock raises the risk score.",
    allowedAssumptionKeys: [
      "riskShockScoreDelta",
    ],
    isPreset: true,
  },
  custom: {
    kind: "custom",
    label: "Custom Scenario",
    description: "User-defined scenario with custom assumption values.",
    allowedAssumptionKeys: [
      "revenueGrowthDeltaPct",
      "profitGrowthDeltaPct",
      "operatingMarginDeltaPct",
      "debtToEquityDelta",
      "peMultipleDeltaPct",
      "pbMultipleDeltaPct",
      "evEbitdaDeltaPct",
      "priceMomentumDeltaPct",
      "volatilityDeltaPct",
      "sectorMedianPeDeltaPct",
      "sectorGrowthDeltaPct",
      "riskShockScoreDelta",
    ],
    isPreset: false,
  },
};

// ─── Severity metadata ────────────────────────────────────────────

export interface SeverityMeta {
  level: ScenarioSeverity;
  label: string;
  multiplier: number;
}

const SEVERITY_LEVELS: Record<ScenarioSeverity, SeverityMeta> = {
  mild: {
    level: "mild",
    label: "Mild",
    multiplier: 0.5,
  },
  moderate: {
    level: "moderate",
    label: "Moderate",
    multiplier: 1.0,
  },
  severe: {
    level: "severe",
    label: "Severe",
    multiplier: 2.0,
  },
  custom: {
    level: "custom",
    label: "Custom",
    multiplier: 1.0,
  },
};

// ─── Registry API ─────────────────────────────────────────────────

export const ScenarioRegistry = {
  /** Get metadata for a scenario kind */
  getKindMeta(kind: ScenarioKind): ScenarioKindMeta {
    return SCENARIO_KINDS[kind];
  },

  /** Get severity metadata */
  getSeverityMeta(severity: ScenarioSeverity): SeverityMeta {
    return SEVERITY_LEVELS[severity];
  },

  /** Get severity multiplier for scoring */
  getSeverityMultiplier(severity: ScenarioSeverity): number {
    return SEVERITY_LEVELS[severity].multiplier;
  },

  /** List all preset scenario kinds */
  listPresetKinds(): ScenarioKind[] {
    return Object.values(SCENARIO_KINDS)
      .filter((m) => m.isPreset)
      .map((m) => m.kind);
  },

  /** List all scenario kinds */
  listAllKinds(): ScenarioKind[] {
    return Object.keys(SCENARIO_KINDS) as ScenarioKind[];
  },

  /** Check if an assumption key is allowed for a scenario kind */
  isAssumptionAllowed(
    kind: ScenarioKind,
    key: keyof ScenarioAssumptions
  ): boolean {
    return SCENARIO_KINDS[kind].allowedAssumptionKeys.includes(key);
  },

  /** Validate a scenario input */
  validateInput(input: ScenarioInput): string[] {
    const errors: string[] = [];
    const meta = SCENARIO_KINDS[input.kind];

    if (!input.symbol?.trim()) {
      errors.push("symbol is required");
    }
    if (!input.userFacingName?.trim()) {
      errors.push("userFacingName is required");
    }
    if (!input.userFacingDescription?.trim()) {
      errors.push("userFacingDescription is required");
    }

    // For non-custom scenarios, check that only allowed assumptions are set
    if (input.kind !== "custom") {
      const allKeys = Object.keys(input.assumptions) as (keyof ScenarioAssumptions)[];
      for (const key of allKeys) {
        if (input.assumptions[key] != null && !meta.allowedAssumptionKeys.includes(key)) {
          errors.push(
            `assumption "${key}" is not allowed for scenario kind "${input.kind}"`
          );
        }
      }
    }

    return errors;
  },
};
