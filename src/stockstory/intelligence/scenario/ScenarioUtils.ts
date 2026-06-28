/**
 * StockStory Scenario Utilities
 *
 * Deterministic helpers for scenario simulation math.
 * All functions are pure, evidence-bound, and NaN-safe.
 */

import type { ScenarioAssumptions, ScenarioOutput } from "./ScenarioTypes";
import { clampScore } from "../scoring";

// ─── Assumption bounding ──────────────────────────────────────────

/** Maximum allowed absolute delta for percentage-based assumptions */
const MAX_PCT_DELTA = 50;
const MAX_DEBT_DELTA = 2.0;
const MAX_RISK_DELTA = 30;

/** Bound a percentage delta to [-MAX, MAX] */
export function boundPctDelta(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(-MAX_PCT_DELTA, Math.min(MAX_PCT_DELTA, value));
}

/** Bound a debt-to-equity delta */
export function boundDebtDelta(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(-MAX_DEBT_DELTA, Math.min(MAX_DEBT_DELTA, value));
}

/** Bound a risk score delta */
export function boundRiskDelta(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(-MAX_RISK_DELTA, Math.min(MAX_RISK_DELTA, value));
}

/** Apply a bounded assumption delta to a base value, returning null if base is null */
export function applyDelta(
  baseValue: number | null | undefined,
  delta: number | null | undefined,
  isPercentage: boolean
): number | null {
  if (baseValue == null || !Number.isFinite(baseValue)) return null;
  if (delta == null || !Number.isFinite(delta)) return baseValue;
  if (isPercentage) {
    return baseValue + baseValue * (delta / 100);
  }
  return baseValue + delta;
}

// ─── Delta derivation from assumptions ────────────────────────────

export interface DerivedDeltas {
  revenueGrowthDelta: number | null;
  profitGrowthDelta: number | null;
  operatingMarginDelta: number | null;
  debtToEquityDelta: number | null;
  peMultipleDelta: number | null;
  pbMultipleDelta: number | null;
  evEbitdaDelta: number | null;
  priceMomentumDelta: number | null;
  volatilityDelta: number | null;
  sectorMedianPeDelta: number | null;
  sectorGrowthDelta: number | null;
  riskShockScoreDelta: number | null;
}

/** Extract bounded deltas from scenario assumptions */
export function deriveDeltas(assumptions: ScenarioAssumptions): DerivedDeltas {
  return {
    revenueGrowthDelta: boundPctDelta(assumptions.revenueGrowthDeltaPct),
    profitGrowthDelta: boundPctDelta(assumptions.profitGrowthDeltaPct),
    operatingMarginDelta: boundPctDelta(assumptions.operatingMarginDeltaPct),
    debtToEquityDelta: boundDebtDelta(assumptions.debtToEquityDelta),
    peMultipleDelta: boundPctDelta(assumptions.peMultipleDeltaPct),
    pbMultipleDelta: boundPctDelta(assumptions.pbMultipleDeltaPct),
    evEbitdaDelta: boundPctDelta(assumptions.evEbitdaDeltaPct),
    priceMomentumDelta: boundPctDelta(assumptions.priceMomentumDeltaPct),
    volatilityDelta: boundPctDelta(assumptions.volatilityDeltaPct),
    sectorMedianPeDelta: boundPctDelta(assumptions.sectorMedianPeDeltaPct),
    sectorGrowthDelta: boundPctDelta(assumptions.sectorGrowthDeltaPct),
    riskShockScoreDelta: boundRiskDelta(assumptions.riskShockScoreDelta),
  };
}

// ─── Score clamping ───────────────────────────────────────────────

/** Safely clamp a simulated score, handling NaN/Infinity */
export function safeSimulatedScore(score: number | null | undefined): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  return clampScore(score);
}

/** Compute score delta safely */
export function scoreDelta(
  base: number | null | undefined,
  simulated: number | null | undefined
): number | null {
  if (base == null || simulated == null) return null;
  if (!Number.isFinite(base) || !Number.isFinite(simulated)) return null;
  return Math.round((simulated - base) * 100) / 100;
}

// ─── Compliance checks ────────────────────────────────────────────

const FORBIDDEN_PHRASES = [
  "will definitely",
  "guaranteed return",
  "sure shot",
  "multibagger",
  "Buy now",
  "Strong Buy",
  "Sell immediately",
  "profit assured",
  "risk-free",
  "must buy",
  "must sell",
  "target guaranteed",
  "certain outcome",
  "forecast guaranteed",
  "price target",
  "target price",
];

/** Check text for forbidden phrases */
export function containsForbiddenLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}

/** Check that all output text fields are compliance-safe */
export function validateScenarioOutput(output: ScenarioOutput): string[] {
  const violations: string[] = [];
  const fieldsToCheck = [
    output.impact.thesisImpact,
    output.impact.valuationImpact,
    output.impact.earningsImpact,
    output.impact.financialImpact,
    output.impact.riskImpact,
    output.impact.technicalImpact,
    output.impact.sectorImpact,
    output.impact.peerImpact,
    ...output.watchNext,
    ...output.reviewTriggers,
    ...output.limitations,
  ];

  for (const field of fieldsToCheck) {
    if (typeof field !== "string") continue;
    if (containsForbiddenLanguage(field)) {
      violations.push(`Forbidden language found: "${field.substring(0, 80)}"`);
    }
  }

  return violations;
}

// ─── Confidence computation ───────────────────────────────────────

/** Compute scenario confidence based on data availability */
export function computeScenarioConfidence(
  baseScores: (number | null)[],
  simulatedScores: (number | null)[]
): number {
  const validBase = baseScores.filter((s) => s != null && Number.isFinite(s)).length;
  const validSim = simulatedScores.filter((s) => s != null && Number.isFinite(s)).length;
  const total = baseScores.length;
  if (total === 0) return 50;
  const ratio = (validBase + validSim) / (2 * total);
  return Math.round(ratio * 100);
}
