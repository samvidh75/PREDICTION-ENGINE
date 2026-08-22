/**
 * Map the real PSE universe onto the Sectors design template.
 *
 * Two corrections the design needs:
 *
 *  - Its eight hardcoded tiles include "Utilities" and "Consumer", which are
 *    not PSE classifications. The exchange uses six: Financials, Industrial,
 *    Holding Firms, Property, Services, and Mining and Oil. Companies are
 *    grouped by their real PSE EDGE sector (data/pse-sectors.json) rather than
 *    forced into invented buckets.
 *
 *  - Its per-sector returns are hardcoded across 1D/1W/1M/1Y/YTD. 1D comes from
 *    today's percentChange and 1W/1M from the backfilled daily closes, but a
 *    year of history does not exist (~70,000 requests to build), so 1Y and YTD
 *    report EMPTY instead of a fabricated figure.
 */

const EMPTY = "—";

const UP = "#1A7F37";
const DOWN = "#D93025";
const FLAT = "#6B6B66";

/** The exchange's own six sectors, in the order the design lists them. */
export const PSE_SECTORS = [
  "Financials",
  "Industrial",
  "Holding Firms",
  "Property",
  "Services",
  "Mining and Oil",
] as const;

export interface SectorQuote {
  symbol: string;
  sector: string | null;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
}

export type RangeKey = "1D" | "1W" | "1M" | "1Y" | "YTD";

/** Trading days back for each range. 1Y/YTD are absent, not zero. */
const RANGE_DAYS: Partial<Record<RangeKey, number>> = { "1W": 5, "1M": 21 };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function pct(value: number | null): string {
  if (!isNum(value)) return EMPTY;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function colorFor(value: number | null): string {
  if (!isNum(value)) return FLAT;
  return value > 0 ? UP : value < 0 ? DOWN : FLAT;
}

/**
 * Percentage move over `days` trading sessions from a close series.
 * Returns null when the series is too short — never extrapolates.
 */
export function windowReturn(closes: number[], days: number): number | null {
  if (closes.length <= days) return null;
  const latest = closes[closes.length - 1];
  const prior = closes[closes.length - 1 - days];
  if (!isNum(latest) || !isNum(prior) || prior === 0) return null;
  return ((latest - prior) / prior) * 100;
}

interface SectorAggregate {
  name: string;
  members: SectorQuote[];
  /** Market-cap weighted return per range; null where unavailable. */
  changes: Record<RangeKey, number | null>;
  /** Share of members up today, 0-1. */
  advancing: number;
  marketCap: number | null;
}

/**
 * Aggregate quotes into the six sectors.
 *
 * Returns are market-cap weighted so a sector is not swung by a micro-cap's
 * percentage move; members without a market cap fall back to equal weight
 * rather than being dropped.
 */
export function aggregateSectors(
  quotes: SectorQuote[],
  historyBySymbol: Record<string, number[]> = {},
): SectorAggregate[] {
  return PSE_SECTORS.map((name) => {
    const members = quotes.filter((q) => q.sector === name);

    const weightFor = (q: SectorQuote) => (isNum(q.marketCap) && q.marketCap > 0 ? q.marketCap : 1);

    const weighted = (valueOf: (q: SectorQuote) => number | null): number | null => {
      let sum = 0;
      let weight = 0;
      for (const q of members) {
        const value = valueOf(q);
        if (!isNum(value)) continue;
        const w = weightFor(q);
        sum += value * w;
        weight += w;
      }
      return weight > 0 ? sum / weight : null;
    };

    const changes: Record<RangeKey, number | null> = {
      "1D": weighted((q) => q.changePercent),
      "1W": weighted((q) => windowReturn(historyBySymbol[q.symbol] ?? [], RANGE_DAYS["1W"]!)),
      "1M": weighted((q) => windowReturn(historyBySymbol[q.symbol] ?? [], RANGE_DAYS["1M"]!)),
      // Not computable from ~65 trading days of history.
      "1Y": null,
      YTD: null,
    };

    const rated = members.filter((q) => isNum(q.changePercent));
    const advancing = rated.length > 0
      ? rated.filter((q) => (q.changePercent as number) > 0).length / rated.length
      : 0;

    const caps = members.map((q) => q.marketCap).filter(isNum);
    const marketCap = caps.length > 0 ? caps.reduce((a, b) => a + b, 0) : null;

    return { name, members, changes, advancing, marketCap };
  });
}

/** Build the template props for a given range selection. */
export function buildSectorsProps(
  quotes: SectorQuote[],
  historyBySymbol: Record<string, number[]> = {},
  range: RangeKey = "1D",
): Record<string, unknown> {
  const aggregates = aggregateSectors(quotes, historyBySymbol);

  // Sectors with a value first, descending; unrated ones sort last so the
  // "strongest"/"weakest" summary never picks an unmeasured sector.
  const sorted = [...aggregates].sort((a, b) => {
    const av = a.changes[range];
    const bv = b.changes[range];
    if (!isNum(av) && !isNum(bv)) return 0;
    if (!isNum(av)) return 1;
    if (!isNum(bv)) return -1;
    return bv - av;
  });

  const values = sorted.map((s) => s.changes[range]).filter(isNum);
  const maxAbs = values.length > 0 ? Math.max(...values.map(Math.abs)) : 0;

  const bar = (value: number | null) => {
    if (!isNum(value) || maxAbs === 0) return { left: "50%", width: "0%" };
    const magnitude = (Math.abs(value) / maxAbs) * 50;
    return {
      left: value >= 0 ? "50%" : `${(50 - magnitude).toFixed(1)}%`,
      width: `${magnitude.toFixed(1)}%`,
    };
  };

  const rated = sorted.filter((s) => isNum(s.changes[range]));
  const advancing = rated.filter((s) => (s.changes[range] as number) > 0).length;
  const covered = quotes.filter((q) => q.sector && (PSE_SECTORS as readonly string[]).includes(q.sector)).length;

  return {
    sectors: sorted.map((s) => {
      const value = s.changes[range];
      const b = bar(value);
      return {
        name: s.name,
        change: pct(value),
        color: colorFor(value),
        barLeft: b.left,
        barWidth: b.width,
        // No per-sector composite yet — the scoring pipeline runs per symbol.
        avgScore: EMPTY,
        leader: s.members[0]?.symbol ?? EMPTY,
        leaderColor: FLAT,
      };
    }),

    heatRows: sorted.map((s) => ({
      name: s.name,
      change: pct(s.changes[range]),
      color: colorFor(s.changes[range]),
    })),

    breadth: [...aggregates]
      .sort((a, b) => b.advancing - a.advancing)
      .map((s) => ({
        name: s.name,
        pct: `${Math.round(s.advancing * 100)}%`,
        width: `${Math.round(s.advancing * 100)}%`,
        color: s.advancing >= 0.5 ? UP : DOWN,
      })),

    summary: [
      {
        label: "Advancing sectors",
        value: rated.length > 0 ? `${advancing} of ${rated.length}` : EMPTY,
        color: advancing * 2 >= rated.length ? UP : DOWN,
        sub: rated.length > 0 ? "Breadth measured" : "Not measurable",
      },
      {
        label: "Strongest",
        value: rated.length > 0 ? pct(rated[0].changes[range]) : EMPTY,
        color: UP,
        sub: rated[0]?.name ?? EMPTY,
      },
      {
        label: "Weakest",
        value: rated.length > 0 ? pct(rated[rated.length - 1].changes[range]) : EMPTY,
        color: DOWN,
        sub: rated[rated.length - 1]?.name ?? EMPTY,
      },
      {
        label: "Companies covered",
        value: String(covered),
        color: "#0A0A0A",
        sub: `Across ${PSE_SECTORS.length} PSE sectors`,
      },
    ],
  };
}
