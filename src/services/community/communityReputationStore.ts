import type { CommunityQualityCategory } from "./communityQualityEngine";

export type CommunityReputationStoredV1 = {
  educationalContributionsCount?: number;
  // Backwards/alt keys (if any other code wrote them differently)
  educationalContributions?: number;
  educationalContributionCount?: number;

  analysisScoreAvg?: number;
  /**
   * Number of analyses/messages that contributed to analysisScoreAvg.
   * Added in V2 to keep a stable running average.
   */
  analysisContributionsCount?: number;

  trustIndex?: number;
  updatedAt?: number;
};

export const COMMUNITY_REPUTATION_UPDATED_EVENT = "community_reputation_updated";
const STORAGE_KEY = "community_reputation_v1";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function normalizeAnalysisScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Heuristic: accept common scales.
  // - 0..1 => fraction
  // - 0..10 => scaled score
  // - 0..100 => percent score
  const normalized = value <= 1 ? value : value <= 10 ? value / 10 : value / 100;
  return clamp01(normalized);
}

export function computeTrustIndex(args: {
  educationalContributionsCount: number;
  analysisScoreAvgValue: number;
}): number {
  const eduCount = Math.max(0, Math.floor(args.educationalContributionsCount || 0));
  const score01 = normalizeAnalysisScore(args.analysisScoreAvgValue);

  // Diminishing returns: early contributions matter more.
  const eduComponent = 1 - Math.exp(-eduCount / 6);

  // Blend: analysis quality stays primary, learning contributes stability.
  const overall01 = 0.55 * score01 + 0.45 * eduComponent;

  return Math.round(overall01 * 100);
}

export function readCommunityReputation(): CommunityReputationStoredV1 | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CommunityReputationStoredV1;
  } catch {
    return null;
  }
}

export function writeCommunityReputation(next: CommunityReputationStoredV1): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore write errors (private mode, storage full, etc.)
  }
}

function dispatchReputationUpdated(next: CommunityReputationStoredV1): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMUNITY_REPUTATION_UPDATED_EVENT, { detail: next }));
}

export function updateCommunityReputationOnMessage(args: {
  /**
   * CommunityQualityEngine `analysis.score`.
   * Important: this is a *risk likelihood* in [0..1] where higher = more problematic.
   * Trust should reward quality, so we convert it to quality = 1 - risk.
   */
  analysisScore: number;
  category: CommunityQualityCategory;
}): CommunityReputationStoredV1 | null {
  if (typeof window === "undefined") return null;

  const stored = readCommunityReputation();

  const educationalContributionsCount =
    (stored?.educationalContributionsCount ??
      stored?.educationalContributions ??
      stored?.educationalContributionCount ??
      0) + (args.category === "EDUCATIONAL" ? 1 : 0);

  const prevAvgQuality = stored?.analysisScoreAvg;
  const prevCountRaw = stored?.analysisContributionsCount;

  // If older store didn't include a count, assume 1 if an average existed.
  const prevCount =
    typeof prevCountRaw === "number" && Number.isFinite(prevCountRaw)
      ? Math.max(0, Math.floor(prevCountRaw))
      : isFiniteNumber(prevAvgQuality)
        ? 1
        : 0;

  const risk01 = isFiniteNumber(args.analysisScore) ? normalizeAnalysisScore(args.analysisScore) : 0;
  const nextAvgQualityScore = 1 - risk01;

  const nextCount = prevCount + 1;

  const nextAvgQuality =
    nextCount <= 0
      ? nextAvgQualityScore
      : (clamp01(prevAvgQuality ?? nextAvgQualityScore) * prevCount + nextAvgQualityScore) / nextCount;

  const nextTrust = computeTrustIndex({
    educationalContributionsCount,
    analysisScoreAvgValue: nextAvgQuality,
  });

  const next: CommunityReputationStoredV1 = {
    ...(stored || {}),
    educationalContributionsCount,
    // Store *quality* average (so higher = more trusted).
    analysisScoreAvg: nextAvgQuality,
    analysisContributionsCount: nextCount,
    trustIndex: nextTrust,
    updatedAt: Date.now(),
  };

  writeCommunityReputation(next);
  dispatchReputationUpdated(next);

  return next;
}
