export type CompanySectorMapping = {
  /**
   * Label shown on the company overview (calm, educational naming).
   * Should be human-friendly, not “explore ids”.
   */
  label: string;

  /**
   * If defined, we can navigate to the existing explore sector environment:
   * - page=explore
   * - kind=sector
   * - id=<exploreId>
   */
  exploreId?: string;
};

/**
 * StockStory India has a curated set of sector environments in discovery.
 * This helper maps common NSE tickers to those existing environments.
 *
 * If a ticker maps to a broader sector that doesn’t exist in discovery yet,
 * we still return a label, but omit exploreId (so "View Sector" can be disabled safely).
 */
export function getCompanySectorMapping(tickerRaw: string): CompanySectorMapping {
  const ticker = tickerRaw.toUpperCase().trim();

  // Discovery currently includes: Banking, IT, Energy, FMCG, Pharma, Defence.
  const map: Record<string, CompanySectorMapping> = {
    INFY: { label: "IT Services", exploreId: "sec_it" },
    TCS: { label: "IT Services", exploreId: "sec_it" },

    HDFCBANK: { label: "Banking", exploreId: "sec_banking" },
    ICICIBANK: { label: "Banking", exploreId: "sec_banking" },
    SBIN: { label: "Banking", exploreId: "sec_banking" },

    RELIANCE: { label: "Energy", exploreId: "sec_energy" },

    ITC: { label: "FMCG", exploreId: "sec_fmcg" },
    HINDUNILVR: { label: "FMCG", exploreId: "sec_fmcg" },

    // Optional common pharma tickers (best-effort)
    SUNPHARMA: { label: "Pharma", exploreId: "sec_pharma" },
    DRREDDY: { label: "Pharma", exploreId: "sec_pharma" },

    // Optional common defence tickers (best-effort)
    HAL: { label: "Defence", exploreId: "sec_defence" },
    INDIGO: { label: "Defence", exploreId: "sec_defence" }, // placeholder fallback; kept to avoid empty label
  };

  return map[ticker] ?? { label: "Multi-sector" };
}
