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

export interface MarketBrainFactorView {
  key: 'quality' | 'growth' | 'valuation' | 'stability' | 'momentum' | 'risk' | 'ownership';
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

const EMPTY_EVIDENCE_REVIEW: MarketBrainEvidenceReviewView = {
  needsReview: false,
  partial: [],
  missing: [],
  summary: 'Research evidence status is unavailable for this view.',
};

const asStringArray = (value: unknown): string[] => (Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  : []);

const normalizeEvidenceReview = (value: Partial<MarketBrainEvidenceReviewView> | undefined): MarketBrainEvidenceReviewView => {
  if (!value) return EMPTY_EVIDENCE_REVIEW;
  const partial = Array.isArray(value.partial) ? value.partial : [];
  const missing = Array.isArray(value.missing) ? value.missing : [];
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

const normalizeResearchResponse = (payload: Partial<MarketBrainResearchResponse>): MarketBrainResearchResponse => {
  const research = payload.research as Partial<MarketBrainResearchView>;
  return {
    symbol: typeof payload.symbol === 'string' ? payload.symbol : String(research.symbol ?? '').toUpperCase(),
    companyName: typeof payload.companyName === 'string' ? payload.companyName : String(research.companyName ?? ''),
    research: {
      ...(research as MarketBrainResearchView),
      thesis: asStringArray(research.thesis),
      risksToReview: asStringArray(research.risksToReview),
      whatToWatch: asStringArray(research.whatToWatch),
      evidenceReview: normalizeEvidenceReview(research.evidenceReview),
      factorViews: Array.isArray(research.factorViews) ? research.factorViews : [],
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
