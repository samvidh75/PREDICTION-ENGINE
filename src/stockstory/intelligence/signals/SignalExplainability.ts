/**
 * Signal Explainability — Product-facing signal explanations
 *
 * Converts raw IntelligenceSignals into consumer-facing descriptions
 * with compliance-safe language, no Buy/Sell recommendations, and
 * clear signal strength indicators.
 */

import type { IntelligenceSignal, SignalDirection, SignalStrength } from "./SignalTypes";

export interface SignalExplanation {
  signalId: string;
  headline: string;
  body: string;
  directionLabel: string;
  shouldHighlight: boolean;
  /** "positive", "negative", or "neutral" for UX iconography */
  icon: "up" | "down" | "neutral" | "warning";
}

export function explainSignal(signal: IntelligenceSignal): SignalExplanation {
  const headline = buildHeadline(signal);
  const body = signal.explanation;
  const directionLabel = directionToLabel(signal.direction);
  const shouldHighlight =
    signal.direction !== "neutral" && signal.direction !== "unknown" &&
    (signal.strength === "very_strong" || signal.strength === "strong");
  const icon = directionToIcon(signal.direction, signal.strength);

  return { signalId: signal.id, headline, body, directionLabel, shouldHighlight, icon };
}

export function explainSignals(signals: IntelligenceSignal[]): SignalExplanation[] {
  return signals.map(explainSignal);
}

// ── Headline builders ──────────────────────────────────────────

function buildHeadline(signal: IntelligenceSignal): string {
  const prefix = strengthPrefix(signal.strength);
  const suffix = directionSuffix(signal.direction);

  return `${prefix}${signal.name}${suffix}`;
}

function strengthPrefix(strength: SignalStrength): string {
  switch (strength) {
    case "very_strong": return "Very Strong — ";
    case "strong": return "Strong — ";
    case "moderate": return "";
    case "weak": return "Mild — ";
    case "unknown": return "";
    default: return "";
  }
}

function directionSuffix(direction: SignalDirection): string {
  switch (direction) {
    case "positive": return " (Positive)";
    case "negative": return " (Needs Review)";
    case "mixed": return " (Mixed)";
    case "neutral": return " (Neutral)";
    case "unknown": return " (Data Limited)";
    default: return "";
  }
}

function directionToLabel(direction: SignalDirection): string {
  switch (direction) {
    case "positive": return "Positive signal";
    case "negative": return "Needs review";
    case "mixed": return "Mixed signals";
    case "neutral": return "Neutral";
    case "unknown": return "Limited data";
    default: return "";
  }
}

function directionToIcon(direction: SignalDirection, strength: SignalStrength): SignalExplanation["icon"] {
  if (direction === "unknown" || strength === "unknown") return "warning";
  if (direction === "positive") return "up";
  if (direction === "negative") return "down";
  return "neutral";
}

// ── Summary helpers ───────────────────────────────────────────

export function signalSummary(signals: IntelligenceSignal[]): {
  totalSignals: number;
  positiveSignals: number;
  negativeSignals: number;
  highConfidenceSignals: number;
  scoreImpact: number;
} {
  const positiveSignals = signals.filter((s) => s.direction === "positive").length;
  const negativeSignals = signals.filter((s) => s.direction === "negative").length;
  const highConfidenceSignals = signals.filter((s) => s.confidence >= 0.7).length;

  const scoreImpact = signals.reduce((sum, s) => sum + s.scoreImpact, 0);

  return {
    totalSignals: signals.length,
    positiveSignals,
    negativeSignals,
    highConfidenceSignals,
    scoreImpact: Math.round(scoreImpact * 100) / 100,
  };
}
