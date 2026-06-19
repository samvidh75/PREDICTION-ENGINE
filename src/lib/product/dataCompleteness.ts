import { hasBackendVocabulary, hasProductForbiddenTerms, hasForbiddenTradingLanguage, hasRenderGarbage } from "../compliance/forbiddenCopyAudit";

export interface SectionCompleteness {
  hasData: boolean;
  fieldCount: number;
  totalPossible: number;
  label: "Sufficient" | "Partial" | "Limited";
  fallbackCopy: string | null;
}

function countNonNull(values: (number | null | undefined)[]): number {
  return values.filter((v) => v !== null && v !== undefined && Number.isFinite(v)).length;
}

const POSSIBLE_FINANCIALS = 5;
const POSSIBLE_VALUATION = 4;
const POSSIBLE_RISK = 4;
const POSSIBLE_PEER = 3;
const POSSIBLE_HISTORY = 2;

export function getFinancialCompleteness(
  grossMargin: number | null,
  operatingMargin: number | null,
  netMargin: number | null,
  roe: number | null,
  roic: number | null,
): SectionCompleteness {
  const values = [grossMargin, operatingMargin, netMargin, roe, roic];
  const present = countNonNull(values);
  return makeCompleteness(present, POSSIBLE_FINANCIALS, "Financial data");
}

export function getValuationCompleteness(
  peRatio: number | null,
  pbRatio: number | null,
  evEbitda: number | null,
  dividendYield: number | null,
): SectionCompleteness {
  const values = [peRatio, pbRatio, evEbitda, dividendYield];
  const present = countNonNull(values);
  return makeCompleteness(present, POSSIBLE_VALUATION, "Valuation context");
}

export function getRiskCompleteness(
  debtToEquity: number | null,
  currentRatio: number | null,
  volatilityScore: number | null,
): SectionCompleteness {
  const values = [debtToEquity, currentRatio, volatilityScore];
  const present = countNonNull(values);
  return makeCompleteness(present, POSSIBLE_RISK, "Risk assessment");
}

export function getPeerCompleteness(peerCount: number): SectionCompleteness {
  return makeCompleteness(peerCount, POSSIBLE_PEER, "Peer context");
}

export function getHistoryCompleteness(snapshotCount: number): SectionCompleteness {
  return makeCompleteness(snapshotCount, POSSIBLE_HISTORY, "Historical context");
}

function makeCompleteness(present: number, total: number, label: string): SectionCompleteness {
  if (present === 0) {
    return { hasData: false, fieldCount: 0, totalPossible: total, label: "Limited", fallbackCopy: `${label} is limited for this company.` };
  }
  if (present <= total / 3) {
    return { hasData: true, fieldCount: present, totalPossible: total, label: "Limited", fallbackCopy: null };
  }
  if (present <= (total * 2) / 3) {
    return { hasData: true, fieldCount: present, totalPossible: total, label: "Partial", fallbackCopy: null };
  }
  return { hasData: true, fieldCount: present, totalPossible: total, label: "Sufficient", fallbackCopy: null };
}

export function usesForbiddenTerms(text: string): string | null {
  return hasBackendVocabulary(text) || hasProductForbiddenTerms(text) || hasForbiddenTradingLanguage(text) || null;
}

export function hasRenderIssues(text: string): string | null {
  return hasRenderGarbage(text);
}
