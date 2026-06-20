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
  backendLabel?: string | null;
}

import { normalizeNumericValue } from "./factorNormalization";

export function buildHealthometerViewModel(
  quality: number | null | undefined,
  valuation: number | null | undefined,
  growth: number | null | undefined,
  stability: number | null | undefined,
  risk: number | null | undefined,
  momentum: number | null | undefined,
  financialStrength?: number | null | undefined
): HealthometerViewState {
  const qNorm = normalizeNumericValue(quality);
  const vNorm = normalizeNumericValue(valuation);
  const gNorm = normalizeNumericValue(growth);
  const sNorm = normalizeNumericValue(stability);
  const rNorm = normalizeNumericValue(risk);
  const mNorm = normalizeNumericValue(momentum);
  const fsNorm = normalizeNumericValue(financialStrength);

  const inputScores = [qNorm, vNorm, gNorm, sNorm, rNorm, mNorm, fsNorm];
  const validScores = inputScores.filter((s): s is number => s !== null && s !== undefined && !Number.isNaN(s) && Number.isFinite(s) && !Number.isNaN(s));

  const overallScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  const totalDimensionCount = 7;
  const overallStatus = validScores.length === totalDimensionCount
    ? "Complete"
    : validScores.length > 0
      ? "Partial research context"
      : "Not enough information for this view yet";

  const getDimensionStatus = (s: number | null | undefined): "verified" | "partial" | "insufficient" => {
    if (s === null || s === undefined || Number.isNaN(s) || !Number.isFinite(s)) {
      return "insufficient";
    }
    return "verified";
  };

  const dims: Array<{ id: string; label: string; score: number | null }> = [
    { id: "quality", label: "Business quality", score: qNorm },
    { id: "financial_strength", label: "Financial strength", score: fsNorm },
    { id: "valuation", label: "Valuation context", score: vNorm },
    { id: "growth", label: "Growth", score: gNorm },
    { id: "stability", label: "Stability", score: sNorm },
    { id: "risk", label: "Risk context", score: rNorm },
    { id: "momentum", label: "Momentum", score: mNorm },
  ];

  const dimensions: HealthometerDimension[] = dims.map((d) => ({
    ...d,
    status: getDimensionStatus(d.score),
    color: "#64748B",
  }));

  return {
    overallScore,
    overallStatus,
    dimensions,
  };
}
