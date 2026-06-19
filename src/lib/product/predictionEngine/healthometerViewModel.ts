export interface HealthometerDimension {
  id: string;
  label: string;
  score: number | null;
  status: "verified" | "partial" | "insufficient";
  color: string;
}

export interface HealthometerViewState {
  overallScore: number | null;
  overallStatus: "Complete" | "Partial research context" | "Not enough information for this view yet";
  dimensions: HealthometerDimension[];
}

import { normalizeNumericValue } from "./factorNormalization";

export function buildHealthometerViewModel(
  quality: number | null | undefined,
  valuation: number | null | undefined,
  growth: number | null | undefined,
  stability: number | null | undefined,
  risk: number | null | undefined,
  momentum: number | null | undefined
): HealthometerViewState {
  const qNorm = normalizeNumericValue(quality);
  const vNorm = normalizeNumericValue(valuation);
  const gNorm = normalizeNumericValue(growth);
  const sNorm = normalizeNumericValue(stability);
  const rNorm = normalizeNumericValue(risk);
  const mNorm = normalizeNumericValue(momentum);

  const inputScores = [qNorm, vNorm, gNorm, sNorm, rNorm, mNorm];
  const validScores = inputScores.filter((s): s is number => s !== null && s !== undefined && !Number.isNaN(s) && Number.isFinite(s));

  const overallScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  const overallStatus = validScores.length === 6
    ? "Complete"
    : validScores.length > 0
      ? "Partial research context"
      : "Not enough information for this view yet";

  const colorForScore = (s: number | null): string => {
    if (s === null) return "#64748B";
    if (s >= 75) return "#16A34A";
    if (s >= 50) return "#2962FF";
    if (s >= 35) return "#F59E0B";
    return "#EF4444";
  };

  const getDimensionStatus = (s: number | null | undefined): "verified" | "partial" | "insufficient" => {
    if (s === null || s === undefined || Number.isNaN(s) || !Number.isFinite(s)) {
      return "insufficient";
    }
    return "verified";
  };

  const dimensions: HealthometerDimension[] = [
    { id: "quality", label: "Business quality", score: qNorm, status: getDimensionStatus(qNorm), color: colorForScore(qNorm) },
    { id: "valuation", label: "Valuation context", score: vNorm, status: getDimensionStatus(vNorm), color: colorForScore(vNorm) },
    { id: "growth", label: "Growth", score: gNorm, status: getDimensionStatus(gNorm), color: colorForScore(gNorm) },
    { id: "stability", label: "Stability", score: sNorm, status: getDimensionStatus(sNorm), color: colorForScore(sNorm) },
    { id: "risk", label: "Risk context", score: rNorm, status: getDimensionStatus(rNorm), color: colorForScore(rNorm) },
    { id: "momentum", label: "Momentum", score: mNorm, status: getDimensionStatus(mNorm), color: colorForScore(mNorm) },
  ];

  return {
    overallScore,
    overallStatus,
    dimensions,
  };
}
