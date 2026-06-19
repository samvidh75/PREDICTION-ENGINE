import type { ThesisSnapshot, ResearchChangeEvent } from "./workspaceModels";

export const changeDetection = {
  detectChanges(prior: ThesisSnapshot | null, current: ThesisSnapshot): ResearchChangeEvent[] {
    if (!prior) {
      return [{
        symbol: current.symbol,
        type: "no_prior_snapshot",
        previousLabel: null,
        currentLabel: current.signalLabel,
        previousScore: null,
        currentScore: current.score,
        details: ["Tracking begins now — first snapshot recorded."],
        timestamp: new Date().toISOString(),
      }];
    }

    const events: ResearchChangeEvent[] = [];
    const details: string[] = [];

    if (prior.score !== current.score) {
      events.push({
        symbol: current.symbol,
        type: "signal_changed",
        previousLabel: prior.signalLabel,
        currentLabel: current.signalLabel,
        previousScore: prior.score,
        currentScore: current.score,
        details: [],
        timestamp: new Date().toISOString(),
      });
      details.push(`Research score changed from ${prior.score ?? "—"} to ${current.score ?? "—"}.`);
    }

    if (prior.riskScore !== current.riskScore && current.riskScore !== null && current.riskScore < 40) {
      events.push({
        symbol: current.symbol,
        type: "risk_rising",
        previousLabel: prior.signalLabel,
        currentLabel: current.signalLabel,
        previousScore: prior.riskScore,
        currentScore: current.riskScore,
        details: [],
        timestamp: new Date().toISOString(),
      });
      details.push("Risk indicators changed — review before proceeding.");
    }

    const factorChanged =
      prior.qualityScore !== current.qualityScore ||
      prior.growthScore !== current.growthScore ||
      prior.valuationScore !== current.valuationScore ||
      prior.momentumScore !== current.momentumScore;

    if (factorChanged && events.length === 0) {
      events.push({
        symbol: current.symbol,
        type: "factor_changed",
        previousLabel: prior.signalLabel,
        currentLabel: current.signalLabel,
        previousScore: prior.score,
        currentScore: current.score,
        details: [],
        timestamp: new Date().toISOString(),
      });
      details.push("Factor scores changed — thesis may need review.");
    }

    if (events.length === 0) {
      events.push({
        symbol: current.symbol,
        type: "thesis_needs_review",
        previousLabel: prior.signalLabel,
        currentLabel: current.signalLabel,
        previousScore: prior.score,
        currentScore: current.score,
        details: ["No significant change detected since last review."],
        timestamp: new Date().toISOString(),
      });
    }

    return events;
  },
};
