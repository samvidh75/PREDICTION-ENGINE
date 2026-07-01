/**
 * Lensory Scenario Intelligence — Canonical Contracts
 *
 * Defines scenario kinds, severity levels, input/output models
 * for the stock-agnostic scenario simulation layer.
 *
 * Compliance: All outputs are labeled "research_only" — no forecast certainty.
 */

// ─── Scenario classification ──────────────────────────────────────

export type ScenarioKind =
  | "base_case"
  | "bull_case"
  | "bear_case"
  | "earnings_growth_change"
  | "margin_change"
  | "valuation_multiple_change"
  | "debt_change"
  | "interest_rate_pressure"
  | "sector_shock"
  | "technical_regime_change"
  | "risk_event"
  | "custom";

export type ScenarioSeverity =
  | "mild"
  | "moderate"
  | "severe"
  | "custom";

export type ScenarioThesisState =
  | "thesis_improving"
  | "thesis_stable"
  | "thesis_weakening"
  | "risk_rising"
  | "needs_review"
  | "avoid_for_now"
  | "insufficient_information";

export type ScenarioSimulatedThesisState =
  | "thesis_may_improve"
  | "thesis_may_remain_intact"
  | "thesis_may_weaken"
  | "risk_may_rise"
  | "review_triggered"
  | "insufficient_information";

export type ScenarioComplianceLabel = "research_only";

// ─── Scenario assumptions ─────────────────────────────────────────

export interface ScenarioAssumptions {
  revenueGrowthDeltaPct?: number | null;
  profitGrowthDeltaPct?: number | null;
  operatingMarginDeltaPct?: number | null;
  debtToEquityDelta?: number | null;
  peMultipleDeltaPct?: number | null;
  pbMultipleDeltaPct?: number | null;
  evEbitdaDeltaPct?: number | null;
  priceMomentumDeltaPct?: number | null;
  volatilityDeltaPct?: number | null;
  sectorMedianPeDeltaPct?: number | null;
  sectorGrowthDeltaPct?: number | null;
  riskShockScoreDelta?: number | null;
}

// ─── Scenario input ───────────────────────────────────────────────

export interface ScenarioInput {
  id: string;
  symbol: string;
  kind: ScenarioKind;
  severity: ScenarioSeverity;
  assumptions: ScenarioAssumptions;
  createdAt: string;
  userFacingName: string;
  userFacingDescription: string;
}

// ─── Scenario impact ──────────────────────────────────────────────

export interface ScenarioImpact {
  baseScore: number | null;
  simulatedScore: number | null;
  scoreDelta: number | null;
  baseThesisState: ScenarioThesisState;
  simulatedThesisState: ScenarioSimulatedThesisState;
  thesisImpact: string;
  valuationImpact: string;
  earningsImpact: string;
  financialImpact: string;
  riskImpact: string;
  technicalImpact: string;
  sectorImpact: string;
  peerImpact: string;
}

// ─── Scenario output ──────────────────────────────────────────────

export interface ScenarioOutput {
  id: string;
  symbol: string;
  generatedAt: string;
  scenarioName: string;
  scenarioDescription: string;
  impact: ScenarioImpact;
  watchNext: string[];
  reviewTriggers: string[];
  limitations: string[];
  confidence: number;
  complianceLabel: ScenarioComplianceLabel;
}

// ─── Peer scenario comparison ─────────────────────────────────────

export interface PeerScenarioResult {
  symbol: string;
  companyName: string;
  baseScore: number | null;
  simulatedScore: number | null;
  scoreDelta: number | null;
  resilience: string;
  limitation: boolean;
  limitationReason?: string;
}

export interface PeerScenarioComparison {
  target: PeerScenarioResult;
  peers: PeerScenarioResult[];
  strongestPeer: string | null;
  weakestPeer: string | null;
  relativeResilience: string;
  limitations: string[];
}

// ─── Portfolio stress test ────────────────────────────────────────

export interface TrackedCompanyStress {
  symbol: string;
  companyName: string;
  baseScore: number | null;
  simulatedScore: number | null;
  scoreDelta: number | null;
  thesisImpact: string;
  riskLevel: string;
  isVulnerable: boolean;
  isResilient: boolean;
}

export interface PortfolioStressOutput {
  trackedCompanies: TrackedCompanyStress[];
  mostAffected: string[];
  mostResilient: string[];
  risksToReview: string[];
  limitations: string[];
}

// ─── Scenario validation ──────────────────────────────────────────

export interface ScenarioValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Evidence-bound simulation traits ─────────────────────────────

export interface SimulationTrait {
  key: string;
  baseValue: number | null;
  deltaApplied: number | null;
  simulatedValue: number | null;
  evidenceBound: boolean;
  limitation: string | null;
}
