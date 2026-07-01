export type LensorySourceOfTruth =
  | "market_brain"
  | "healthometer"
  | "scanner_engine"
  | "compare_engine"
  | "watchlist_engine"
  | "alerts_engine"
  | "deterministic_fallback";

export interface SourceOfTruthPolicy {
  officialScoresAreDeterministic: true;
  localAiCanExplain: true;
  localAiCanComputeOfficialScores: false;
  localAiCanFetchMarketData: false;
  localAiCanPlaceOrders: false;
  localAiCanCreateRecommendations: false;
}

export const STOCKSTORY_SOURCE_OF_TRUTH_POLICY = Object.freeze({
  officialScoresAreDeterministic: true,
  localAiCanExplain: true,
  localAiCanComputeOfficialScores: false,
  localAiCanFetchMarketData: false,
  localAiCanPlaceOrders: false,
  localAiCanCreateRecommendations: false,
} satisfies SourceOfTruthPolicy);

const OFFICIAL_SOURCES = new Set<LensorySourceOfTruth>([
  "market_brain",
  "healthometer",
  "scanner_engine",
  "compare_engine",
  "watchlist_engine",
  "alerts_engine",
  "deterministic_fallback",
]);

export function isOfficialLensorySourceOfTruth(value: unknown): value is LensorySourceOfTruth {
  return typeof value === "string" && OFFICIAL_SOURCES.has(value as LensorySourceOfTruth);
}

export function canLocalAiComputeOfficialScores(): false {
  return STOCKSTORY_SOURCE_OF_TRUTH_POLICY.localAiCanComputeOfficialScores;
}
