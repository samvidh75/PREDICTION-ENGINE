export type ResearchAlertCategory =
  | 'thesis_changed'
  | 'risk_changed'
  | 'needs_review'
  | 'valuation_changed'
  | 'momentum_changed'
  | 'important_move'
  | 'peer_became_more_attractive'
  | 'watchlist_review';

export interface ResearchAlertViewModel {
  symbol: string;
  companyName: string;
  category: ResearchAlertCategory;
  headline: string;
  summary: string[];
  risksToReview: string[];
  whatToWatch: string[];
  actions: {
    research: boolean;
    compare: boolean;
    track: boolean;
    invest: boolean;
  };
}

const MAX_STRING_LENGTH = 280;
const MAX_ARRAY_LENGTH = 4;

const UNSAFE_COPY_PATTERN = /\b(?:Buy|Sell|Hold|Strong Buy|guaranteed|sure shot|multibagger|target|provider|API|backend|diagnostics|coverage|freshness|lineage|migration|backfill|source pending|source verified|quote unavailable|history unavailable|RAG|vector|embedding|chunk|narrativePromptPayload|adapter|ADAPTER_UNAVAILABLE|EMPTY_RESPONSE|MALFORMED_RESPONSE)\b/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed || UNSAFE_COPY_PATTERN.test(trimmed)) return '';
  return trimmed.length > MAX_STRING_LENGTH ? `${trimmed.slice(0, MAX_STRING_LENGTH)}…` : trimmed;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(safeString)
    .filter(Boolean)
    .slice(0, MAX_ARRAY_LENGTH);
}

function collectSafeStrings(...values: unknown[]): string[] {
  const output: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) output.push(...safeStringArray(value));
    else {
      const safe = safeString(value);
      if (safe) output.push(safe);
    }
  }
  return Array.from(new Set(output)).slice(0, MAX_ARRAY_LENGTH);
}

function firstSafeString(...values: unknown[]): string {
  for (const value of values) {
    const safe = safeString(value);
    if (safe) return safe;
  }
  return '';
}

function normalizeCategory(value: unknown, headline: string, risksToReview: string[], whatToWatch: string[]): ResearchAlertCategory {
  const raw = safeString(value).toLowerCase();
  if (raw.includes('valuation')) return 'valuation_changed';
  if (raw.includes('momentum')) return 'momentum_changed';
  if (raw.includes('peer')) return 'peer_became_more_attractive';
  if (raw.includes('move')) return 'important_move';
  if (raw.includes('risk')) return 'risk_changed';
  if (raw.includes('review')) return 'needs_review';
  if (raw.includes('thesis')) return 'thesis_changed';

  const text = [headline, ...risksToReview, ...whatToWatch].join(' ').toLowerCase();
  if (/valuation|multiple|margin of safety/.test(text)) return 'valuation_changed';
  if (/important move|decisive move|significant move/.test(text)) return 'important_move';
  if (/momentum|volume|price move|trend/.test(text)) return 'momentum_changed';
  if (/risk|pressure|concern/.test(text)) return 'risk_changed';
  if (/review|watch/.test(text)) return 'needs_review';
  return 'watchlist_review';
}

export function toResearchAlertViewModel(input: unknown): ResearchAlertViewModel | null {
  if (!isPlainObject(input)) return null;

  const symbol = firstSafeString(input.symbol, input.ticker, input.nseSymbol);
  const companyName = firstSafeString(input.companyName, input.name, input.company);
  const headline = firstSafeString(input.headline, input.title, input.alertHeadline, input.summaryHeadline);

  const nestedResearch = isPlainObject(input.research) ? input.research : {};
  const nestedMove = isPlainObject(input.whyDidThisMove) ? input.whyDidThisMove : {};

  const summary = collectSafeStrings(
    input.body,
    input.summary,
    input.thesis,
    input.thesisSummary,
    input.evidenceSummary,
    nestedResearch.summary,
    nestedResearch.thesis,
    nestedMove.summary,
  );

  const risksToReview = collectSafeStrings(
    input.risksToReview,
    input.risks,
    input.risksToThesis,
    nestedResearch.risksToReview,
    nestedMove.risksToThesis,
  );

  const whatToWatch = collectSafeStrings(
    input.whatToWatch,
    input.watchItems,
    input.neededContext,
    nestedResearch.whatToWatch,
    nestedMove.neededContext,
  );

  if (!symbol && !companyName && !headline && !summary.length && !risksToReview.length && !whatToWatch.length) return null;

  return {
    symbol,
    companyName,
    category: normalizeCategory(input.category ?? input.type, headline, risksToReview, whatToWatch),
    headline,
    summary,
    risksToReview,
    whatToWatch,
    actions: {
      research: Boolean(symbol || companyName),
      compare: Boolean(symbol || companyName),
      track: Boolean(symbol || companyName),
      invest: Boolean(symbol || companyName),
    },
  };
}

export function toResearchAlertViewModels(input: unknown): ResearchAlertViewModel[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(toResearchAlertViewModel)
    .filter((alert): alert is ResearchAlertViewModel => alert !== null)
    .slice(0, 10);
}
