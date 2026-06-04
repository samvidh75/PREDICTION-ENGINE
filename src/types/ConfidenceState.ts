export type ConfidenceState =
  | "CONFIDENCE_RISING"
  | "STABLE_CONVICTION"
  | "NEUTRAL_ENVIRONMENT"
  | "MOMENTUM_WEAKENING"
  | "ELEVATED_RISK";

export type ConfidenceEnvironment = {
  state: ConfidenceState;

  // Friendly/UX label (no probabilistic language)
  label: string;

  // Soft interpretation string (no certainty)
  summary: string;
};
