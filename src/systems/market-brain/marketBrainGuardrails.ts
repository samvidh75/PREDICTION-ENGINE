export const MARKET_BRAIN_ALLOWED_STATES = [
  'High conviction',
  'Thesis improving',
  'Watch',
  'Needs review',
  'Risk rising',
  'Avoid for now',
] as const;

export const MARKET_BRAIN_EVIDENCE_DOMAINS = [
  'instrument_master',
  'prices',
  'fundamentals',
  'financial_statements',
  'shareholding',
  'corporate_actions',
  'news_events',
  'technicals',
  'sector_context',
  'ownership',
  'derivatives',
] as const;

export const MARKET_BRAIN_FACTOR_KEYS = [
  'quality',
  'growth',
  'valuation',
  'stability',
  'momentum',
  'risk',
  'ownership',
] as const;

export const MARKET_BRAIN_FORBIDDEN_RECOMMENDATION_TERMS = [
  'Strong Buy',
  'Buy now',
  'Buy recommendation',
  'Hold recommendation',
  'Sell immediately',
  'Sell recommendation',
  'Guaranteed return',
  'Sure shot',
  'Multibagger guarantee',
  'source pending',
  'source verified',
  'source unavailable',
  'quote unavailable',
  'history unavailable',
  'data unavailable',
  'migration required',
  'backfill needed',
  'data lineage',
  'internal API',
  'provider error',
  'backend error',
  'diagnostics check',
  'coverage missing',
  'freshness check',
  'data quality',
  'pipeline failure',
] as const;

export function containsForbiddenRecommendationLanguage(text: string): boolean {
  const normalized = text.toLowerCase();
  return MARKET_BRAIN_FORBIDDEN_RECOMMENDATION_TERMS.some((term) => normalized.includes(term.toLowerCase()));
}

export function assertMarketBrainCopyIsCompliant(text: string): void {
  if (containsForbiddenRecommendationLanguage(text)) {
    throw new Error('Market brain copy contains recommendation language that requires compliance review.');
  }
}
