export type MarketBrainResearchState = 'High conviction' | 'Thesis improving' | 'Watch' | 'Needs review' | 'Risk rising';

export interface MarketBrainFactorView {
  key: 'quality' | 'growth' | 'valuation' | 'stability' | 'momentum' | 'risk' | 'ownership';
  label: string;
  score: number;
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

  return payload as MarketBrainResearchResponse;
}
