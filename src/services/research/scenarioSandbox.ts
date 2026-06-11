export interface ScenarioInput {
  growthScore: number | null;
  qualityScore: number | null;
  stabilityScore: number | null;
  valuationScore: number | null;
  momentumScore: number | null;
  riskScore: number | null;
  revenueShockPct: number;
  marginShockPct: number;
  rateShockBps: number;
}

export interface ScenarioResult {
  adjustedScore: number | null;
  changedBy: number | null;
  explanation: string;
}

export function runScenario(input: ScenarioInput): ScenarioResult {
  const baseParts = [input.growthScore, input.qualityScore, input.stabilityScore, input.valuationScore, input.momentumScore];
  if (baseParts.some((value) => typeof value !== "number")) {
    return { adjustedScore: null, changedBy: null, explanation: "Scenario unavailable because required factor scores are missing." };
  }
  const base = (
    input.growthScore! * 0.25 +
    input.qualityScore! * 0.25 +
    input.stabilityScore! * 0.2 +
    input.momentumScore! * 0.15 +
    input.valuationScore! * 0.15
  );
  const shock =
    input.revenueShockPct * 0.18 +
    input.marginShockPct * 0.22 -
    (input.rateShockBps / 100) * 0.8 -
    ((input.riskScore ?? 50) - 50) * 0.04;
  const adjustedScore = Math.max(0, Math.min(100, Math.round(base + shock)));
  return {
    adjustedScore,
    changedBy: Number((adjustedScore - base).toFixed(1)),
    explanation: "Counterfactual estimate based only on displayed factor scores and user-entered shocks.",
  };
}
