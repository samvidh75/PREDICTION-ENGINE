import type { AlertChangeView, WatchlistThesisView } from "../../research/contracts/productContracts";
import type { ResearchAiContext } from "./researchAiTypes";
import { buildAlertContext, buildWatchlistContext } from "./researchAiContext";

function uniqueCompact(values: Array<string | null | undefined>, max = 5): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = value?.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= max) break;
  }

  return result;
}

function hasUsefulContext(context: ResearchAiContext): boolean {
  return Boolean(
    context.title ||
      context.headline ||
      context.watchlistContext?.length ||
      context.alertContext?.length ||
      context.narrative?.length ||
      context.risksToReview?.length ||
      context.whatToWatch?.length ||
      context.whatChanged?.length,
  );
}

function statusLine(item: WatchlistThesisView): string | null {
  const symbol = item.symbol?.trim().toUpperCase();
  const status = item.currentStatus?.trim();
  if (!symbol || !status) return null;
  return `${symbol}: ${status}`;
}

export interface WatchlistAiExplanationInput {
  thesisItems?: WatchlistThesisView[] | null;
  alerts?: AlertChangeView[] | null;
}

/**
 * Builds a page-level AI explanation context from already-safe watchlist and alert
 * view models. This only merges deterministic product context already shown in the
 * UI; it does not create new research facts or recommendation language.
 */
export function buildWatchlistAiExplanationContext({
  thesisItems,
  alerts,
}: WatchlistAiExplanationInput): ResearchAiContext | null {
  const thesisContexts = (thesisItems ?? [])
    .map((item) => buildWatchlistContext(item.symbol, item.companyName, item))
    .filter((context): context is ResearchAiContext => Boolean(context && hasUsefulContext(context)));

  const alertContexts = (alerts ?? [])
    .map((alert) => buildAlertContext(alert.symbol, alert.symbol, alert))
    .filter((context): context is ResearchAiContext => Boolean(context && hasUsefulContext(context)));

  const primary = thesisContexts[0] ?? alertContexts[0] ?? null;
  if (!primary) return null;

  const watchlistContext = uniqueCompact(
    thesisContexts.flatMap((context) => context.watchlistContext ?? context.narrative ?? []),
  );
  const alertContext = uniqueCompact(
    alertContexts.flatMap((context) => context.alertContext ?? context.narrative ?? []),
  );
  const whatChanged = uniqueCompact((thesisItems ?? []).map(statusLine));
  const risksToReview = uniqueCompact([
    ...thesisContexts.flatMap((context) => context.risksToReview ?? []),
    ...alertContexts.flatMap((context) => context.risksToReview ?? []),
  ]);
  const whatToWatch = uniqueCompact([
    ...thesisContexts.flatMap((context) => context.whatToWatch ?? []),
    ...alertContexts.flatMap((context) => context.whatToWatch ?? []),
  ]);
  const narrative = uniqueCompact([...watchlistContext, ...alertContext]);

  return {
    ...primary,
    surface: "watchlist",
    title: "Watchlist research explanation",
    narrative,
    watchlistContext,
    alertContext,
    whatChanged,
    risksToReview,
    whatToWatch,
  };
}
