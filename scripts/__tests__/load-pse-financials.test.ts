import { describe, expect, it } from "vitest";
import {
  buildSymbolSnapshots,
  growthPct,
  parseArgs,
  parseAsOfDate,
  parseFilingDate,
  pct,
  ratioOf,
  type PseRecord,
} from "../load-pse-financials";

/** SMPH-shaped fixture with real scraped values and known ratios. */
function makeSmphRecord(): PseRecord {
  return {
    symbol: "SMPH",
    series: [
      {
        period: "Nov 14, 2025 10:00 AM",
        asOfPeriod: "Sep 30, 2025",
        revenue: 30000000, netIncome: 10000000,
        totalAssets: 1000000000, totalEquity: 400000000, totalLiabilities: 600000000,
        eps: 0.35, operatingIncome: 400000,
      },
      {
        period: "Feb 14, 2026 10:00 AM",
        asOfPeriod: "Dec 31, 2025",
        revenue: 33000000, netIncome: 11000000,
        totalAssets: 1050000000, totalEquity: 420000000, totalLiabilities: 630000000,
        eps: 0.38, operatingIncome: 440000,
      },
      {
        period: "May 13, 2026 07:39 AM",
        asOfPeriod: "Mar 31, 2026",
        revenue: 33747754, netIncome: 11867110,
        totalAssets: 1110879784, totalEquity: 478312855, totalLiabilities: 632566929,
        eps: 0.41, operatingIncome: 469053,
      },
    ],
    annualSeries: [
      {
        period: "Apr 14, 2025 10:47 AM",
        asOfPeriod: "Dec 31, 2024",
        revenue: 142619595, netIncome: 46539436,
        totalAssets: 1019430730, totalEquity: 436240490, totalLiabilities: 583190240,
        eps: 1.58, operatingIncome: 2228723,
      },
    ],
    latest: {
      period: "May 13, 2026 07:39 AM",
      asOfPeriod: "Mar 31, 2026",
      revenue: 33747754, netIncome: 11867110,
      totalAssets: 1110879784, totalEquity: 478312855, totalLiabilities: 632566929,
      eps: 0.41, operatingIncome: 469053,
      roe: 2.48, debtToEquity: 1.32, sharesOutstanding: null,
      scrapedAt: "2026-08-07T10:11:31.168Z",
    },
  };
}

describe("parseAsOfDate", () => {
  it("parses abbreviated month names", () => {
    expect(parseAsOfDate("Mar 31, 2026")).toBe("2026-03-31");
    expect(parseAsOfDate("Jun 30, 2024")).toBe("2024-06-30");
  });

  it("parses full month names (DELM filings use 'April')", () => {
    expect(parseAsOfDate("April 30, 2025")).toBe("2025-04-30");
  });

  it("ignores trailing time text (the `period` field)", () => {
    expect(parseAsOfDate("Aug 14, 2024 10:17 AM")).toBe("2024-08-14");
  });

  it("rejects garbage and wrong formats", () => {
    expect(parseAsOfDate("31 Mar 2026")).toBeNull();
    expect(parseAsOfDate("sometime in 2026")).toBeNull();
    expect(parseAsOfDate(null)).toBeNull();
    expect(parseAsOfDate(undefined)).toBeNull();
  });
});

describe("parseFilingDate", () => {
  it("reuses the date prefix of the publish datetime", () => {
    expect(parseFilingDate("May 13, 2026 07:39 AM")).toBe("2026-05-13");
    expect(parseFilingDate(null)).toBeNull();
  });
});

describe("ratio helpers", () => {
  it("pct computes percent and guards non-positive denominators", () => {
    expect(pct(10000000, 400000000)).toBe(2.5);
    expect(pct(10, 0)).toBeNull();
    expect(pct(10, -5)).toBeNull();
    expect(pct(null, 100)).toBeNull();
  });

  it("ratioOf keeps a decimal ratio and guards non-positive denominators", () => {
    expect(ratioOf(600000000, 400000000)).toBe(1.5);
    expect(ratioOf(10, 0)).toBeNull();
    expect(ratioOf(null, 5)).toBeNull();
  });

  it("growthPct returns null when the base is missing or non-positive", () => {
    expect(growthPct(110, 100)).toBe(10);
    expect(growthPct(100, 0)).toBeNull();
    expect(growthPct(100, -10)).toBeNull();
    expect(growthPct(100, null)).toBeNull();
  });
});

describe("buildSymbolSnapshots", () => {
  it("returns an empty list for error records", () => {
    expect(buildSymbolSnapshots("AAA", { symbol: "AAA", error: "no_disclosure_found" })).toEqual([]);
  });

  it("produces chronological rows, dedupes latest, and never cross-contaminates cadences", () => {
    const rows = buildSymbolSnapshots("SMPH", makeSmphRecord());
    expect(rows.map((r) => r.period_end)).toEqual([
      "2024-12-31", "2025-09-30", "2025-12-31", "2026-03-31",
    ]);

    const [annual, q1, q2, q3] = rows;

    // First period of each cadence has no growth — even though a different
    // cadence (annual Dec 2024) exists just before q1 (Sep 2025).
    expect(annual.revenue_growth).toBeNull();
    expect(annual.profit_growth).toBeNull();
    expect(q1.revenue_growth).toBeNull();
    expect(q2.revenue_growth).toBe(10); // vs q1
    expect(q3.revenue_growth).toBe(2.27); // vs q2

    // snapshot_date is the filing publish date, not "today".
    expect(annual.snapshot_date).toBe("2025-04-14");
    expect(q3.snapshot_date).toBe("2026-05-13");
  });

  it("computes source-accurate ratios on the newest snapshot", () => {
    const rows = buildSymbolSnapshots("SMPH", makeSmphRecord());
    const latest = rows[rows.length - 1];
    expect(latest.symbol).toBe("SMPH");
    expect(latest.period_end).toBe("2026-03-31");
    expect(latest.eps).toBe(0.41);
    expect(latest.roe).toBe(2.48); // netIncome/totalEquity
    expect(latest.roa).toBe(1.07); // netIncome/totalAssets
    expect(latest.debt_to_equity).toBe(1.3225); // decimal ratio
    expect(latest.operating_margin).toBe(1.39); // operatingIncome/revenue
    expect(latest.profit_growth).toBe(7.88);
    expect(latest.eps_growth).toBe(7.89);
  });

  it("keeps fields the scraped source does not provide as NULL (never fabricates)", () => {
    for (const row of buildSymbolSnapshots("SMPH", makeSmphRecord())) {
      expect(row.market_cap).toBeNull();
      expect(row.pe_ratio).toBeNull();
      expect(row.dividend_yield).toBeNull();
      expect(row.beta).toBeNull();
      expect(row.free_float).toBeNull();
      expect(row.fcf_yield).toBeNull();
      expect(row.ev_ebitda).toBeNull();
      expect(row.roic).toBeNull();
      expect(row.current_ratio).toBeNull();
      expect(row.gross_margin).toBeNull();
      expect(row.pb_ratio).toBeNull();
      expect(row.fcf_growth).toBeNull();
    }
  });

  it("returns null ratios when statement fields are missing or non-positive", () => {
    const rec: PseRecord = {
      symbol: "X",
      series: [
        {
          period: "May 13, 2026 07:39 AM",
          asOfPeriod: "Mar 31, 2026",
          revenue: 0, netIncome: 10000000,
          totalAssets: undefined, totalEquity: 0, totalLiabilities: 50000000,
          eps: null, operatingIncome: null,
        },
      ],
    };
    const [row] = buildSymbolSnapshots("X", rec);
    expect(row.eps).toBeNull();
    expect(row.roe).toBeNull(); // equity <= 0
    expect(row.debt_to_equity).toBeNull(); // equity <= 0
    expect(row.roa).toBeNull(); // assets missing
    expect(row.operating_margin).toBeNull(); // revenue 0 / op income missing
  });

  it("does not report growth off a loss-making base period", () => {
    const rec: PseRecord = {
      symbol: "LOSS",
      series: [
        {
          period: "Nov 14, 2025 10:00 AM",
          asOfPeriod: "Sep 30, 2025",
          revenue: 1000000, netIncome: -5000000, totalAssets: 100000000, totalEquity: 50000000,
          totalLiabilities: 50000000, eps: -1.2, operatingIncome: -4000000,
        },
        {
          period: "Feb 14, 2026 10:00 AM",
          asOfPeriod: "Dec 31, 2025",
          revenue: 2000000, netIncome: 1000000, totalAssets: 100000000, totalEquity: 50000000,
          totalLiabilities: 50000000, eps: 0.2, operatingIncome: 500000,
        },
      ],
    };
    const rows = buildSymbolSnapshots("LOSS", rec);
    expect(rows[1].profit_growth).toBeNull(); // base netIncome was negative
    expect(rows[1].eps_growth).toBeNull(); // base eps was negative
    expect(rows[1].revenue_growth).toBe(100); // base revenue positive
  });

  it("handles a latest-only record (no series)", () => {
    const rec: PseRecord = {
      symbol: "LATEST",
      latest: {
        period: "May 13, 2026 07:39 AM",
        asOfPeriod: "Mar 31, 2026",
        eps: 0.41, revenue: 33747754, netIncome: 11867110,
        totalAssets: 1110879784, totalEquity: 478312855, totalLiabilities: 632566929,
        operatingIncome: 469053, roe: 2.48, debtToEquity: 1.32,
      },
    };
    const rows = buildSymbolSnapshots("LATEST", rec);
    expect(rows).toHaveLength(1);
    expect(rows[0].period_end).toBe("2026-03-31");
    expect(rows[0].snapshot_date).toBe("2026-05-13");
    expect(rows[0].revenue_growth).toBeNull();
  });
});

describe("parseArgs", () => {
  it("parses apply / limit / symbols with dry-run default", () => {
    expect(parseArgs([])).toEqual({ apply: false });
    expect(parseArgs(["--apply"])).toEqual({ apply: true });
    expect(parseArgs(["--limit=5"])).toEqual({ apply: false, limit: 5 });
    expect(parseArgs(["--symbols=smph,bdo"])).toEqual({ apply: false, symbols: ["SMPH", "BDO"] });
    expect(parseArgs(["--apply", "--symbols=MPI"])).toEqual({ apply: true, symbols: ["MPI"] });
  });
});

