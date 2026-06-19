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

export function buildHealthometerViewModel(
  quality: number | null | undefined,
  valuation: number | null | undefined,
  growth: number | null | undefined,
  stability: number | null | undefined,
  risk: number | null | undefined,
  momentum: number | null | undefined
): HealthometerViewState {
  const inputScores = [quality, valuation, growth, stability, risk, momentum];
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
    { id: "quality", label: "Business quality", score: quality ?? null, status: getDimensionStatus(quality), color: colorForScore(quality ?? null) },
    { id: "valuation", label: "Valuation context", score: valuation ?? null, status: getDimensionStatus(valuation), color: colorForScore(valuation ?? null) },
    { id: "growth", label: "Growth", score: growth ?? null, status: getDimensionStatus(growth), color: colorForScore(growth ?? null) },
    { id: "stability", label: "Stability", score: stability ?? null, status: getDimensionStatus(stability), color: colorForScore(stability ?? null) },
    { id: "risk", label: "Risk context", score: risk ?? null, status: getDimensionStatus(risk), color: colorForScore(risk ?? null) },
    { id: "momentum", label: "Momentum", score: momentum ?? null, status: getDimensionStatus(momentum), color: colorForScore(momentum ?? null) },
  ];

  return {
    overallScore,
    overallStatus,
    dimensions,
  };
}
