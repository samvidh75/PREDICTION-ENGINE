import type { CompanyFactorScoresView, CompanyThesisView, ThesisStatus, RiskLevel } from "../../research/contracts/productContracts";

export type ResearchSignalLabel =
  | "Very Healthy"
  | "Healthy"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Research signals pending";

export type SignalTone = "constructive" | "neutral" | "caution" | "severe";

export type SignalAction = "Research deeper" | "Compare first" | "Track thesis" | "Review risks" | "Continue with broker";

export interface ResearchSignalView {
  score: number | null;
  confidence: number;
  label: ResearchSignalLabel;
  tone: SignalTone;
  summary: string | null;
  topDrivers: string[];
  topRisks: string[];
  missingInputs: string[];
  dataSufficiency: "Sufficient" | "Partial" | "Insufficient";
  updatedAt: string | null;
  action: SignalAction;
}

function computeLabel(score: number | null, confidence: number, riskScore: number | null): { label: ResearchSignalLabel; tone: SignalTone; action: SignalAction } {
  if (score === null || confidence === 0) {
    return { label: "Research signals pending", tone: "neutral", action: "Continue with broker" };
  }

  if (riskScore !== null && riskScore < 25) {
    return { label: "Very Unhealthy", tone: "severe", action: "Review risks" };
  }

  if (riskScore !== null && riskScore < 40) {
    return { label: "Unhealthy", tone: "caution", action: "Review risks" };
  }

  if (score >= 75 && confidence >= 60) {
    return { label: "Very Healthy", tone: "constructive", action: "Research deeper" };
  }

  if (score >= 55 && confidence >= 40) {
    return { label: "Healthy", tone: "constructive", action: "Research deeper" };
  }

  if (score >= 40) {
    return { label: "Unhealthy", tone: "neutral", action: "Track thesis" };
  }

  if (score >= 25) {
    return { label: "Very Unhealthy", tone: "caution", action: "Review risks" };
  }

  return { label: "Unhealthy", tone: "neutral", action: "Compare first" };
}

export function computeResearchSignal(
  factorScores: CompanyFactorScoresView | null,
  thesis: CompanyThesisView | null,
): ResearchSignalView {
  if (!factorScores) {
    return {
      score: null,
      confidence: 0,
      label: "Research signals pending",
      tone: "neutral",
      summary: "Research signals pending — not enough data inputs for a reliable research case.",
      topDrivers: [],
      topRisks: [],
      missingInputs: ["Factor scores not available"],
      dataSufficiency: "Insufficient",
      updatedAt: null,
      action: "Continue with broker",
    };
  }

  const scores: number[] = [
    factorScores.qualityScore,
    factorScores.growthScore,
    factorScores.stabilityScore,
    factorScores.momentumScore,
    factorScores.valuationScore,
  ].filter((s): s is number => s !== null);

  const riskScore = factorScores.riskScore;
  const presentCount = scores.length + (riskScore !== null ? 1 : 0);

  if (presentCount === 0) {
    return {
      score: null,
      confidence: 0,
      label: "Research signals pending",
      tone: "neutral",
      summary: "Research signals pending — insufficient data to generate a research case.",
      topDrivers: [],
      topRisks: [],
      missingInputs: ["All factor scores unavailable"],
      dataSufficiency: "Insufficient",
      updatedAt: null,
      action: "Continue with broker",
    };
  }

  if (presentCount < 3) {
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const confidence = Math.round((presentCount / 6) * 100);
    const { label, tone, action } = computeLabel(avg, confidence, riskScore);
    return {
      score: avg,
      confidence,
      label,
      tone,
      summary: avg !== null ? `Research score based on ${presentCount} available factors.` : "Research signals pending — not enough data inputs for a reliable research case.",
      topDrivers: [],
      topRisks: [],
      missingInputs: ["Additional factor scores would improve confidence"],
      dataSufficiency: "Partial",
      updatedAt: null,
      action,
    };
  }

  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const confidence = Math.round((presentCount / 6) * 100);

  const driverMap: Record<string, { label: string; score: number | null }> = {
    quality: { label: "Quality", score: factorScores.qualityScore },
    growth: { label: "Growth", score: factorScores.growthScore },
    stability: { label: "Stability", score: factorScores.stabilityScore },
    momentum: { label: "Momentum", score: factorScores.momentumScore },
    valuation: { label: "Valuation", score: factorScores.valuationScore },
  };

  const sorted = Object.values(driverMap)
    .filter((d) => d.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const topDrivers = sorted.slice(0, 2).map((d) => `${d.label} is a key contributor`);
  const topRisks = sorted
    .filter((d) => d.score !== null && d.score < 40)
    .slice(0, 2)
    .map((d) => `${d.label} concerns`);

  if (riskScore !== null && riskScore < 40) {
    topRisks.push("Risk profile elevated");
  }

  const { label, tone, action } = computeLabel(avgScore, confidence, riskScore);

  const summary =
    label === "Very Healthy"
      ? `Strong research case supported by multiple factors.`
      : label === "Healthy"
        ? `Moderate research case with identifiable strengths and risks.`
        : label === "Unhealthy"
          ? `Below-average metrics or elevated risk indicators detected — review before proceeding.`
          : label === "Very Unhealthy"
            ? `Significant risk concerns identified. Exercise caution.`
            : "Research signals pending — not enough data inputs for a reliable research case.";

  const missingInputs: string[] = [];
  if (factorScores.qualityScore === null) missingInputs.push("Quality score");
  if (factorScores.growthScore === null) missingInputs.push("Growth score");
  if (factorScores.stabilityScore === null) missingInputs.push("Stability score");
  if (factorScores.momentumScore === null) missingInputs.push("Momentum score");
  if (factorScores.valuationScore === null) missingInputs.push("Valuation score");
  if (factorScores.riskScore === null) missingInputs.push("Risk score");

  return {
    score: avgScore,
    confidence,
    label,
    tone,
    summary,
    topDrivers,
    topRisks,
    missingInputs,
    dataSufficiency: missingInputs.length === 0 ? "Sufficient" : "Partial",
    updatedAt: null,
    action,
  };
}

export function signalToneToStatusColor(tone: SignalTone): string {
  switch (tone) {
    case "constructive": return "#16A34A";
    case "neutral": return "#2962FF";
    case "caution": return "#F59E0B";
    case "severe": return "#EF4444";
  }
}

export function signalToneToBgClass(tone: SignalTone): string {
  switch (tone) {
    case "constructive": return "bg-[rgba(22,163,74,0.12)] border-[rgba(22,163,74,0.2)] text-[#16A34A]";
    case "neutral": return "bg-[rgba(41,98,255,0.12)] border-[rgba(41,98,255,0.2)] text-[#2962FF]";
    case "caution": return "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.2)] text-[#F59E0B]";
    case "severe": return "bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.2)] text-[#EF4444]";
  }
}

export function toneToSeverityClass(tone: SignalTone): string {
  switch (tone) {
    case "constructive": return "status-dot-active";
    case "neutral": return "status-dot-active";
    case "caution": return "status-dot-partial";
    case "severe": return "status-dot-blocked";
  }
}
