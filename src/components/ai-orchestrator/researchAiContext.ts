import type {
  AlertChangeView,
  CompareResultView,
  ScannerResultView,
  WatchlistThesisView,
} from "../../research/contracts/productContracts";
import type { ResearchAiContext, ResearchAiSurface } from "./researchAiTypes";

const DEFAULT_MAX_CHARS = 3000;
const MAX_ITEMS = 5;
const MAX_STRING = 180;

type UnknownRecord = Record<string, unknown>;

const FORBIDDEN_COPY = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\btarget\b/i,
  /\bprovider\b/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bdiagnostic\b/i,
  /\bcoverage\b/i,
  /\bfreshness\b/i,
  /\blineage\b/i,
  /\bmigration\b/i,
  /\bbackfill\b/i,
  /\bsource pending\b/i,
  /\bsource verified\b/i,
  /\bquote unavailable\b/i,
  /\bhistory unavailable\b/i,
  /\brag\b/i,
  /\bvector\b/i,
  /\bembedding\b/i,
  /\bchunk\b/i,
  /\bnarrativepromptpayload\b/i,
  /\badapter\b/i,
  /\bwebllm\b/i,
  /\bwebgpu\b/i,
  /\bwasm\b/i,
  /\bollama\b/i,
  /\bllama\b/i,
  /\bqwen\b/i,
  /\bphi\b/i,
  /\bmultibagger\b/i,
  /\bguaranteed\b/i,
  /\bsure shot\b/i,
];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value: unknown, max = MAX_STRING): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, max);
  if (!text) return null;
  if (FORBIDDEN_COPY.some((pattern) => pattern.test(text))) return null;
  if (/\b(null|undefined|NaN|Infinity)\b/.test(text)) return null;
  if (/^[{[].*[}\]]$/s.test(text)) return null;
  return text;
}

function sanitizeArray(value: unknown, max = MAX_ITEMS): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const deduped = new Set<string>();
  const items = value
    .map((item) => sanitizeText(item))
    .filter((item): item is string => Boolean(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (deduped.has(key)) return false;
      deduped.add(key);
      return true;
    })
    .slice(0, max);
  return items.length > 0 ? items : undefined;
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pruneEmpty<T extends ResearchAiContext>(context: T): T | null {
  const next: UnknownRecord = {};
  for (const [key, value] of Object.entries(context)) {
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (isRecord(value) && Object.keys(value).length === 0) continue;
    next[key] = value;
  }
  return Object.keys(next).length > 1 ? (next as T) : null;
}

function fromMarketBrainRecord(input: UnknownRecord, surface: ResearchAiSurface): ResearchAiContext | null {
  const research = isRecord(input.research) ? input.research : input;
  const evidenceReview = isRecord(research.evidenceReview) ? research.evidenceReview : null;
  return pruneEmpty({
    surface,
    symbol: sanitizeText(input.symbol ?? research.symbol, 24),
    companyName: sanitizeText(input.companyName ?? research.companyName),
    headline: sanitizeText(research.headline),
    researchNarrative: sanitizeArray(
      Array.isArray(research.thesis)
        ? research.thesis
        : [research.narrative, research.explanation, research.evidenceSummary, research.headline],
    ),
    risksToReview: sanitizeArray(
      Array.isArray(research.risksToReview) ? research.risksToReview : research.risks,
    ),
    whatToWatch: sanitizeArray(
      Array.isArray(research.whatToWatch) ? research.whatToWatch : research.watchItems,
    ),
    evidenceToReview: evidenceReview
      ? sanitizeArray([
          evidenceReview.summary,
          ...(Array.isArray(evidenceReview.partial) ? evidenceReview.partial : []),
          ...(Array.isArray(evidenceReview.missing) ? evidenceReview.missing : []),
        ])
      : undefined,
    sector: sanitizeText(research.sector ?? research.industry),
    currentPrice: sanitizeNumber(input.currentPrice ?? research.currentPrice),
    changeAbs: sanitizeNumber(input.changeAbs ?? research.changeAbs),
    changePercent: sanitizeNumber(input.changePercent ?? research.changePercent),
  });
}

function fromScannerResult(input: ScannerResultView, surface: ResearchAiSurface): ResearchAiContext | null {
  return pruneEmpty({
    surface,
    symbol: sanitizeText(input.symbol, 24),
    companyName: sanitizeText(input.companyName),
    title: sanitizeText(input.oneLineThesis),
    scannerContext: sanitizeArray([input.keyReason, input.riskMarker, input.conviction]),
  });
}

function fromCompareResult(input: CompareResultView, surface: ResearchAiSurface): ResearchAiContext | null {
  return pruneEmpty({
    surface,
    title: sanitizeText("Compare research"),
    comparisonContext: sanitizeArray(
      [
        ...input.companies.flatMap((company) => [
          company.companyName,
          ...company.strengths,
          ...company.risks,
        ]),
        ...input.factorComparison.map((factor) => factor.explanation),
        input.missingDataCaveat,
      ],
      8,
    ),
  });
}

function fromWatchlist(input: WatchlistThesisView, surface: ResearchAiSurface): ResearchAiContext | null {
  return pruneEmpty({
    surface,
    symbol: sanitizeText(input.symbol, 24),
    companyName: sanitizeText(input.companyName),
    title: sanitizeText(input.currentStatus),
    watchlistContext: sanitizeArray([input.conviction, input.lastThesis, input.scoreDirection]),
    whatToWatch: sanitizeArray([input.previousStatus ? `Previous status: ${input.previousStatus}` : null]),
  });
}

function fromAlert(input: AlertChangeView, surface: ResearchAiSurface): ResearchAiContext | null {
  return pruneEmpty({
    surface,
    symbol: sanitizeText(input.symbol, 24),
    title: sanitizeText(input.title),
    alertContext: sanitizeArray([input.body, input.type]),
  });
}

export function toResearchAiContext(input: unknown, surface: ResearchAiSurface): ResearchAiContext | null {
  if (!input) return null;
  if (isRecord(input)) {
    if ("research" in input || "factorViews" in input || "headline" in input) {
      return fromMarketBrainRecord(input, surface);
    }
    if ("rank" in input && "keyReason" in input) {
      return fromScannerResult(input as unknown as ScannerResultView, surface);
    }
    if ("companies" in input && "factorComparison" in input) {
      return fromCompareResult(input as unknown as CompareResultView, surface);
    }
    if ("currentStatus" in input && "conviction" in input) {
      return fromWatchlist(input as unknown as WatchlistThesisView, surface);
    }
    if ("body" in input && "timestamp" in input) {
      return fromAlert(input as unknown as AlertChangeView, surface);
    }
  }
  return null;
}

export function compressResearchAiContext(context: ResearchAiContext, maxChars = DEFAULT_MAX_CHARS): string {
  const blocks: string[] = [];
  const pushList = (label: string, values?: string[] | null) => {
    if (!values?.length) return;
    blocks.push(`${label}: ${values.join(" | ")}`);
  };

  if (context.companyName || context.symbol) {
    blocks.push([context.companyName, context.symbol].filter(Boolean).join(" "));
  }
  if (context.title) blocks.push(`Title: ${context.title}`);
  if (context.headline) blocks.push(`Headline: ${context.headline}`);
  if (context.healthometer?.score != null || context.healthometer?.state) {
    const parts = [
      context.healthometer.state ? `State ${context.healthometer.state}` : null,
      typeof context.healthometer.score === "number" ? `Score ${context.healthometer.score}` : null,
    ].filter(Boolean);
    if (parts.length) blocks.push(`Healthometer: ${parts.join(", ")}`);
    pushList("Healthometer evidence", context.healthometer.explanation);
    pushList("Healthometer factors", context.healthometer.factors);
  }
  pushList("Research context", context.researchNarrative);
  pushList("What changed", context.whatChanged);
  pushList("Why it matters", context.whyItMatters);
  pushList("Evidence to review", context.evidenceToReview);
  pushList("Risks to review", context.risksToReview);
  pushList("What to watch", context.whatToWatch);
  pushList("Scanner context", context.scannerContext);
  pushList("Comparison context", context.comparisonContext);
  pushList("Watchlist context", context.watchlistContext);
  pushList("Alert context", context.alertContext);
  pushList("History", context.historicalContext);

  return blocks.join("\n").slice(0, maxChars).trim();
}

export function buildStockResearchContext(
  surface: ResearchAiSurface,
  symbol: string,
  companyName: string,
  data: unknown,
): ResearchAiContext | null {
  if (!symbol.trim()) return null;
  const baseContext =
    toResearchAiContext(data, surface) ??
    pruneEmpty({
      surface,
      symbol: sanitizeText(symbol, 24),
      companyName: sanitizeText(companyName) ?? sanitizeText(symbol, 24),
    });
  if (!baseContext) return null;
  const context = baseContext as ResearchAiContext;
  return {
    ...context,
    symbol: (context.symbol ?? symbol).trim().toUpperCase(),
    companyName: context.companyName ?? symbol.trim().toUpperCase(),
    narrative: context.researchNarrative ?? [],
    sector: context.sector ?? null,
    currentPrice: context.currentPrice ?? 0,
    changeAbs: context.changeAbs ?? 0,
    changePercent: context.changePercent ?? 0,
  };
}

export function buildScannerContext(
  symbol: string,
  companyName: string,
  scanResult: unknown,
): ResearchAiContext | null {
  if (!symbol.trim()) return null;
  const context = toResearchAiContext(scanResult, "scanner");
  return {
    ...(context ?? { surface: "scanner" as const }),
    surface: "scanner",
    symbol: (context?.symbol ?? symbol).trim().toUpperCase(),
    companyName: context?.companyName ?? sanitizeText(companyName) ?? symbol.trim().toUpperCase(),
    narrative: context?.scannerContext ?? [],
    risksToReview: context?.risksToReview ?? [],
    whatToWatch: context?.whatToWatch ?? [],
    currentPrice: context?.currentPrice ?? 0,
    changeAbs: context?.changeAbs ?? 0,
    changePercent: context?.changePercent ?? 0,
  };
}

export function buildCompareContext(
  symbols: string[],
  companies: string[],
  compareData: unknown,
): ResearchAiContext | null {
  if (symbols.length === 0) return null;
  const context = toResearchAiContext(compareData, "compare");
  const primarySymbol = symbols.slice(0, 3).join("/");
  const primaryCompany = companies.slice(0, 3).join(" vs ") || symbols[0];
  return {
    ...(context ?? { surface: "compare" as const }),
    surface: "compare",
    symbol: context?.symbol ?? primarySymbol,
    companyName: context?.companyName ?? primaryCompany,
    narrative: context?.comparisonContext ?? [],
    risksToReview: context?.risksToReview ?? [],
    whatToWatch: context?.whatToWatch ?? [],
    currentPrice: context?.currentPrice ?? 0,
    changeAbs: context?.changeAbs ?? 0,
    changePercent: context?.changePercent ?? 0,
  };
}

export function buildWatchlistContext(
  symbol: string,
  companyName: string,
  thesisData: unknown,
): ResearchAiContext | null {
  if (!symbol.trim()) return null;
  const context = toResearchAiContext(thesisData, "watchlist");
  const data = isRecord(thesisData) ? thesisData : {};
  return {
    ...(context ?? { surface: "watchlist" as const }),
    surface: "watchlist",
    symbol: (context?.symbol ?? symbol).trim().toUpperCase(),
    companyName: context?.companyName ?? sanitizeText(companyName) ?? symbol.trim().toUpperCase(),
    narrative:
      context?.watchlistContext ??
      sanitizeArray([data.thesis, data.bullCase, data.bearCase]) ??
      [],
    risksToReview: context?.risksToReview ?? [],
    whatToWatch: context?.whatToWatch ?? [],
    sector: context?.sector ?? sanitizeText(data.sector),
    currentPrice: context?.currentPrice ?? sanitizeNumber(data.currentPrice) ?? 0,
    changeAbs: context?.changeAbs ?? sanitizeNumber(data.changeAbs) ?? 0,
    changePercent: context?.changePercent ?? sanitizeNumber(data.changePercent) ?? 0,
    extraContext: context?.extraContext ?? sanitizeText(data.stance),
  };
}

export function buildAlertContext(
  symbol: string,
  companyName: string,
  alertData: unknown,
): ResearchAiContext | null {
  if (!symbol.trim()) return null;
  const context = toResearchAiContext(alertData, "alerts");
  const data = isRecord(alertData) ? alertData : {};
  return {
    ...(context ?? { surface: "alerts" as const }),
    surface: "alerts",
    symbol: (context?.symbol ?? symbol).trim().toUpperCase(),
    companyName: context?.companyName ?? sanitizeText(companyName) ?? symbol.trim().toUpperCase(),
    narrative:
      context?.alertContext ??
      sanitizeArray([
        data.change,
        ...(Array.isArray(data.summary) ? data.summary : [data.summary]),
        data.description,
      ]) ??
      [],
    risksToReview: context?.risksToReview ?? sanitizeArray(data.risksToReview ?? data.risks) ?? [],
    whatToWatch: context?.whatToWatch ?? sanitizeArray(data.whatToWatch ?? data.nextSteps) ?? [],
    sector: context?.sector ?? sanitizeText(data.sector),
    currentPrice: context?.currentPrice ?? sanitizeNumber(data.currentPrice) ?? 0,
    changeAbs: context?.changeAbs ?? sanitizeNumber(data.changeAbs) ?? 0,
    changePercent: context?.changePercent ?? sanitizeNumber(data.changePercent) ?? 0,
    extraContext: context?.extraContext ?? sanitizeText(data.changeType),
  };
}

export function compressResearchContext(context: ResearchAiContext, maxChars = DEFAULT_MAX_CHARS): ResearchAiContext {
  return {
    ...context,
    narrative: compressResearchAiContext(context, maxChars).split("\n").filter(Boolean).slice(0, MAX_ITEMS),
  };
}
