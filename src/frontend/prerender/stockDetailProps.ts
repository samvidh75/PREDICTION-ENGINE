/**
 * Map a /api/stock/:symbol response onto the Stock Detail template's
 * renderVals() keys.
 *
 * Contract with the dc-runtime: props are merged *over* renderVals(), so a key
 * that is omitted falls back to the design's own default. That makes omission
 * meaningful — this module omits a key only when the design default is
 * acceptable, and otherwise supplies an explicit em-dash placeholder so a page
 * never presents BDO's mock figure as another company's data.
 *
 * Rules applied throughout:
 *   - real value        -> formatted and supplied
 *   - value unavailable -> EMPTY ("—"), never a zero, guess, or leftover mock
 *   - score unavailable -> "Not yet rated", never a number
 */

/** Shown wherever a real value could not be sourced. */
const EMPTY = "—";

export interface StockApiResponse {
  symbol: string;
  companyName?: string | null;
  sector?: string | null;
  industry?: string | null;
  price?: {
    current?: number | null;
    changeAbs?: number | null;
    changePercent?: number | null;
    marketCap?: number | null;
  } | null;
  fundamentals?: Record<string, unknown> | null;
  scores?: Record<string, number | null> | null;
  scoreConfidence?: number | null;
  scoreLabel?: string | null;
  roe?: number | null;
  debtToEquity?: number | null;
  priceHistory?: Array<{ date: string; close: number }> | null;
  news?: Array<Record<string, unknown>> | null;
  updatedAt?: string | null;
  asOf?: string | null;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** ₱1,234.50 */
export function peso(value: unknown, dp = 2): string {
  if (!isNum(value)) return EMPTY;
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

/** Compact peso for large figures: ₱758.4B / ₱12.3M. Input is raw pesos. */
export function pesoCompact(value: unknown): string {
  if (!isNum(value) || value <= 0) return EMPTY;
  const units: Array<[number, string]> = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (value >= size) return `₱${(value / size).toFixed(1)}${suffix}`;
  }
  return `₱${value.toFixed(0)}`;
}

/** +2.55 (+1.82%) — sign always explicit so a gain is never read as a loss. */
export function changeText(abs: unknown, pct: unknown): string {
  if (!isNum(abs) || !isNum(pct)) return EMPTY;
  const sign = abs >= 0 ? "+" : "";
  return `${sign}${abs.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
}

export function ratio(value: unknown, suffix = "x", dp = 1): string {
  return isNum(value) ? `${value.toFixed(dp)}${suffix}` : EMPTY;
}

export function percent(value: unknown, dp = 2): string {
  return isNum(value) ? `${value.toFixed(dp)}%` : EMPTY;
}

/** Compact share volume: 4.82M. */
export function volume(value: unknown): string {
  if (!isNum(value) || value <= 0) return EMPTY;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return String(Math.round(value));
}

/** Gain green / loss red, matching the design's own palette. */
export function directionColor(value: unknown): string {
  if (!isNum(value) || value === 0) return "#6B6B66";
  return value > 0 ? "#1A7F37" : "#D93025";
}

/**
 * Circumference-based dash for the score gauge. The template computes
 * `C = 2 * Math.PI * 54`; an unrated stock gets a zero-length arc rather than
 * the design's 88%-filled ring.
 */
export function gaugeDash(score: number | null): string {
  const C = 2 * Math.PI * 54;
  const fraction = isNum(score) ? Math.max(0, Math.min(100, score)) / 100 : 0;
  return `${(C * fraction).toFixed(1)} ${C.toFixed(1)}`;
}

/** Build the five factor bars, omitting the width for unscored factors. */
function factorBars(scores: Record<string, number | null> | null | undefined) {
  const order: Array<[string, string]> = [
    ["Quality", "quality"],
    ["Growth", "growth"],
    ["Valuation", "valuation"],
    ["Risk", "risk"],
    ["Momentum", "momentum"],
  ];
  return order.map(([name, key]) => {
    const score = scores?.[key];
    return isNum(score)
      ? { name, score: Math.round(score), width: `${Math.round(score)}%` }
      : // Empty bar + em-dash: the factor is visibly present but unrated,
        // rather than silently inheriting the design's mock score.
        { name, score: EMPTY, width: "0%" };
  });
}

export interface StockDetailProps {
  [key: string]: unknown;
}

/** Map an API response to Stock Detail template props. */
export function buildStockDetailProps(api: StockApiResponse): StockDetailProps {
  const price = api.price ?? {};
  const f = (api.fundamentals ?? {}) as Record<string, unknown>;
  const scores = api.scores ?? null;
  const composite = isNum(scores?.health) ? (scores!.health as number) : null;

  // "Financials · Banks", collapsing to one term when sector and industry match.
  const sectorLine = [api.sector, api.industry]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(" · ");

  return {
    // ── Identity ────────────────────────────────────────────────────────
    avatarText: api.symbol.slice(0, 4).toUpperCase(),
    companyNameText: api.companyName || api.symbol,
    tickerText: api.symbol.toUpperCase(),
    sectorText: sectorLine || EMPTY,

    // ── Quote ───────────────────────────────────────────────────────────
    priceText: peso(price.current),
    changeText: changeText(price.changeAbs, price.changePercent),
    changeColor: directionColor(price.changePercent),
    asOfText: api.asOf
      ? `As of ${new Date(api.asOf).toLocaleString("en-PH", {
          day: "numeric", month: "short", year: "numeric",
        })} PHT`
      : EMPTY,

    quoteFacts: [
      { label: "Market cap", value: pesoCompact(price.marketCap) },
      // Intraday high/low and 52-week bounds are not in the payload; showing
      // the design's BDO ranges here would be fabricating this stock's range.
      { label: "Day range", value: EMPTY },
      { label: "52-week range", value: EMPTY },
      { label: "Volume", value: volume((f as { volume?: number }).volume) },
    ],

    // ── Score ───────────────────────────────────────────────────────────
    scoreText: isNum(composite) ? String(Math.round(composite)) : EMPTY,
    scoreLabel: api.scoreLabel || (isNum(composite) ? "" : "Not yet rated"),
    scoreLabelColor: isNum(composite) ? "#1A7F37" : "#6B6B66",
    gaugeDash: gaugeDash(composite),
    factorBars: factorBars(scores),
    coverageText: isNum(api.scoreConfidence)
      ? `${Math.round(api.scoreConfidence)}% of key metrics`
      : EMPTY,

    // ── Research narrative ──────────────────────────────────────────────
    // stockHandler labels its thesis `dataSources.thesis: 'synthetic'` — it is
    // templated text, identical for every stock. Rather than reprint BDO's
    // summary under another company's name, the panel states its own absence.
    narrativeText: `Research summary for ${api.companyName || api.symbol} is not yet available. Figures below are sourced from PSE filings and live market data.`,
    thesisPoints: [],
    strengths: [],
    risks: [],
    // Peer comparison needs a scored same-sector cohort; showing the design's
    // hardcoded bank list beside an unrelated company would be misleading.
    peers: [],

    // ── Valuation ───────────────────────────────────────────────────────
    // Only the live price is a real input here. Fair value, margin of safety
    // and the bear/base/bull spread come from a DCF this mapper is not given,
    // so they stay blank rather than inheriting BDO's ₱158.40.
    fairValueText: EMPTY,
    valuationRows: [
      { label: "Current price", value: peso(price.current), color: "#0A0A0A" },
      { label: "Margin of safety", value: EMPTY },
      { label: "Estimate uncertainty", value: EMPTY },
    ],
    scenarios: [
      { label: "Bear case", value: EMPTY },
      { label: "Base case", value: EMPTY, align: "center" },
      { label: "Bull case", value: EMPTY, align: "right" },
    ],
    chartReturnText: EMPTY,
    benchReturnText: EMPTY,
    upsideText: EMPTY,

    // Data-quality verdict, derived from measured coverage rather than
    // asserted. Below 60% of scoring inputs the page says so plainly.
    confidenceOverall: isNum(api.scoreConfidence)
      ? (api.scoreConfidence >= 80 ? "High" : api.scoreConfidence >= 60 ? "Partial" : "Limited")
      : EMPTY,
    confidenceColor: isNum(api.scoreConfidence) && api.scoreConfidence >= 60 ? "#1A7F37" : "#B26B00",

    // ── Breadcrumb ──────────────────────────────────────────────────────
    crumbs: [
      { label: "Home", href: "/" },
      { label: "Research", href: "/scanner" },
      ...(api.sector ? [{ label: api.sector, href: "/sectors" }] : []),
      { label: api.symbol.toUpperCase() },
    ],

    // ── Panels with no per-stock source ─────────────────────────────────
    // Each of these rendered BDO's own figures on every page: its revenue and
    // margin history, its quarterly commentary, its results calendar. None are
    // available per-symbol, so they are emptied rather than misattributed.
    fundamentals: [],
    changes: [],
    events: [],

    // Design asserts "Primary filings complete / Figures cross-checked /
    // Reviewed by an analyst" with green ticks. No analyst reviews these pages,
    // so the panel reports the measured input coverage instead of claiming
    // human sign-off.
    confidence: [
      {
        label: isNum(api.scoreConfidence)
          ? `${Math.round(api.scoreConfidence)}% of scoring inputs available`
          : "Input coverage unavailable",
      },
      { label: "Sourced from PSE filings and market data" },
    ],

    // ── Performance chart ───────────────────────────────────────────────
    // The design synthesises both series with a seeded random walk. Without
    // real history the chart is emptied rather than drawing an invented
    // price path and labelling it this company's performance.
    chartLine: "",
    chartBench: "",
    chartArea: "",
    yAxis: [],
    xAxis: [],

    // ── Key metrics ─────────────────────────────────────────────────────
    keyMetrics: [
      { label: "P/E (trailing)", value: ratio(f.pe) },
      { label: "P/B", value: ratio(f.pb, "x", 2) },
      { label: "Dividend yield", value: percent(f.dividendYield) },
      { label: "EPS", value: peso(f.eps) },
      { label: "Return on equity", value: percent(api.roe) },
      { label: "Debt to equity", value: ratio(api.debtToEquity, "", 2) },
      { label: "Net margin", value: percent(f.netMargin) },
    ],
  };
}
