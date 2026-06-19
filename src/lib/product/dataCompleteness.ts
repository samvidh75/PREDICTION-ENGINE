import type { CompanyFinancialSnapshot, FinancialMetricGroup } from "./financialDataModel";

// === Pre-existing completeness functions ===

interface CompletenessResult {
  hasData: boolean;
  label: string;
  fallbackCopy: string;
}

export function getFinancialCompleteness(
  revenueGrowth: number | null,
  profitGrowth: number | null,
  epsGrowth: number | null,
  pe: number | null,
  pb: number | null,
): CompletenessResult {
  const present = [revenueGrowth, profitGrowth, epsGrowth, pe, pb].filter((v) => v !== null).length;
  if (present >= 4) return { hasData: true, label: "Sufficient", fallbackCopy: "Good financial context available for this company." };
  if (present >= 2) return { hasData: true, label: "Partial", fallbackCopy: "Limited financial context available for this company." };
  return { hasData: false, label: "Limited", fallbackCopy: "Limited financial context available for this company." };
}

export function getValuationCompleteness(
  pe: number | null,
  pb: number | null,
  evEbitda: number | null,
  dividendYield: number | null,
): CompletenessResult {
  const present = [pe, pb, evEbitda, dividendYield].filter((v) => v !== null).length;
  if (present >= 3) return { hasData: true, label: "Sufficient", fallbackCopy: "Valuation context available." };
  if (present >= 1) return { hasData: true, label: "Partial", fallbackCopy: "Valuation context is limited for this company." };
  return { hasData: false, label: "Limited", fallbackCopy: "Valuation context is limited for this company." };
}

export function getRiskCompleteness(
  debtToEquity: number | null,
  currentRatio: number | null,
  interestCoverage: number | null,
): CompletenessResult {
  const present = [debtToEquity, currentRatio, interestCoverage].filter((v) => v !== null).length;
  if (present >= 2) return { hasData: true, label: "Sufficient", fallbackCopy: "Risk factors available." };
  if (present >= 1) return { hasData: true, label: "Partial", fallbackCopy: "Risk information is limited for this company." };
  return { hasData: false, label: "Limited", fallbackCopy: "Risk information is limited for this company." };
}

export function getPeerCompleteness(count: number): CompletenessResult {
  if (count > 0) return { hasData: true, label: "Sufficient", fallbackCopy: "Peer comparison available." };
  return { hasData: false, label: "Limited", fallbackCopy: "Peer comparison context is not currently available." };
}

export function getHistoryCompleteness(count: number): CompletenessResult {
  if (count > 0) return { hasData: true, label: "Sufficient", fallbackCopy: "Historical data available." };
  return { hasData: false, label: "Limited", fallbackCopy: "Historical data is not currently available for this company." };
}

// === New data completeness layer ===

export function hasUsefulFinancials(snapshot: CompanyFinancialSnapshot | null): boolean {
  if (!snapshot) return false;
  return snapshot.groups.some((g) => g.metrics.some((m) => m.value !== null));
}

export function hasUsefulValuation(snapshot: CompanyFinancialSnapshot | null): boolean {
  if (!snapshot?.valuation) return false;
  const v = snapshot.valuation;
  return v.peRatio?.value !== null || v.pbRatio?.value !== null || v.evEbitda?.value !== null || v.dividendYield?.value !== null;
}

export function hasUsefulRiskData(snapshot: CompanyFinancialSnapshot | null): boolean {
  if (!snapshot?.risk) return false;
  const r = snapshot.risk;
  return r.debtToEquity?.value !== null || r.currentRatio?.value !== null || r.keyRiskFlags.length > 0 || r.overallRisk !== null;
}

export function hasUsefulPeerData(snapshot: CompanyFinancialSnapshot | null): boolean {
  if (!snapshot) return false;
  return snapshot.peerCount > 0;
}

export function hasUsefulHistory(snapshot: CompanyFinancialSnapshot | null): boolean {
  if (!snapshot) return false;
  return snapshot.historyPoints > 0;
}

export function getCompletenessLabel(snapshot: CompanyFinancialSnapshot | null): string {
  if (!snapshot) return "Research signals pending";
  const score = snapshot.completenessScore;
  if (score >= 70) return "Good research context";
  if (score >= 40) return "Partial research context";
  return "Limited research context";
}

export function shouldRenderSection(hasData: boolean, snapshot: CompanyFinancialSnapshot | null, sectionCheck: (s: CompanyFinancialSnapshot | null) => boolean): boolean {
  if (!snapshot) return false;
  return hasData || sectionCheck(snapshot);
}

export function getSectionFallbackCopy(section: string): string {
  const fallbacks: Record<string, string> = {
    fundamentals: "Limited financial context available for this company.",
    valuation: "Valuation context is limited for this company.",
    risk: "Risk information is limited for this company.",
    peers: "Peer comparison context is not currently available.",
    history: "Historical data is not currently available for this company.",
  };
  return fallbacks[section] || "Awaiting latest research cycle.";
}
