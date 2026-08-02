import type {
  MarketBrainResearchView,
  MarketBrainEvidenceReviewView,
  MarketBrainAnomalyReviewView,
  MarketBrainWhyDidThisMoveView,
  MarketBrainFactorView,
  MarketBrainEvidenceDomain,
} from '../../services/marketBrainResearch';

export interface MarketBrainPanelViewModel {
  symbol: string;
  companyName: string;
  state: string;
  headline: string;
  thesis: string[];
  risksToReview: string[];
  whatToWatch: string[];
  evidenceSummary: string[];
  evidenceReview: MarketBrainEvidenceReviewView | null;
  anomalyReview: MarketBrainAnomalyReviewView | null;
  whyDidThisMove: MarketBrainWhyDidThisMoveView | null;
  factorViews: MarketBrainFactorView[];
  methodNote: string;
}

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 10;

function safeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.length > MAX_STRING_LENGTH) return trimmed.slice(0, MAX_STRING_LENGTH) + '…';
  return trimmed;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((s) => safeString(s))
    .filter(Boolean)
    .slice(0, MAX_ARRAY_LENGTH);
}

function safeNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

function safeObject<T>(
  value: unknown,
  shapeGuard: (raw: Record<string, unknown>) => T | null,
): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return shapeGuard(value as Record<string, unknown>);
}

function safeEvidenceReview(raw: unknown): MarketBrainEvidenceReviewView | null {
  return safeObject<MarketBrainEvidenceReviewView>(raw, (o) => {
    const needsReview = typeof o.needsReview === 'boolean' ? o.needsReview : false;
    const partial = Array.isArray(o.partial) ? o.partial.filter((d): d is string => typeof d === 'string').slice(0, 10) : [];
    const missing = Array.isArray(o.missing) ? o.missing.filter((d): d is string => typeof d === 'string').slice(0, 10) : [];
    const summary = safeString(o.summary, 'Incomplete evidence');
    if (!partial.length && !missing.length && !summary) return null;
    return { needsReview, partial, missing, summary } as MarketBrainEvidenceReviewView;
  });
}

function safeAnomalyReview(raw: unknown): MarketBrainAnomalyReviewView | null {
  return safeObject<MarketBrainAnomalyReviewView>(raw, (o) => {
    const anomalyType = safeString(o.anomalyType, 'Incomplete evidence');
    const severity = safeString(o.severity, 'Needs review');
    const evidence = safeStringArray(o.evidence);
    const missingEvidence = safeStringArray(o.missingEvidence);
    const summary = safeString(o.summary, '');
    if (!anomalyType && !evidence.length) return null;
    return { anomalyType, severity, evidence, missingEvidence, summary } as MarketBrainAnomalyReviewView;
  });
}

function safeWhyDidThisMove(raw: unknown): MarketBrainWhyDidThisMoveView | null {
  return safeObject<MarketBrainWhyDidThisMoveView>(raw, (o) => {
    const direction = safeString(o.direction, 'mixed') as MarketBrainWhyDidThisMoveView['direction'];
    const confidence = safeString(o.confidence, 'insufficient') as MarketBrainWhyDidThisMoveView['confidence'];
    const magnitudePct = safeNumber(o.magnitudePct);
    const primaryDriver = safeString(o.primaryDriver);
    const contributingFactors = safeStringArray(o.contributingFactors);
    const risksToThesis = safeStringArray(o.risksToThesis);
    const summary = safeString(o.summary);
    const keyLevels = safeStringArray(o.keyLevels);
    const neededContext = safeStringArray(o.neededContext);
    if (!primaryDriver && !summary) return null;
    return { direction, confidence, magnitudePct, primaryDriver, contributingFactors, risksToThesis, summary, keyLevels, neededContext };
  });
}

function safeFactorViews(raw: unknown): MarketBrainFactorView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => safeObject<MarketBrainFactorView>(f, (o) => {
      const key = safeString(o.key);
      const label = safeString(o.label);
      const score = safeNumber(o.score, 0);
      const summary = safeString(o.summary);
      if (!key) return null;
      return { key, label, score, summary } as MarketBrainFactorView;
    }))
    .filter((f): f is MarketBrainFactorView => f !== null)
    .slice(0, 10);
}

export function toMarketBrainPanelViewModel(raw: unknown): MarketBrainPanelViewModel | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const symbol = safeString(obj.symbol);
  const companyName = safeString(obj.companyName);
  const state = safeString(obj.state, 'In Review');
  const headline = safeString(obj.headline);
  const thesis = safeStringArray(obj.thesis);
  const risksToReview = safeStringArray(obj.risksToReview);
  const whatToWatch = safeStringArray(obj.whatToWatch);
  const evidenceSummary = safeStringArray(obj.evidenceSummary);
  const evidenceReview = safeEvidenceReview(obj.evidenceReview);
  const anomalyReview = safeAnomalyReview(obj.anomalyReview);
  const whyDidThisMove = safeWhyDidThisMove(obj.whyDidThisMove);
  const factorViews = safeFactorViews(obj.factorViews);
  const methodNote = safeString(obj.methodNote);

  if (!symbol && !companyName && !headline) return null;

  return {
    symbol, companyName, state, headline, thesis,
    risksToReview, whatToWatch, evidenceSummary,
    evidenceReview, anomalyReview, whyDidThisMove,
    factorViews, methodNote,
  };
}

