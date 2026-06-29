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

const PUBLIC_RESEARCH_UNAVAILABLE_MESSAGE = 'Research is temporarily unavailable for this company.';
const INCOMPLETE_RESEARCH_RESPONSE_MESSAGE = 'Research response was incomplete.';

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
    if (text.length > 0 && !seen.has(text)) {
      seen.add(text);
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
    if (!(typeof item === 'string' && MARKET_BRAIN_EVIDENCE_DOMAINS.has(item as MarketBrainEvidenceDomain))) {
      return;
    }

    const domain = item as MarketBrainEvidenceDomain;
    if (!seen.has(domain)) {
      seen.add(domain);
      domains.push(domain);
    }
  });

  return domains;
};

const isPublicScore = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
);

const asPublicScore = (value: unknown): number => (isPublicScore(value) ? value : 0);

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
    const label = asPublicText(candidate.label);
    const summary = asPublicText(candidate.summary);
    if (!(typeof candidate.key === 'string'
      && MARKET_BRAIN_FACTOR_KEYS.has(candidate.key as MarketBrainFactorKey)
      && label.length > 0
      && summary.length > 0
      && isPublicScore(candidate.score))) {
      return;
    }

    const key = candidate.key as MarketBrainFactorKey;
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
  const missing = asEvidenceDomains(candidate.missing);
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

const normalizeResearchResponse = (
  payload: Record<string, unknown>,
  requestedSymbol: string,
): MarketBrainResearchResponse => {
  const research = payload.research as Partial<MarketBrainResearchView>;
  const symbol = asPublicSymbol(payload.symbol) || asPublicSymbol(research.symbol) || requestedSymbol;
  const companyName = asPublicText(payload.companyName) || asPublicText(research.companyName);

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

  const response = await fetch(`/api/stockstory/${encodeURIComponent(normalized)}/research`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null) as unknown;

  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : undefined;
    throw new MarketBrainResearchError(
      PUBLIC_RESEARCH_UNAVAILABLE_MESSAGE,
      response.status,
      code,
    );
  }

  if (!isRecord(payload) || !isRecord(payload.research)) {
    throw new MarketBrainResearchError(
      INCOMPLETE_RESEARCH_RESPONSE_MESSAGE,
      response.status,
      'INCOMPLETE_RESEARCH_RESPONSE',
    );
  }

  return normalizeResearchResponse(payload, normalized);
}
