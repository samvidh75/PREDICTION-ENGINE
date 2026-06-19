import type { WatchlistThesisView, ThesisStatus } from "../contracts/productContracts";

export interface ThesisTrackingInput {
  symbol: string;
  companyName: string;
  currentScore: number | null;
  previousScore: number | null;
  factorChanges: string[];
  riskChanges: string[];
  lastUpdated: string | null;
}

export function trackThesis(input: ThesisTrackingInput): WatchlistThesisView {
  const { symbol, companyName, currentScore, previousScore, lastUpdated } = input;

  if (currentScore === null) {
    return {
      symbol, companyName, currentStatus: "Research signals pending",
      previousStatus: null, conviction: "Needs research",
      score: null, lastUpdated,
    };
  }

  let currentStatus: ThesisStatus;
  let conviction: string;

  if (currentScore >= 75) {
    conviction = "High conviction";
    currentStatus = "Strengthening";
  } else if (currentScore >= 55) {
    conviction = "Moderate conviction";
    currentStatus = previousScore !== null ? (currentScore > previousScore + 5 ? "Strengthening" : "Stable") : "Tracking begins now";
  } else if (currentScore >= 35) {
    conviction = "Needs review";
    currentStatus = previousScore !== null ? (currentScore < previousScore - 5 ? "Weakening" : "Needs review") : "Tracking begins now";
  } else {
    conviction = "Track before investing";
    currentStatus = "Weakening";
  }

  if (input.riskChanges.length > 0 && (currentStatus === "Stable" || currentStatus === "Strengthening")) {
    currentStatus = "Needs review";
  }

  let previousStatus: ThesisStatus | null = null;
  if (previousScore !== null) {
    if (previousScore >= 75) previousStatus = "Strengthening";
    else if (previousScore >= 55) previousStatus = "Stable";
    else if (previousScore >= 35) previousStatus = "Needs review";
    else previousStatus = "Weakening";
  }

  return {
    symbol, companyName, currentStatus, previousStatus,
    conviction, score: currentScore, lastUpdated,
  };
}
