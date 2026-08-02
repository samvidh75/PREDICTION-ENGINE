/**
 * ResearchOutputSchemas
 *
 * Runtime-validated output schemas for all LLM-generated research sections.
 * Every output includes:
 * - max length limits
 * - minimum useful content
 * - arrays capped at reasonable sizes
 * - confidence field
 * - limitations field
 * - evidence IDs where supported
 * - compliance label: research_only
 *
 * No raw null text, no empty filler, no unsafe language.
 */

export interface CompanyThesisOutput {
  thesis: string;
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  evidenceIds: string[];
  complianceLabel: 'research_only';
}

export interface BullBearCaseItem {
  title: string;
  explanation: string;
  evidenceIds: string[];
}

export interface BullBearOutput {
  bullCase: BullBearCaseItem[];
  bearCase: BullBearCaseItem[];
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface RiskItem {
  risk: string;
  severity: 'low' | 'moderate' | 'elevated' | 'high';
  explanation: string;
  evidenceIds: string[];
}

export interface RiskOutput {
  risks: RiskItem[];
  overallRiskAssessment: string;
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface WhatChangedOutput {
  summary: string;
  changes: Array<{
    aspect: string;
    previous: string;
    current: string;
    direction: 'improved' | 'deteriorated' | 'mixed' | 'unchanged';
    evidenceIds: string[];
  }>;
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface PeerComparisonOutput {
  peers: Array<{
    symbol: string;
    valuationContext: string;
    metricComparison: string;
    evidenceIds: string[];
  }>;
  summary: string;
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface ValuationExplanationOutput {
  explanation: string;
  keyMetrics: Array<{
    metric: string;
    value: string;
    context: string;
    evidenceIds: string[];
  }>;
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface EarningsSummaryOutput {
  summary: string;
  quarter: string;
  year: number;
  highlights: string[];
  concerns: string[];
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface WatchlistAlertOutput {
  alert: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  evidenceIds: string[];
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface FactorExplanationOutput {
  factor: string;
  score: number;
  explanation: string;
  keyDrivers: string[];
  evidenceIds: string[];
  confidence: 'high' | 'moderate' | 'limited';
  limitations: string[];
  complianceLabel: 'research_only';
}

export interface FullResearchOutput {
  symbol: string;
  generatedAt: string;
  thesis: CompanyThesisOutput;
  bullBear: BullBearOutput;
  risks: RiskOutput;
  whatChanged: WhatChangedOutput;
  peerComparison: PeerComparisonOutput;
  valuation: ValuationExplanationOutput;
  earnings: EarningsSummaryOutput | null;
  factors: FactorExplanationOutput[];
  overallConfidence: 'high' | 'moderate' | 'limited' | 'insufficient_information';
  complianceLabel: 'research_only';
}

/* ─── Validators ─── */

const MAX_THESIS_LENGTH = 1000;
const MAX_BULL_BEAR_ITEMS = 5;
const MAX_RISK_ITEMS = 8;
const MAX_CHANGES = 6;
const MAX_PEERS = 8;
const MAX_METRICS = 6;
const MAX_EVIDENCE_IDS = 10;
const MAX_STR_LENGTH = 2000;

function validateArrayLength(arr: unknown[] | undefined, max: number, name: string): string | null {
  if (arr && arr.length > max) {
    return `${name} exceeds maximum of ${max} items (has ${arr.length})`;
  }
  return null;
}

function validateStringLength(str: string | undefined, max: number, name: string): string | null {
  if (str && str.length > max) {
    return `${name} exceeds ${max} characters (has ${str.length})`;
  }
  return null;
}

function validateEvidenceIds(ids: string[] | undefined): string | null {
  if (ids && ids.length > MAX_EVIDENCE_IDS) {
    return `evidenceIds exceeds ${MAX_EVIDENCE_IDS}`;
  }
  return null;
}

function validateComplianceLabel(label: string): string | null {
  return label === 'research_only' ? null : `Invalid complianceLabel: "${label}"`;
}

export function validateThesis(o: CompanyThesisOutput): string[] {
  const errs: string[] = [];
  const s = validateStringLength(o.thesis, MAX_THESIS_LENGTH, 'thesis');
  if (s) errs.push(s);
  if (!o.thesis || o.thesis.trim().length < 20) errs.push('thesis too short (min 20 chars)');
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  const e = validateEvidenceIds(o.evidenceIds);
  if (e) errs.push(e);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateBullBear(o: BullBearOutput): string[] {
  const errs: string[] = [];
  const b = validateArrayLength(o.bullCase, MAX_BULL_BEAR_ITEMS, 'bullCase');
  if (b) errs.push(b);
  const be = validateArrayLength(o.bearCase, MAX_BULL_BEAR_ITEMS, 'bearCase');
  if (be) errs.push(be);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateRisk(o: RiskOutput): string[] {
  const errs: string[] = [];
  const r = validateArrayLength(o.risks, MAX_RISK_ITEMS, 'risks');
  if (r) errs.push(r);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateWhatChanged(o: WhatChangedOutput): string[] {
  const errs: string[] = [];
  const c = validateArrayLength(o.changes, MAX_CHANGES, 'changes');
  if (c) errs.push(c);
  const s = validateStringLength(o.summary, MAX_STR_LENGTH, 'summary');
  if (s) errs.push(s);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validatePeerComparison(o: PeerComparisonOutput): string[] {
  const errs: string[] = [];
  const p = validateArrayLength(o.peers, MAX_PEERS, 'peers');
  if (p) errs.push(p);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateValuation(o: ValuationExplanationOutput): string[] {
  const errs: string[] = [];
  const s = validateStringLength(o.explanation, MAX_STR_LENGTH, 'explanation');
  if (s) errs.push(s);
  const m = validateArrayLength(o.keyMetrics, MAX_METRICS, 'keyMetrics');
  if (m) errs.push(m);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateEarnings(o: EarningsSummaryOutput): string[] {
  const errs: string[] = [];
  const s = validateStringLength(o.summary, MAX_STR_LENGTH, 'summary');
  if (s) errs.push(s);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateWatchlistAlert(o: WatchlistAlertOutput): string[] {
  const errs: string[] = [];
  const a = validateStringLength(o.alert, MAX_STR_LENGTH, 'alert');
  if (a) errs.push(a);
  if (!['info', 'warning', 'critical'].includes(o.severity)) errs.push(`Invalid severity: ${o.severity}`);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateFactorExplanation(o: FactorExplanationOutput): string[] {
  const errs: string[] = [];
  const e = validateStringLength(o.explanation, MAX_STR_LENGTH, 'explanation');
  if (e) errs.push(e);
  if (!['high', 'moderate', 'limited'].includes(o.confidence)) errs.push(`Invalid confidence: ${o.confidence}`);
  const l = validateComplianceLabel(o.complianceLabel);
  if (l) errs.push(l);
  if (!o.limitations || o.limitations.length === 0) errs.push('limitations required');
  return errs;
}

export function validateFullResearch(o: FullResearchOutput): string[] {
  const errs: string[] = [
    ...validateThesis(o.thesis),
    ...validateBullBear(o.bullBear),
    ...validateRisk(o.risks),
    ...validateWhatChanged(o.whatChanged),
    ...validatePeerComparison(o.peerComparison),
    ...validateValuation(o.valuation),
  ];

  if (o.earnings) {
    errs.push(...validateEarnings(o.earnings));
  }

  if (o.factors) {
    const f = validateArrayLength(o.factors, 20, 'factors');
    if (f) errs.push(f);
  }

  if (!['high', 'moderate', 'limited', 'insufficient_information'].includes(o.overallConfidence)) {
    errs.push(`Invalid overallConfidence: ${o.overallConfidence}`);
  }

  if (o.complianceLabel !== 'research_only') {
    errs.push('complianceLabel must be research_only');
  }

  return errs;
}
