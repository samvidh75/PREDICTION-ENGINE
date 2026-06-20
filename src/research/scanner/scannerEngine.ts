import type { ScannerResultView } from "../contracts/productContracts";
import type { ResearchConvictionScore } from "../engine/researchEngine";
import { computeResearchConviction } from "../engine/researchEngine";

export type ScannerPreset =
  | "Quality compounders"
  | "Undervalued quality"
  | "Improving momentum"
  | "Low debt leaders"
  | "Earnings acceleration"
  | "Dividend stability"
  | "Risk rising"
  | "Turnaround watch"
  | "Good businesses out of favour"
  | "High quality, expensive";

export interface ScannerCompanyInput {
  symbol: string;
  companyName: string;
  sector: string | null;
  scores: Record<string, number | null>;
}

export interface ScannerPresetDefinition {
  id: ScannerPreset;
  requiredFeatures: string[];
  weightAdjustment: Record<string, number>;
  explanation: string;
  riskCaveat: string;
}

export const SCANNER_PRESETS: Record<ScannerPreset, ScannerPresetDefinition> = {
  "Quality compounders": {
    id: "Quality compounders", requiredFeatures: ["quality", "stability"],
    weightAdjustment: { quality: 0.40, stability: 0.20, growth: 0.15, valuation: 0.10, momentum: 0.10, risk: 0.05 },
    explanation: "Companies with strong and consistent quality metrics",
    riskCaveat: "Quality premium may already be priced in",
  },
  "Undervalued quality": {
    id: "Undervalued quality", requiredFeatures: ["quality", "valuation"],
    weightAdjustment: { quality: 0.30, valuation: 0.30, growth: 0.10, risk: 0.15, momentum: 0.10, stability: 0.05 },
    explanation: "Quality businesses trading at attractive valuations",
    riskCaveat: "Value traps possible — verify thesis before investing",
  },
  "Improving momentum": {
    id: "Improving momentum", requiredFeatures: ["momentum", "growth"],
    weightAdjustment: { momentum: 0.35, growth: 0.25, quality: 0.15, valuation: 0.10, risk: 0.10, stability: 0.05 },
    explanation: "Companies with improving price momentum and growth trajectory",
    riskCaveat: "Momentum can reverse quickly — monitor thesis regularly",
  },
  "Low debt leaders": {
    id: "Low debt leaders", requiredFeatures: ["quality", "risk"],
    weightAdjustment: { risk: 0.35, quality: 0.25, stability: 0.15, growth: 0.10, valuation: 0.10, momentum: 0.05 },
    explanation: "Companies with strong balance sheets and low leverage",
    riskCaveat: "Low debt alone does not guarantee returns",
  },
  "Earnings acceleration": {
    id: "Earnings acceleration", requiredFeatures: ["growth", "momentum"],
    weightAdjustment: { growth: 0.40, momentum: 0.20, quality: 0.15, valuation: 0.10, risk: 0.10, stability: 0.05 },
    explanation: "Companies showing accelerating earnings growth",
    riskCaveat: "Growth may not be sustainable — verify earnings quality",
  },
  "Dividend stability": {
    id: "Dividend stability", requiredFeatures: ["quality", "stability"],
    weightAdjustment: { stability: 0.30, quality: 0.25, risk: 0.20, valuation: 0.15, growth: 0.05, momentum: 0.05 },
    explanation: "Companies with consistent dividend-paying ability",
    riskCaveat: "Past dividend stability does not guarantee future payments",
  },
  "Risk rising": {
    id: "Risk rising", requiredFeatures: ["risk"],
    weightAdjustment: { risk: 0.40, quality: 0.20, stability: 0.15, valuation: 0.10, growth: 0.10, momentum: 0.05 },
    explanation: "Companies showing elevated risk indicators",
    riskCaveat: "Higher risk companies need closer thesis monitoring",
  },
  "Turnaround watch": {
    id: "Turnaround watch", requiredFeatures: ["risk", "valuation"],
    weightAdjustment: { risk: 0.30, valuation: 0.25, momentum: 0.15, quality: 0.10, growth: 0.10, stability: 0.10 },
    explanation: "Companies that may be undergoing a turnaround",
    riskCaveat: "Turnarounds are uncertain — track before investing",
  },
  "Good businesses out of favour": {
    id: "Good businesses out of favour", requiredFeatures: ["quality", "valuation"],
    weightAdjustment: { quality: 0.35, valuation: 0.25, risk: 0.15, stability: 0.10, growth: 0.10, momentum: 0.05 },
    explanation: "Quality businesses facing temporary headwinds",
    riskCaveat: "Ensure headwinds are truly temporary before investing",
  },
  "High quality, expensive": {
    id: "High quality, expensive", requiredFeatures: ["quality", "valuation"],
    weightAdjustment: { quality: 0.40, valuation: 0.15, growth: 0.15, stability: 0.10, risk: 0.10, momentum: 0.10 },
    explanation: "Premium quality companies trading at premium valuations",
    riskCaveat: "Valuation premium leaves limited margin of safety",
  },
};

export function runScanner(
  preset: ScannerPreset,
  companies: ScannerCompanyInput[],
): ScannerResultView[] {
  const definition = SCANNER_PRESETS[preset];

  const scored = companies.map((c, idx) => {
    const conviction = computeResearchConviction(c.scores, definition.weightAdjustment);
    return buildScannerResult(c, conviction, idx + 1, definition);
  });

  return scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map((r, idx) => ({ ...r, rank: idx + 1 }));
}

function buildScannerResult(
  input: ScannerCompanyInput,
  conviction: ResearchConvictionScore,
  rank: number,
  definition: ScannerPresetDefinition,
): ScannerResultView {
  const requiredPresent = definition.requiredFeatures.every(f => input.scores[f] !== null);

  if (!requiredPresent || conviction.overallScore === null) {
    return {
      symbol: input.symbol, companyName: input.companyName, sector: input.sector,
      rank, conviction: "Research signals pending", score: null,
      oneLineThesis: "Research signals pending for this preset.",
      keyReason: "Not enough information for this preset.",
      riskMarker: null,
    };
  }

  const convictionLabel = conviction.overallScore >= 75 ? "Very Healthy" : conviction.overallScore >= 55 ? "Healthy" : conviction.overallScore >= 35 ? "Unhealthy" : "Very Unhealthy";

  return {
    symbol: input.symbol, companyName: input.companyName, sector: input.sector,
    rank, conviction: convictionLabel, score: conviction.overallScore,
    oneLineThesis: buildOneLiner(conviction, definition),
    keyReason: conviction.topContributors[0] ?? definition.explanation,
    riskMarker: definition.riskCaveat,
  };
}

function buildOneLiner(conviction: ResearchConvictionScore, definition: ScannerPresetDefinition): string {
  const top = conviction.topContributors;
  if (top.length === 0) return definition.explanation;
  return `${definition.explanation}: ${top.slice(0, 2).join(", ")}.`;
}
