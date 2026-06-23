import type {
  CanonicalResearchState,
  CanonicalResearchLabel,
  EngineResearchSnapshot,
  ResearchConflict,
} from "../../../shared/research/CanonicalResearchStateTypes";

function labelToNumeric(label: string): number {
  const map: Record<string, number> = {
    "High conviction": 100,
    "Very Healthy": 90,
    "Watch": 75,
    "Healthy": 70,
    "Stable": 65,
    "Strengthening": 60,
    "Thesis improving": 60,
    "Needs review": 35,
    "Risk rising": 20,
    "Weakening": 15,
    "Not enough information": 10,
    "Insufficient data": 5,
    "Research signals pending": 0,
  };
  return map[label] ?? 0;
}

function numericToLabel(score: number | null): CanonicalResearchLabel {
  if (score === null) return "Not enough information";
  if (score >= 80) return "High conviction";
  if (score >= 60) return "Watch";
  if (score >= 40) return "Needs review";
  if (score >= 20) return "Risk rising";
  return "Not enough information";
}

function detectConflict(snapshots: EngineResearchSnapshot[]): ResearchConflict | null {
  if (snapshots.length < 2) return null;

  const labels = snapshots.map(s => s.label);
  const numericLabels = labels.map(l => labelToNumeric(l));
  const maxDelta = Math.max(...numericLabels) - Math.min(...numericLabels);
  const labelMismatch = new Set(labels).size > 1;

  if (!labelMismatch && maxDelta <= 15) return null;

  const newest = [...snapshots].sort((a, b) => {
    if (!a.dataAsOf) return 1;
    if (!b.dataAsOf) return -1;
    return new Date(b.dataAsOf).getTime() - new Date(a.dataAsOf).getTime();
  })[0];

  const resolution = (() => {
    if (maxDelta > 50) return "Partial research context";
    if (labelMismatch) return "Needs review";
    const avg = numericLabels.reduce((a, b) => a + b, 0) / numericLabels.length;
    return numericToLabel(Math.round(avg));
  })() as CanonicalResearchLabel;

  return {
    engines: snapshots,
    maxScoreDelta: maxDelta,
    labelMismatch,
    resolution,
  };
}

export function resolveCanonicalResearchState(
  symbol: string,
  engineSnapshots: EngineResearchSnapshot[],
): CanonicalResearchState {
  if (engineSnapshots.length === 0) {
    return {
      symbol,
      score: null,
      label: "Not enough information",
      reason: "No research engine has processed this company yet.",
      confidence: 0,
      engineState: 0,
      sourceEngine: "none",
      dataAsOf: null,
    };
  }

  const conflict = detectConflict(engineSnapshots);

  if (conflict) {
    const avgScore = Math.round(
      engineSnapshots.reduce((s, e) => s + (e.score ?? 0), 0) / engineSnapshots.length
    );

    return {
      symbol,
      score: avgScore,
      label: conflict.resolution,
      reason: conflict.labelMismatch
        ? "Engines disagree on this company's research context."
        : "Research context is being reconciled across engines.",
      confidence: Math.max(0, 100 - conflict.maxScoreDelta),
      engineState: conflict.maxScoreDelta,
      sourceEngine: "reconciled",
      dataAsOf: engineSnapshots.filter(s => s.dataAsOf).map(s => s.dataAsOf).sort().reverse()[0] ?? null,
    };
  }

  const sorted = [...engineSnapshots].sort((a, b) => {
    if (!a.freshnessDays) return 1;
    if (!b.freshnessDays) return -1;
    return a.freshnessDays - b.freshnessDays;
  });

  const best = sorted[0];

  return {
    symbol,
    score: best.score,
    label: numericToLabel(best.score),
    reason: `Based on ${best.engineName} analysis.`,
    confidence: 90,
    engineState: 1,
    sourceEngine: best.engineName,
    dataAsOf: best.dataAsOf,
  };
}
