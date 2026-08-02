/**
 * Signal Scoring — Compute signal direction, strength, and score impact
 *
 * Given a signal template from the registry and numeric input data,
 * evaluates the signal and returns an IntelligenceSignal.
 */

import type {
  IntelligenceSignal,
  SignalTemplate,
  SignalDirection,
  SignalStrength,
} from "./SignalTypes";

export interface SignalEvalInput {
  symbol: string;
  /** Flat map of field values, e.g. { roe: 22.5, debtToEquity: 0.3 } */
  values: Record<string, number | null>;
}

export function evaluateSignal(
  template: SignalTemplate,
  input: SignalEvalInput,
): IntelligenceSignal {
  const direction = computeDirection(template, input.values);
  const strength = computeStrength(template, input.values);
  const scoreImpact = computeImpact(template, strength, direction);

  // Count evidence fields that are actually present
  const evidencePresent = template.requiredEvidence.filter(
    (f) => input.values[f] !== null && input.values[f] !== undefined
  );
  const evidenceCompleteness =
    template.requiredEvidence.length > 0
      ? evidencePresent.length / template.requiredEvidence.length
      : 0.5;

  const explanation = renderExplanation(template, input.values, strength);

  return {
    id: `${template.id}_${input.symbol}_${new Date().toISOString().slice(0, 10)}`,
    symbol: input.symbol,
    category: template.category,
    name: template.name,
    direction,
    strength,
    horizon: template.defaultHorizon,
    scoreImpact,
    confidence: clampConfidence(evidenceCompleteness * (strength !== "unknown" ? 0.8 : 0.3)),
    evidenceIds: evidencePresent.map((f) => `field:${f}`),
    generatedAt: new Date().toISOString(),
    asOf: new Date().toISOString().slice(0, 10),
    explanation,
  };
}

// ── Direction computation ─────────────────────────────────────

function computeDirection(
  template: SignalTemplate,
  values: Record<string, number | null>,
): SignalDirection {
  const rule = template.directionRule;
  const get = (field: string): number | null => values[field] ?? null;

  switch (rule.type) {
    case "threshold": {
      const v = get(rule.field);
      if (v === null) return "unknown";
      if (rule.positiveAbove !== undefined && v > rule.positiveAbove) return "positive";
      // Special case for low_debt_leader: positive when DEBT is below negativeBelow threshold
      if (rule.positiveAbove === undefined && rule.negativeBelow !== undefined && v < rule.negativeBelow) return "positive";
      if (rule.negativeBelow !== undefined && v < rule.negativeBelow) return "negative";
      if (rule.positiveAbove !== undefined && v < (rule.negativeBelow ?? 0)) return "negative";
      return "neutral";
    }
    case "comparison": {
      const a = get(rule.fieldA);
      const b = get(rule.fieldB);
      if (a === null || b === null) return "unknown";
      const aGreater = a > b;
      const isPositive = rule.positiveWhenGreater !== false ? aGreater : !aGreater;
      return isPositive ? "positive" : "negative";
    }
    case "boolean": {
      const v = get(rule.field);
      if (v === null) return "unknown";
      return v > 0 ? rule.trueValue : rule.falseValue;
    }
    case "trend": {
      const v = get(rule.field);
      if (v === null) return "unknown";
      return v > 0 ? rule.improving : rule.worsening;
    }
    case "custom":
      return rule.evaluate(values);
    default:
      return "unknown";
  }
}

// ── Strength computation ──────────────────────────────────────

function computeStrength(
  template: SignalTemplate,
  values: Record<string, number | null>,
): SignalStrength {
  const rule = template.strengthRule;
  const get = (field: string): number | null => values[field] ?? null;

  switch (rule.type) {
    case "zscore": {
      const v = get(rule.field);
      if (v === null) return "unknown";
      const abs = Math.abs(v);
      if (abs >= rule.thresholds.very_strong) return "very_strong";
      if (abs >= rule.thresholds.strong) return "strong";
      if (abs >= rule.thresholds.moderate) return "moderate";
      return "weak";
    }
    case "percentile": {
      const v = get(rule.field);
      if (v === null) return "unknown";
      if (v >= rule.thresholds.very_strong) return "very_strong";
      if (v >= rule.thresholds.strong) return "strong";
      if (v >= rule.thresholds.moderate) return "moderate";
      return "weak";
    }
    case "distance": {
      const v = get(rule.field);
      if (v === null) return "unknown";
      // Special handling for fields where lower = stronger
      // For debt, lower is stronger. For valuation relative to sector, higher premium = stronger signal.
      const distance = Math.abs(v - rule.referenceValue);
      if (distance >= rule.thresholds.very_strong) return "very_strong";
      if (distance >= rule.thresholds.strong) return "strong";
      if (distance >= rule.thresholds.moderate) return "moderate";
      return "weak";
    }
    case "custom":
      return rule.evaluate(values);
    default:
      return "unknown";
  }
}

// ── Impact computation ─────────────────────────────────────────

function computeImpact(
  template: SignalTemplate,
  strength: SignalStrength,
  direction: SignalDirection,
): number {
  const rule = template.impactRule;

  if (direction === "unknown" || direction === "neutral") return 0;

  if (rule.custom) {
    return rule.custom(strength, direction);
  }

  const strengthMultiplier =
    strength === "very_strong" ? 1.0
    : strength === "strong" ? 0.75
    : strength === "moderate" ? 0.5
    : strength === "weak" ? 0.25
    : 0.1;

  if (direction === "positive") {
    return Math.round(rule.maxPositive * strengthMultiplier * 100) / 100;
  }

  if (direction === "negative") {
    return Math.round(-rule.maxNegative * strengthMultiplier * 100) / 100;
  }

  return 0;
}

// ── Explanation rendering ─────────────────────────────────────

function renderExplanation(
  template: SignalTemplate,
  values: Record<string, number | null>,
  strength: SignalStrength,
): string {
  let text = template.explanationTemplate;

  for (const [key, val] of Object.entries(values)) {
    const placeholder = `{${key}}`;
    if (text.includes(placeholder) && val !== null && val !== undefined) {
      text = text.replaceAll(placeholder, formatValue(val));
    }
  }

  text = text.replace(/\{strength\}/g, strengthAdverb(strength));
  text = text.replace(/\{[^}]+\}/g, "—");

  return text;
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 100000) {
    return `${(v / 100000).toFixed(1)}L`;
  }
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(1);
}

function strengthAdverb(s: SignalStrength): string {
  switch (s) {
    case "very_strong": return " at a very high magnitude";
    case "strong": return " at a high level";
    case "moderate": return " at a moderate level";
    case "weak": return " at a low level";
    case "unknown": return "";
    default: return "";
  }
}

function clampConfidence(val: number): number {
  return Math.max(0, Math.min(1, Math.round(val * 100) / 100));
}
