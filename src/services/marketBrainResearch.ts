import {
  MARKET_BRAIN_ALLOWED_STATES,
  MARKET_BRAIN_EVIDENCE_DOMAINS as MARKET_BRAIN_PUBLIC_EVIDENCE_DOMAINS,
  MARKET_BRAIN_FACTOR_KEYS as MARKET_BRAIN_PUBLIC_FACTOR_KEYS,
  containsForbiddenRecommendationLanguage,
} from '../systems/market-brain/marketBrainGuardrails';

export type MarketBrainResearchState = typeof MARKET_BRAIN_ALLOWED_STATES[number];
export type MarketBrainEvidenceDomain = typeof MARKET_BRAIN_PUBLIC_EVIDENCE_DOMAINS[number];
export type MarketBrainFactorKey = typeof MARKET_BRAIN_PUBLIC_FACTOR_KEYS[number];

export interface MarketBrainFactorView {
  key: MarketBrainFactorKey;
  label: string;
  score: number;
  summary: string;
}

export interface MarketBrainEvidenceReviewView {
  needsReview: boolean;
  partial: MarketBrainEvidenceDomain[];
  missing: MarketBrainEvidenceDomain[];
  summary: string;
}

export type MarketBrainAnomalySeverityView = 'Low' | 'Medium' | 'High' | 'Needs review';
export type MarketBrainAnomalyTypeView =
  | 'Volume-backed price move'
  | 'Stock-specific move'
  | 'Market-aligned move'
  | 'Volatility expansion'
  | 'Gap move'
  | 'Delivery-supported move'
  | 'Incomplete evidence';

export interface MarketBrainAnomalyReviewView {
  anomalyType: MarketBrainAnomalyTypeView;
  severity: MarketBrainAnomalySeverityView;
  evidence: string[];
  missingEvidence: string[];
  summary: string;
}

export interface MarketBrainHistoricalSimilarityReviewView {
  usable: boolean;
  needsReview: boolean;
  sampleSize: number;
  minSampleSize: number;
  observations: string[];
  limitations: string[];
  summary: string[];
  headline: string;
}

export interface MarketBrainResearchView {
  symbol: string;
  companyName: string;
  state: MarketBrainResearchState;
  convictionScore: number;
  headline: string;
  thesis: string[];
  risksToReview: string[];
  whatToWatch: string[];
  evidenceReview: MarketBrainEvidenceReviewView;
  anomalyReview: MarketBrainAnomalyReviewView | null;
  historicalSimilarityReview: MarketBrainHistoricalSimilarityReviewView | null;
  factorViews: MarketBrainFactorView[];
  methodNote: string;
  generatedAt: string;
}

export interface MarketBrainResearchResponse {
  symbol: string;
  companyName: string;
  research: MarketBrainResearchView;
}

export class MarketBrainResearchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'MarketBrainResearchError';
  }
}

const normalizeSymbol = (symbol: string): string => symbol.trim().toUpperCase();

const MARKET_BRAIN_RESEARCH_STATES = new Set<MarketBrainResearchState>(MARKET_BRAIN_ALLOWED_STATES);
const MARKET_BRAIN_EVIDENCE_DOMAINS = new Set<MarketBrainEvidenceDomain>(MARKET_BRAIN_PUBLIC_EVIDENCE_DOMAINS);
const MARKET_BRAIN_FACTOR_KEYS = new Set<MarketBrainFactorKey>(MARKET_BRAIN_PUBLIC_FACTOR_KEYS);
const PUBLIC_SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9&.-]*$/;

const EMPTY_EVIDENCE_REVIEW: MarketBrainEvidenceReviewView = {
  needsReview: false,
  partial: [],
  missing: [],
  summary: 'Research evidence status is unavailable for this view.',
};

const ALLOWED_ANOMALY_TYPES = new Set<MarketBrainAnomalyTypeView>([
  'Volume-backed price move',
  'Stock-specific move',
  'Market-aligned move',
  'Volatility expansion',
  'Gap move',
  'Delivery-supported move',
  'Incomplete evidence',
]);

const ALLOWED_ANOMALY_SEVERITIES = new Set<MarketBrainAnomalySeverityView>([
  'Low',
  'Medium',
  'High',
  'Needs review',
]);

const PUBLIC_RESEARCH_UNAVAILABLE_MESSAGE = 'Research is temporarily unavailable for this company.';
const PUBLIC_RESEARCH_UNAVAILABLE_CODE = 'RESEARCH_UNAVAILABLE';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asPublicSymbol = (value: unknown): string => {
  const symbol = normalizeSymbol(asTrimmedString(value));
  return PUBLIC_SYMBOL_PATTERN.test(symbol) ? symbol : '';
};

const asPublicText = (value: unknown): string => {
  const text = asTrimmedString(value);
  return text.length > 0 && !containsForbiddenRecommendationLanguage(text) ? text : '';
};

const asResearchState = (value: unknown): MarketBrainResearchState => {
  const state = asTrimmedString(value);
  return MARKET_BRAIN_RESEARCH_STATES.has(state as MarketBrainResearchState)
    ? state as MarketBrainResearchState
    : 'Needs review';
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const items: string[] = [];
  const seen = new Set<string>();

  value.forEach((item) => {
    const text = asPublicText(item);
    const dedupeKey = text.toLowerCase();
    if (text.length > 0 && !seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      items.push(text);
    }
  });

  return items;
};

const asEvidenceDomains = (value: unknown): MarketBrainEvidenceDomain[] => {
  if (!Array.isArray(value)) return [];

  const domains: MarketBrainEvidenceDomain[] = [];
  const seen = new Set<MarketBrainEvidenceDomain>();

  value.forEach((item) => {
    const trimmedDomain = asTrimmedString(item);
    if (!MARKET_BRAIN_EVIDENCE_DOMAINS.has(trimmedDomain as MarketBrainEvidenceDomain)) {
      return;
    }

    const domain = trimmedDomain as MarketBrainEvidenceDomain;
    if (!seen.has(domain)) {
      seen.add(domain);
      domains.push(domain);
    }
  });

  return domains;
};

const removeEvidenceOverlap = (
  primary: MarketBrainEvidenceDomain[],
  secondary: MarketBrainEvidenceDomain[],
): MarketBrainEvidenceDomain[] => {
  const primaryDomains = new Set(primary);
  return secondary.filter((domain) => !primaryDomains.has(domain));
};

const isPublicScore = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
);

const asPublicScore = (value: unknown): number => (isPublicScore(value) ? value : 0);

const asNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
};

const asPublicTimestamp = (value: unknown): string => {
  const timestamp = asTrimmedString(value);
  if (!timestamp) return '';

  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === timestamp ? timestamp : '';
};

const asFactorViews = (value: unknown): MarketBrainFactorView[] => {
  if (!Array.isArray(value)) return [];

  const factors: MarketBrainFactorView[] = [];
  const seen = new Set<MarketBrainFactorKey>();

  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<MarketBrainFactorView>;
    const keyText = asTrimmedString(candidate.key);
    const label = asPublicText(candidate.label);
    const summary = asPublicText(candidate.summary);
    if (!(MARKET_BRAIN_FACTOR_KEYS.has(keyText as MarketBrainFactorKey)
      && label.length > 0
      && summary.length > 0
      && isPublicScore(candidate.score))) {
      return;
    }

    const key = keyText as MarketBrainFactorKey;
    if (seen.has(key)) return;

    seen.add(key);
    factors.push({
      key,
      label,
      score: candidate.score,
      summary,
    });
  });

  return factors;
};

const copyEmptyEvidenceReview = (): MarketBrainEvidenceReviewView => ({
  ...EMPTY_EVIDENCE_REVIEW,
  partial: [...EMPTY_EVIDENCE_REVIEW.partial],
  missing: [...EMPTY_EVIDENCE_REVIEW.missing],
});

const normalizeEvidenceReview = (value: unknown): MarketBrainEvidenceReviewView => {
  if (!isRecord(value)) return copyEmptyEvidenceReview();
  const candidate = value as Partial<MarketBrainEvidenceReviewView>;
  const partial = asEvidenceDomains(candidate.partial);
  const missing = removeEvidenceOverlap(partial, asEvidenceDomains(candidate.missing));
  const summary = asPublicText(candidate.summary) || EMPTY_EVIDENCE_REVIEW.summary;
  const hasEvidenceGaps = partial.length > 0 || missing.length > 0;
  const needsReview = hasEvidenceGaps || (typeof candidate.needsReview === 'boolean'
    ? candidate.needsReview
    : false);

  return {
    needsReview,
    partial,
    missing,
    summary,
  };
};

const normalizeAnomalyReview = (value: unknown): MarketBrainAnomalyReviewView | null => {
  if (!isRecord(value)) return null;

  const candidate = value as Partial<MarketBrainAnomalyReviewView>;
  const anomalyTypeText = asTrimmedString(candidate.anomalyType);
  const severityText = asTrimmedString(candidate.severity);
  const anomalyType = ALLOWED_ANOMALY_TYPES.has(anomalyTypeText as MarketBrainAnomalyTypeView)
    ? anomalyTypeText as MarketBrainAnomalyTypeView
    : null;
  const severity = ALLOWED_ANOMALY_SEVERITIES.has(severityText as MarketBrainAnomalySeverityView)
    ? severityText as MarketBrainAnomalySeverityView
    : null;

  if (!anomalyType || !severity) return null;

  const evidence = asStringArray(candidate.evidence);
  const missingEvidence = asStringArray(candidate.missingEvidence);
  const summary = asPublicText(candidate.summary)
    || (evidence.length > 0 ? evidence[0] : 'Market event evidence needs review.');

  return {
    anomalyType,
    severity,
    evidence,
    missingEvidence,
    summary,
  };
};

const normalizeHistoricalSimilarityReview = (value: unknown): MarketBrainHistoricalSimilarityReviewView | null => {
  if (!isRecord(value)) return null;

  const candidate = value as Partial<MarketBrainHistoricalSimilarityReviewView>;
  const sampleSize = asNonNegativeInteger(candidate.sampleSize);
  const minSampleSize = asNonNegativeInteger(candidate.minSampleSize);

  if (sampleSize == null || minSampleSize == null || minSampleSize <= 0) return null;

  const observations = asStringArray(candidate.observations);
  const limitations = asStringArray(candidate.limitations);
  const usable = typeof candidate.usable === 'boolean'
    ? candidate.usable && sampleSize >= minSampleSize
    : sampleSize >= minSampleSize;
  const needsReview = typeof (candidate as Record<string, unknown>).needsReview === 'boolean'
    ? (candidate as Record<string, unknown>).needsReview as boolean
    : !usable && sampleSize > 0;

  const rawSummary = (candidate as Record<string, unknown>).summary;
  const summary: string[] = Array.isArray(rawSummary)
    ? rawSummary.filter((s): s is string => typeof s === 'string').map((s) => asPublicText(s) || '').filter(Boolean)
    : typeof rawSummary === 'string'
      ? [asPublicText(rawSummary) || ''].filter(Boolean)
      : [];
  if (summary.length === 0) {
    summary.push(
      usable
        ? 'Similar historical cases are available as research context.'
        : 'Not enough similar historical cases for this view yet.',
    );
  }

  const headline = asPublicText((candidate as Record<string, unknown>).headline as string)
    || (usable
      ? 'Historical similarity data available for research context.'
      : 'Insufficient historical similarity data.');

  return {
    usable,
    needsReview,
    sampleSize,
    minSampleSize,
    observations,
    limitations,
    summary,
    headline,
  };
};

const normalizeResearchResponse = (
  payload: Record<string, unknown>,
  requestedSymbol: string,
): MarketBrainResearchResponse => {
  const research = payload.research as Partial<MarketBrainResearchView>;
  const symbol = asPublicSymbol(payload.symbol) || asPublicSymbol(research.symbol) || requestedSymbol;
  const companyName = asPublicText(payload.companyName) || asPublicText(research.companyName) || symbol;

  return {
    symbol,
    companyName,
    research: {
      symbol,
      companyName,
      state: asResearchState(research.state),
      convictionScore: asPublicScore(research.convictionScore),
      headline: asPublicText(research.headline),
      thesis: asStringArray(research.thesis),
      risksToReview: asStringArray(research.risksToReview),
      whatToWatch: asStringArray(research.whatToWatch),
      evidenceReview: normalizeEvidenceReview(research.evidenceReview),
      anomalyReview: normalizeAnomalyReview(research.anomalyReview),
      historicalSimilarityReview: normalizeHistoricalSimilarityReview(research.historicalSimilarityReview),
      factorViews: asFactorViews(research.factorViews),
      methodNote: asPublicText(research.methodNote),
      generatedAt: asPublicTimestamp(research.generatedAt),
    },
  };
};

export async function fetchMarketBrainResearch(symbol: string, init?: RequestInit): Promise<MarketBrainResearchResponse> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    throw new MarketBrainResearchError('A symbol is required to load research.', 400, 'SYMBOL_REQUIRED');
  }

  if (!PUBLIC_SYMBOL_PATTERN.test(normalized)) {
    throw new MarketBrainResearchError('A valid symbol is required to load research.', 400, 'SYMBOL_INVALID');
  }

  const response = await fetch('/api/stockstory/' + encodeURIComponent(normalized) + '/research', {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null) as unknown;

  if (!response.ok) {
    throw new MarketBrainResearchError(
      PUBLIC_RESEARCH_UNAVAILABLE_MESSAGE,
      response.status,
      PUBLIC_RESEARCH_UNAVAILABLE_CODE,
    );
  }

  if (!isRecord(payload) || !isRecord(payload.research)) {
    throw new MarketBrainResearchError(
      PUBLIC_RESEARCH_UNAVAILABLE_MESSAGE,
      response.status,
      PUBLIC_RESEARCH_UNAVAILABLE_CODE,
    );
  }

  return normalizeResearchResponse(payload, normalized);
}
