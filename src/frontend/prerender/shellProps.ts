/**
 * Props shared by every design page: nav, breadcrumbs, the index tape and the
 * market-status strip.
 *
 * Two problems this solves across all 16 pages:
 *   - Links are literal design filenames ('StockStory Scanner.dc.html'), which
 *     404 on a real site. They are rewritten to real routes here.
 *   - The index tape carries invented index levels (PSE Index 6,842.15,
 *     All Shares 3,614.20, …) and the header asserts "Market is Open" no matter
 *     when the page is served. Both are replaced with real values, or emptied.
 *
 * navItems is additionally duplicated as a copy-pasted array in 11 of the 16
 * pages, and Stock Detail's copy has drifted (its `active` flag sits on the
 * wrong entry). Supplying it from here makes one definition authoritative.
 */

const EMPTY = "—";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Design filename -> real route. */
export const HREF_MAP: Record<string, string> = {
  "StockStory Shell.dc.html": "/",
  "StockStory Stock Detail.dc.html": "/stock/BDO",
  "StockStory Scanner.dc.html": "/scanner",
  "StockStory Rankings.dc.html": "/rankings",
  "StockStory Compare.dc.html": "/compare",
  "StockStory Watchlist.dc.html": "/watchlist",
  "StockStory Portfolio.dc.html": "/portfolio",
  "StockStory Sectors.dc.html": "/sectors",
  "StockStory Sector Detail.dc.html": "/sectors",
  "StockStory Alerts.dc.html": "/alerts",
  "StockStory Pricing.dc.html": "/pricing",
  "StockStory Methodology.dc.html": "/trust",
  "StockStory About.dc.html": "/about",
  "StockStory Settings.dc.html": "/settings",
  "StockStory Search.dc.html": "/scanner",
  "StockStory Sign In.dc.html": "/login",
};

/** Which nav entry is highlighted, keyed by the page being rendered. */
export type NavKey =
  | "Research" | "Scanner" | "Compare" | "Watchlist"
  | "Portfolio" | "Pricing" | "Methodology" | null;

export function buildNavItems(active: NavKey): Array<Record<string, unknown>> {
  const items: Array<{ label: NonNullable<NavKey>; href: string; caret?: boolean }> = [
    { label: "Research", href: "/scanner", caret: true },
    { label: "Scanner", href: "/scanner" },
    { label: "Compare", href: "/compare" },
    { label: "Watchlist", href: "/watchlist" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Pricing", href: "/pricing" },
    { label: "Methodology", href: "/trust" },
  ];
  return items.map((i) => ({
    label: i.label,
    href: i.href,
    caret: Boolean(i.caret),
    active: i.label === active,
  }));
}

/**
 * Breadcrumb trail. The template reads `cb.color` and `cb.sep` per entry
 * (`sc-if value="{{ cb.sep }}"` draws the chevron), so both must be supplied
 * or the separators silently disappear.
 */
export function buildCrumbs(
  trail: Array<{ label: string; href?: string }>,
): Array<Record<string, unknown>> {
  return trail.map((c, i) => ({
    label: c.label,
    href: c.href ?? "#",
    // Last crumb is the current page: darker, and no trailing chevron.
    color: i === trail.length - 1 ? "#0A0A0A" : "#6B6B66",
    sep: i < trail.length - 1,
  }));
}

export interface MarketIndex {
  name: string;
  value: number | null;
  changePercent: number | null;
  low?: number | null;
  high?: number | null;
}

/**
 * Index tape entries. `pos` is the marker's position along the day's range;
 * without a real low/high it is centred rather than implying a position.
 * `topRule` reproduces the design's own responsive divider, which the page
 * normally computes in its own .map() — overriding `indices` bypasses that.
 */
export function buildIndices(indices: MarketIndex[]): Array<Record<string, unknown>> {
  const fmt = (v: number | null | undefined, dp = 2) =>
    isNum(v) ? v.toLocaleString("en-PH", { minimumFractionDigits: dp, maximumFractionDigits: dp }) : EMPTY;

  return indices.map((ix) => {
    const pct = ix.changePercent;
    let pos = "50%";
    if (isNum(ix.value) && isNum(ix.low) && isNum(ix.high) && ix.high > ix.low) {
      const fraction = (ix.value - ix.low) / (ix.high - ix.low);
      pos = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
    }
    return {
      name: ix.name,
      value: fmt(ix.value),
      change: isNum(pct) ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : EMPTY,
      color: !isNum(pct) || pct === 0 ? "#6B6B66" : pct > 0 ? "#1A7F37" : "#D93025",
      low: fmt(ix.low, 0),
      high: fmt(ix.high, 0),
      pos,
      topRule: "0",
    };
  });
}

export interface ShellInput {
  active: NavKey;
  crumbs?: Array<{ label: string; href?: string }>;
  indices?: MarketIndex[];
  /** True/false when known; null when the market state could not be resolved. */
  marketOpen?: boolean | null;
  /** e.g. "3:30 PM PHT" — omitted when unknown rather than asserted. */
  closesAt?: string | null;
}

/** Assemble the shared props every page receives. */
export function buildShellProps(input: ShellInput): Record<string, unknown> {
  const props: Record<string, unknown> = {
    navItems: buildNavItems(input.active),
  };

  if (input.crumbs) props.crumbs = buildCrumbs(input.crumbs);

  // An empty tape renders as blank cells rather than invented index levels.
  props.indices = buildIndices(input.indices ?? []);

  props.marketStatusText =
    input.marketOpen === true ? "Market is Open"
      : input.marketOpen === false ? "Market is Closed"
        : "Market status unavailable";
  props.closesText = input.closesAt ? `Closes ${input.closesAt}` : "";

  return props;
}
