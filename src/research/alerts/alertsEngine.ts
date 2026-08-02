import type { AlertChangeView, AlertTone, ThesisStatus, RiskLevel } from "../contracts/productContracts";

export interface AlertTriggerInput {
  symbol: string;
  previousThesisStatus: ThesisStatus | null;
  currentThesisStatus: ThesisStatus;
  previousRiskLevel: RiskLevel | null;
  currentRiskLevel: RiskLevel;
  scoreChange: number | null;
  priceChangePercent: number | null;
  peerBecameMoreAttractive: boolean;
  hasResultEvent: boolean;
}

export function generateAlerts(input: AlertTriggerInput): AlertChangeView[] {
  const alerts: AlertChangeView[] = [];
  const base: Omit<AlertChangeView, "type" | "title" | "body"> = {
    id: `${input.symbol}-${Date.now()}`,
    symbol: input.symbol,
    timestamp: new Date().toISOString(),
    acknowledged: false,
  };

  if (input.previousThesisStatus && input.previousThesisStatus !== input.currentThesisStatus) {
    alerts.push({
      ...base,
      type: "thesis_change",
      title: `${input.symbol}: research thesis changed`,
      body: `Thesis moved from ${input.previousThesisStatus.toLowerCase()} to ${input.currentThesisStatus.toLowerCase()}.`,
    });
  }

  if (input.previousRiskLevel && input.previousRiskLevel !== input.currentRiskLevel) {
    const tone: AlertTone = input.currentRiskLevel === "High" ? "risk_change" : "valuation_change";
    alerts.push({
      ...base,
      type: tone,
      title: `${input.symbol}: risk level changed`,
      body: `Risk level changed from ${input.previousRiskLevel.toLowerCase()} to ${input.currentRiskLevel.toLowerCase()}.`,
    });
  }

  if (input.scoreChange !== null && Math.abs(input.scoreChange) >= 10) {
    alerts.push({
      ...base,
      type: "watchlist_review",
      title: `${input.symbol}: significant score change`,
      body: `Research score changed by ${input.scoreChange > 0 ? "+" : ""}${input.scoreChange} points. Review thesis.`,
    });
  }

  if (input.priceChangePercent !== null && Math.abs(input.priceChangePercent) >= 5) {
    alerts.push({
      ...base,
      type: "price_move",
      title: `${input.symbol}: price moved ${input.priceChangePercent > 0 ? "+" : ""}${input.priceChangePercent.toFixed(1)}%`,
      body: `Notable price movement detected. Review if thesis is still intact.`,
    });
  }

  if (input.peerBecameMoreAttractive) {
    alerts.push({
      ...base,
      type: "peer_change",
      title: `${input.symbol}: peer comparison changed`,
      body: `A peer company now has a stronger research case. Consider re-evaluating.`,
    });
  }

  if (input.hasResultEvent) {
    alerts.push({
      ...base,
      type: "event",
      title: `${input.symbol}: new result or event`,
      body: `New results or events detected. Review impact on thesis.`,
    });
  }

  return alerts;
}
