import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";

export type FinancialSnapshot = {
  // Narrative-friendly inputs (missing fields are allowed)
  revenueGrowthPct?: number; // -..+ (interpretation: growth/slowdown)
  grossMarginPct?: number; // 0..100
  operatingMarginPct?: number; // 0..100

  // Efficiency / cash proxy
  freeCashFlowMarginPct?: number; // 0..100
  operatingExpenseGrowthPct?: number; // -..+ (interpretation: cost discipline)

  // Capital structure / solvency
  netDebtToEbitda?: number; // e.g. 0..10
  interestCoverage?: number; // e.g. 0..20+

  // Changes (if provided, they strengthen interpretive confidence)
  grossMarginDeltaPct?: number; // -..+
  operatingMarginDeltaPct?: number; // -..+
  fcfMarginDeltaPct?: number; // -..+
  debtDeltaPct?: number; // -..+
};

export type ManagementCommentary = {
  summary: string; // earnings commentary (editorial)
  guidance?: string; // forward-looking communication text (interpreted, not predicted)
  managementToneHints?: string[]; // optional pre-parsed hints (e.g. ["cautious", "efficiency-first"])
};

export type InstitutionalReaction = {
  // -1..1 (negative = cautious tone, positive = constructive tone)
  postEarningsTone?: number;

  // 0..1 (how “structured” the response feels; educational proxy)
  postEarningsVolumeQuality?: number;

  // 0..1 (how strongly liquidity participation supports interpretation)
  liquidityParticipation?: number;
};

export type LongTermStoryEntry = {
  id: string;
  whenLabel: string;
  text: string;
};

export type LongTermStoryState = {
  history: LongTermStoryEntry[];
  lastThemes?: string[];
};

export type EarningsNarrativeEngineOutput = {
  executiveNarrative: string;

  // Editorial “what changed” framing (no scores-only)
  keyOperationalChanges: string[];

  // 1) Business Quality Interpreter
  businessQualityNarrative: string;

  // 2) Management Tone Analysis
  managementToneNarrative: string;

  // 3) Institutional Reaction Layer
  institutionalReactionNarrative: string;

  // 4) Margin & Efficiency Environment
  marginAndEfficiencyNarrative: string;

  // 5) Guidance Interpretation System (interpret future-facing emphasis, not outcomes)
  guidanceInterpretationNarrative: string;

  // 6) Risk Evolution Layer
  riskEvolutionNarrative: string;
  riskFlags: string[];

  // 7) Long-Term Story Tracker
  longTermTimeline: LongTermStoryEntry[];

  // 8) Environment tie-in
  confidenceEnvironmentLabel: string;
};

export type CorporateStoryInputs = {
  confidenceState: ConfidenceState;

  // Required minimal inputs: commentary summary + financial snapshot.
  financial: FinancialSnapshot;
  management: ManagementCommentary;
  institutional: InstitutionalReaction;

  // Story key / stable seed so timeline feels consistent per session
  narrativeKey: number;

  // Optional existing long-term story state
  longTermState?: LongTermStoryState;
};
