export type CanonicalResearchLabel =
  | "High conviction"
  | "Watch"
  | "Stable"
  | "Needs review"
  | "Risk rising"
  | "Thesis improving"
  | "Not enough information"
  | "Partial research context";

export interface CanonicalResearchState {
  symbol: string;
  score: number | null;
  label: CanonicalResearchLabel;
  reason: string;
  confidence: number;
  engineState: number;
  sourceEngine: string;
  dataAsOf: string | null;
}

export interface EngineResearchSnapshot {
  engineName: string;
  score: number | null;
  label: string;
  dataAsOf: string | null;
  freshnessDays: number | null;
}

export interface ResearchConflict {
  engines: EngineResearchSnapshot[];
  maxScoreDelta: number;
  labelMismatch: boolean;
  resolution: CanonicalResearchLabel;
}
