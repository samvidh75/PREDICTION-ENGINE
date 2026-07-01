/**
 * Signal Types — Canonical intelligence signal definitions
 *
 * Every signal Lensory generates MUST conform to this contract.
 * Signals are evidence-bound: no evidence → low confidence or no signal.
 */

// ─── Primitive direction/strength types ──────────────────────────

export type SignalDirection = "positive" | "negative" | "mixed" | "neutral" | "unknown";

export type SignalStrength = "very_strong" | "strong" | "moderate" | "weak" | "unknown";

export type SignalHorizon = "short_term" | "medium_term" | "long_term" | "unknown";

// ─── Signal categories ───────────────────────────────────────────

export const SIGNAL_CATEGORIES = [
  "financial_quality",
  "growth",
  "valuation",
  "balance_sheet",
  "profitability",
  "earnings",
  "technical_momentum",
  "volatility",
  "news_event",
  "sector_context",
  "peer_relative",
  "governance",
  "ownership",
  "liquidity",
  "catalyst",
  "risk",
  "thesis_change",
  "anomaly",
  "opportunity",
] as const;

export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

// ─── Intelligence Signal ─────────────────────────────────────────

export interface IntelligenceSignal {
  /** Unique signal ID, e.g. "high_roe_RELIANCE_2026-06-28" */
  id: string;

  /** Stock symbol */
  symbol: string;

  /** Signal category */
  category: SignalCategory;

  /** Human-readable signal name, e.g. "High Return on Equity" */
  name: string;

  /** Direction of the signal */
  direction: SignalDirection;

  /** Strength of the signal */
  strength: SignalStrength;

  /** Expected time horizon for this signal to resolve */
  horizon: SignalHorizon;

  /** Impact on composite score (-20 to +20) */
  scoreImpact: number;

  /** Confidence in this signal (0-1) */
  confidence: number;

  /** Evidence IDs backing this signal */
  evidenceIds: string[];

  /** When this signal was generated */
  generatedAt: string;

  /** The as-of date for the underlying data */
  asOf: string | null;

  /** Product-facing explanation */
  explanation: string;

  /** Internal metadata (never exposed to users) */
  internalMetadata?: Record<string, unknown>;
}

// ─── Signal template (used to define signals in registry) ────────

export interface SignalTemplate {
  id: string;
  category: SignalCategory;
  name: string;
  /** How to determine direction from factor scores */
  directionRule: SignalDirectionRule;
  /** How to determine strength */
  strengthRule: SignalStrengthRule;
  /** How to compute score impact */
  impactRule: SignalImpactRule;
  /** Default horizon */
  defaultHorizon: SignalHorizon;
  /** Required evidence fields */
  requiredEvidence: string[];
  /** Explanation template with {variable} placeholders */
  explanationTemplate: string;
}

export type SignalDirectionRule =
  | { type: "threshold"; field: string; positiveAbove?: number; negativeBelow?: number }
  | { type: "comparison"; fieldA: string; fieldB: string; positiveWhenGreater?: boolean }
  | { type: "boolean"; field: string; trueValue: SignalDirection; falseValue: SignalDirection }
  | { type: "trend"; field: string; improving: SignalDirection; worsening: SignalDirection }
  | { type: "custom"; evaluate: (inputs: Record<string, number | null>) => SignalDirection };

export type SignalStrengthRule =
  | { type: "zscore"; field: string; thresholds: { very_strong: number; strong: number; moderate: number } }
  | { type: "percentile"; field: string; thresholds: { very_strong: number; strong: number; moderate: number } }
  | { type: "distance"; field: string; referenceValue: number; thresholds: { very_strong: number; strong: number; moderate: number } }
  | { type: "custom"; evaluate: (inputs: Record<string, number | null>) => SignalStrength };

export interface SignalImpactRule {
  maxPositive: number;
  maxNegative: number;
  scaleWithStrength: boolean;
  custom?: (strength: SignalStrength, direction: SignalDirection) => number;
}
