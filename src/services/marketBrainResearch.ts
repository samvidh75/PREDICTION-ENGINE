export type MarketBrainResearchState = 'High conviction' | 'Thesis improving' | 'Watch' | 'Needs review' | 'Risk rising';

export type MarketBrainEvidenceDomain =
  | 'instrument_master'
  | 'prices'
  | 'fundamentals'
  | 'financial_statements'
  | 'shareholding'
  | 'corporate_actions'
  | 'news_events'
  | 'technicals'
  | 'sector_context';

export type MarketBrainFactorKey = 'quality' | 'growth' | 'valuation' | 'stability' | 'momentum' | 'risk' | 'ownership';

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

const MARKET_BRAIN_EVIDENCE_DOMAINS = new Set<MarketBrainEvidenceDomain>([
  'instrument_master',
  'prices',
  'fundamentals',
  'financial_statements',
  'shareholding',
  'corporate_actions',
  'news_events',
  'technicals',
  'sector_context',
]);

const MARKET_BRAIN_FACTOR_KEYS = new Set<MarketBrainFactorKey>([
  'quality',
  'growth',
  'valuation',
  'stability',
  'momentum',
  'risk',
  'ownership',
]);

const EMPTY_EVIDENCE_REVIEW: MarketBrainEvidenceReviewView = {
  needsReview: false,
  partial: [],
  missing: [],
  summary: 'Research evidence status is unavailable for this view.',
};

const asStringArray = (value: unknown): string[] => (Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  : []);

const asEvidenceDomains = (value: unknown): MarketBrainEvidenceDomain[] => (Array.isArray(value)
  ? value.filter((item): item is MarketBrainEvidenceDomain => (
    typeof item === 'string' && MARKET_BRAIN_EVIDENCE_DOMAINS.has(item as MarketBrainEvidenceDomain)
  ))
  : []);

const isPublicScore = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
);

const asFactorViews = (value: unknown): MarketBrainFactorView[] => (Array.isArray(value)
  ? value.filter((item): item is MarketBrainFactorView => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<MarketBrainFactorView>;
    return typeof candidate.key === 'string'
      && MARKET_BRAIN_FACTOR_KEYS.has(candidate.key as MarketBrainFactorKey)
      && typeof candidate.label === 'string'
      && candidate.label.trim().length > 0
      && typeof candidate.summary === 'string'
      && candidate.summary.trim().length > 0
      && isPublicScore(candidate.score);
  })
  : []);

const normalizeEvidenceReview = (value: Partial<MarketBrainEvidenceReviewView> | undefined): MarketBrainEvidenceReviewView => {
  if (!value) return EMPTY_EVIDENCE_REVIEW;
  const partial = asEvidenceDomains(value.partial);
  const missing = asEvidenceDomains(value.missing);
  const needsReview = value.needsReview ?? (partial.length > 0 || missing.length > 0);

  return {
    needsReview,
    partial,
    missing,
    summary: typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary
      : EMPTY_EVIDENCE_REVIEW.summary,
  };
};

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeResearchResponse = (payload: Partial<MarketBrainResearchResponse>): MarketBrainResearchResponse => {
  const research = payload.research as Partial<MarketBrainResearchView>;
  const symbol = asTrimmedString(payload.symbol) || asTrimmedString(research.symbol);
  const companyName = asTrimmedString(payload.companyName) || asTrimmedString(research.companyName);

  return {
    symbol: normalizeSymbol(symbol),
    companyName,
    research: {
      ...(research as MarketBrainResearchView),
      symbol: normalizeSymbol(symbol),
      companyName,
      thesis: asStringArray(research.thesis),
      risksToReview: asStringArray(research.risksToReview),
      whatToWatch: asStringArray(research.whatToWatch),
      evidenceReview: normalizeEvidenceReview(research.evidenceReview),
      factorViews: asFactorViews(research.factorViews),
    },
  };
};

export async function fetchMarketBrainResearch(symbol: string, init?: RequestInit): Promise<MarketBrainResearchResponse> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    throw new MarketBrainResearchError('A symbol is required to load research.', 400, 'SYMBOL_REQUIRED');
  }

  const response = await fetch(`/api/stockstory/${encodeURIComponent(normalized)}/research`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null) as Partial<MarketBrainResearchResponse> & {
    message?: string;
    code?: string;
  } | null;

  if (!response.ok) {
    throw new MarketBrainResearchError(
      payload?.message ?? 'Research is temporarily unavailable for this company.',
      response.status,
      payload?.code,
    );
  }

  if (!payload?.research) {
    throw new MarketBrainResearchError('Research response was incomplete.', response.status, 'INCOMPLETE_RESEARCH_RESPONSE');
  }

  return normalizeResearchResponse(payload);
}
