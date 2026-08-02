import type { NeuralSynthesisTimelineEntry } from "../synthesis/neuralMarketSynthesisTypes";
import type { FinancialSnapshot } from "../earnings/earningsTypes";
import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";
import type { MarketInputs } from "../intelligence/marketState";
import type { HealthometerCategoryEvaluation } from "./healthometerCategoryEngine";
import { computeHealthometerCategoryEvaluation } from "./healthometerCategoryEngine";

type Inputs = {
  marketInputs: MarketInputs;
  financial?: FinancialSnapshot | null;
  sector?: {
    sectorMomentum: number;
    institutionalParticipation: number;
    liquidityBreadth: number;
  } | null;
  narrativeKey: number;
  confidenceState: ConfidenceState;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function sectorRelativeStrengthNoteFromCategoryEvaluation(evaln: HealthometerCategoryEvaluation): string {
  const sectorCat = evaln.categories.find((c) => c.id === "sector_relative_strength");
  if (!sectorCat) {
    return "Sector-relative context is interpreted as a learning lens; category signals are unavailable for this read.";
  }

  const score = clamp01(sectorCat.score01);
  const tone = sectorCat.tone;

  const prefix =
    tone === "historically_strong" || tone === "resilient" || tone === "healthy"
      ? "Sector-relative strength appears comparatively supportive"
      : tone === "strengthening" || tone === "improving"
        ? "Sector-relative strength appears to be strengthening"
        : tone === "balanced"
          ? "Sector-relative strength looks mixed"
          : tone === "pressured" || tone === "weakening"
            ? "Sector-relative strength appears more timing-sensitive"
            : "Sector-relative strength is interpreted conservatively";

  return `${prefix}. Educational context: the lens frames how quickly narratives may become responsive to sector participation, without claiming outcomes. (Context score: ${Math.round(score * 100)}%)`;
}

export function historicalHealthTimelineFromCategoryEvaluation(
  evaln: HealthometerCategoryEvaluation,
  narrativeKey: number,
): NeuralSynthesisTimelineEntry[] {
  const seed = narrativeKey % 1000;

  const overall = clamp01(evaln.overallScore01);
  const volCat = evaln.categories.find((c) => c.id === "volatility_profile");
  const histCat = evaln.categories.find((c) => c.id === "historical_consistency");

  const volText = volCat
    ? volCat.tone === "historically_strong" || volCat.tone === "resilient" || volCat.tone === "healthy"
      ? "Volatility pacing is comparatively stable, so historical context can be read with calmer margins."
      : volCat.tone === "pressured" || volCat.tone === "weakening"
        ? "Volatility pacing looks more sensitive, so historical context is treated as a stricter learning boundary."
        : "Volatility pacing is mixed, so interpretation uses bounded continuity language."
    : "Volatility pacing is treated as an interpretive boundary (category inputs unavailable).";

  const histText = histCat
    ? histCat.tone === "historically_strong" || histCat.tone === "resilient"
      ? "Historical consistency supports a continuity-first reading: patterns are used as context, not as certainty."
      : histCat.tone === "pressured" || histCat.tone === "weakening"
        ? "Historical consistency looks less stable, so interpretation emphasizes confirmation cycles and avoids certainty framing."
        : "Historical consistency is mixed: the lens stays educational and probabilistic."
    : "Historical consistency is treated as educational context (category inputs unavailable).";

  const overallText =
    overall >= 0.72
      ? "Overall category composite reads as comparatively resilient."
      : overall >= 0.50
        ? "Overall category composite reads as guardedly balanced."
        : "Overall category composite reads as sensitive to context.";

  return [
    {
      id: `ht_${seed}_1`,
      whenLabel: "Historical continuity boundary",
      text: `${overallText} ${histText} (Reminder: this is interpretive context; not a guarantee.)`,
    },
    {
      id: `ht_${seed}_2`,
      whenLabel: "Volatility pacing evolution",
      text: `How “calm vs sensitive” interpretation feels is derived from volatility profiling. ${volText}`,
    },
    {
      id: `ht_${seed}_3`,
      whenLabel: "Category lens stability note",
      text: "When category signals align, the engine keeps language bounded and calm. When signals conflict, it leans toward guarded educational framing.",
    },
  ];
}

export function buildHealthometerIntelligence(inputs: Inputs): {
  categoryEvaluation: HealthometerCategoryEvaluation;
  sectorRelativeStrengthNote: string;
  historicalHealthTimeline: NeuralSynthesisTimelineEntry[];
} {
  const categoryEvaluation = computeHealthometerCategoryEvaluation({
    marketInputs: inputs.marketInputs,
    financial: inputs.financial ?? null,
    sector: inputs.sector ?? null,
    narrativeKey: inputs.narrativeKey,
  });

  const sectorRelativeStrengthNote = sectorRelativeStrengthNoteFromCategoryEvaluation(categoryEvaluation);
  const historicalHealthTimeline = historicalHealthTimelineFromCategoryEvaluation(categoryEvaluation, inputs.narrativeKey);

  return {
    categoryEvaluation,
    sectorRelativeStrengthNote,
    historicalHealthTimeline,
  };
}
