import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import type { MarketComposite } from "../market/marketService";

export type NeuralHealthometerState =
  | "Structurally Healthy"
  | "Stable Expansion"
  | "Confidence Improving"
  | "Momentum Sensitive"
  | "Volatility Exposed"
  | "Structurally Fragile";

export type NeuralScannerCategory =
  | "strongest_structural_health"
  | "institutional_confidence"
  | "defensive_stability"
  | "innovation_expansion"
  | "valuation_compression"
  | "earnings_consistency"
  | "long_term_resilience";

export type NeuralScannerCard = {
  id: string;
  category: NeuralScannerCategory;
  title: string;
  body: string;
};

export type NeuralSynthesisTimelineEntry = {
  id: string;
  whenLabel: string;
  text: string;
};

export type NeuralMarketNarrative = {
  editorialHeadline: string;
  cinematicBody: string;
  conditionsNote: string;
};

export type MacroGeopoliticalInterpretation = {
  headline: string;
  body: string;
};

export type NeuralMarketSynthesis = {
  // drives the whole “probabilistic environment” identity
  confidenceEnvironmentLabel: string;
  confidenceState: ConfidenceState;

  // Healthometer System (no recommendations)
  healthometer: {
    state: NeuralHealthometerState;
    rationale: string;
    confidenceMarginText: string;
  };

  // layered interpretations (all educational / probabilistic framing)
  macroGeopolitical: MacroGeopoliticalInterpretation;
  institutionalBehaviour: string;
  behaviouralPsychology: string;
  sectorRotationMatrix: string;
  liquidityIntelligenceCore: string;

  // future probability framing (NOT a prediction)
  futureProbabilityFramework: string;

  // timeline and scanner
  timeline: NeuralSynthesisTimelineEntry[];
  scannerCards: NeuralScannerCard[];

  // final narrative output for UI
  narrative: NeuralMarketNarrative;

  // for visual systems to sync tone
  theme: ConfidenceTheme;
  quality: "low" | "balanced" | "high";
  marketCompositeAt: number;
};

export type NeuralMarketSynthesisInputs = {
  market?: MarketComposite | null;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  narrativeKey: number;
  quality: "low" | "balanced" | "high";
};
