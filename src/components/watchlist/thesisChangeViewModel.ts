export type ThesisChangeState =
  | 'needs_review'
  | 'thesis_improving'
  | 'risk_rising'
  | 'unchanged'
  | 'tracking_only';

export interface ThesisChangeCardViewModel {
  symbol: string;
  companyName: string;
  state: ThesisChangeState;
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
const MAX_ARRAY_LENGTH = 5;

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

function firstSafeString(...values: unknown[]): string {
  for (const value of values) {
    const safe = safeString(value);
    if (safe) return safe;
  }
  return '';
}

function collectSafeStrings(...values: unknown[]): string[] {
  const collected: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) collected.push(...safeStringArray(value));
    else {
      const safe = safeString(value);
      if (safe) collected.push(safe);
    }
  }
  return Array.from(new Set(collected)).slice(0, MAX_ARRAY_LENGTH);
}

function booleanFlag(value: unknown): boolean {
  return value === true;
}

function inferState(input: Record<string, unknown>, risksToReview: string[], summary: string[], whatToWatch: string[]): ThesisChangeState {
  const explicit = safeString(input.state).toLowerCase();
  if (explicit.includes('needs') && explicit.includes('review')) return 'needs_review';
  if (explicit.includes('risk')) return 'risk_rising';
  if (explicit.includes('improv')) return 'thesis_improving';
  if (explicit.includes('unchanged') || explicit.includes('stable')) return 'unchanged';

  const currentStatus = safeString(input.currentStatus).toLowerCase();
  if (currentStatus.includes('needs') && currentStatus.includes('review')) return 'needs_review';
  if (currentStatus.includes('weakening')) return 'risk_rising';
  if (currentStatus.includes('strengthening')) return 'thesis_improving';
  if (currentStatus.includes('stable')) return 'unchanged';
  if (currentStatus.includes('tracking') || currentStatus.includes('pending')) return 'tracking_only';

  if ((booleanFlag(input.needsReview) || booleanFlag(input.needs_review)) && risksToReview.length > 0) return 'needs_review';

  const text = [...summary, ...risksToReview, ...whatToWatch, safeString(input.headline)].join(' ').toLowerCase();
  if (risksToReview.length > 0 && /risk|pressure|weak|concern|review/.test(text)) return 'risk_rising';
  if (/improv|stronger|strengthen|recover|better/.test(text)) return 'thesis_improving';
  if (summary.length || whatToWatch.length || risksToReview.length) return 'unchanged';
  return 'tracking_only';
}

export function toThesisChangeCardViewModel(input: unknown): ThesisChangeCardViewModel | null {
  if (!isPlainObject(input)) return null;

  const symbol = firstSafeString(input.symbol, input.ticker, input.nseSymbol);
  const companyName = firstSafeString(input.companyName, input.name, input.company);
  const headline = firstSafeString(input.headline, input.title, input.summaryHeadline);

  const nestedResearch = isPlainObject(input.research) ? input.research : {};
  const nestedMove = isPlainObject(input.whyDidThisMove) ? input.whyDidThisMove : {};
  const nestedEvidence = isPlainObject(input.evidenceReview) ? input.evidenceReview : {};

  const summary = collectSafeStrings(
    input.summary,
    input.thesis,
    input.thesisSummary,
    input.evidenceSummary,
    input.lastThesis,
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
    nestedEvidence.missing,
  );

  const whatToWatch = collectSafeStrings(
    input.whatToWatch,
    input.watchItems,
    input.neededContext,
    nestedResearch.whatToWatch,
    nestedMove.neededContext,
  );

  if (!symbol && !companyName && !headline && !summary.length && !risksToReview.length && !whatToWatch.length) return null;

  const state = inferState(input, risksToReview, summary, whatToWatch);

  return {
    symbol,
    companyName,
    state,
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
