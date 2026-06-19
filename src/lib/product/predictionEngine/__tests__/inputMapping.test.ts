import { describe, expect, it } from "vitest";
import {
  normalizeCompanyDetail,
  normalizeScannerRow,
  normalizeRankingsRow,
  normalizeCompareCompany,
  normalizeWatchlistCompany,
} from "../inputMapping";

describe("normalizeCompanyDetail", () => {
  it("preserves valid numeric values", () => {
    const result = normalizeCompanyDetail({
      symbol: "RELIANCE",
      pe: 15.5,
      pb: 2.1,
      roe: 18.5,
      revenueGrowth: 0.12,
    });
    expect(result.symbol).toBe("RELIANCE");
    expect(result.pe).toBe(15.5);
    expect(result.pb).toBe(2.1);
    expect(result.roe).toBe(18.5);
    expect(result.revenueGrowth).toBe(0.12);
  });

  it("preserves zero values", () => {
    const result = normalizeCompanyDetail({ symbol: "TEST", pe: 0, roe: 0 });
    expect(result.pe).toBe(0);
    expect(result.roe).toBe(0);
  });

  it("coerces missing values to null", () => {
    const result = normalizeCompanyDetail({ symbol: "TEST" });
    expect(result.pe).toBeNull();
    expect(result.pb).toBeNull();
    expect(result.roe).toBeNull();
  });

  it("rejects NaN, Infinity, and invalid strings", () => {
    const result = normalizeCompanyDetail({
      symbol: "TEST",
      pe: NaN as any,
      pb: Infinity as any,
      roe: "not-a-number" as any,
      revenueGrowth: null as any,
    });
    expect(result.pe).toBeNull();
    expect(result.pb).toBeNull();
    expect(result.roe).toBeNull();
    expect(result.revenueGrowth).toBeNull();
  });

  it("defaults missing symbol to empty string", () => {
    const result = normalizeCompanyDetail({});
    expect(result.symbol).toBe("");
  });

  it("does not fabricate output fields", () => {
    const result = normalizeCompanyDetail({ symbol: "TEST", pe: 15 });
    const keys = Object.keys(result);
    expect(keys).toEqual([
      "symbol", "pe", "pb", "evEbitda", "dividendYield",
      "roe", "roic", "roa", "operatingMargin",
      "revenueGrowth", "profitGrowth", "debtEquity",
      "marketCap", "eps", "currentRatio",
      "volatility", "momentum", "rsi", "macd",
      "factorScores",
    ]);
  });
});

describe("normalizeScannerRow", () => {
  it("maps symbol and score correctly", () => {
    const result = normalizeScannerRow({ symbol: "TCS", score: 78, rank: 5, conviction: "Healthy" });
    expect(result.symbol).toBe("TCS");
    expect(result.score).toBe(78);
    expect(result.rank).toBe(5);
    expect(result.conviction).toBe("Healthy");
  });

  it("defaults missing fields to null", () => {
    const result = normalizeScannerRow({ symbol: "TCS" });
    expect(result.score).toBeNull();
    expect(result.rank).toBeNull();
    expect(result.conviction).toBeNull();
  });

  it("rejects invalid numeric values", () => {
    const result = normalizeScannerRow({ symbol: "TCS", score: "N/A" as any });
    expect(result.score).toBeNull();
  });

  it("does not fabricate extra fields", () => {
    const result = normalizeScannerRow({ symbol: "TCS", score: 50 });
    expect(Object.keys(result)).toEqual(["symbol", "score", "rank", "conviction"]);
  });
});

describe("normalizeRankingsRow", () => {
  it("maps all fields correctly", () => {
    const result = normalizeRankingsRow({ symbol: "HDFC", score: 82, rank: 3, companyName: "HDFC Bank", sector: "Banking" });
    expect(result.symbol).toBe("HDFC");
    expect(result.score).toBe(82);
    expect(result.rank).toBe(3);
    expect(result.companyName).toBe("HDFC Bank");
    expect(result.sector).toBe("Banking");
  });

  it("defaults missing fields to null", () => {
    const result = normalizeRankingsRow({ symbol: "HDFC" });
    expect(result.score).toBeNull();
    expect(result.rank).toBeNull();
    expect(result.companyName).toBeNull();
    expect(result.sector).toBeNull();
  });

  it("does not fabricate extra fields", () => {
    const result = normalizeRankingsRow({ symbol: "HDFC", score: 80 });
    expect(Object.keys(result)).toEqual(["symbol", "score", "rank", "companyName", "sector"]);
  });
});

describe("normalizeCompareCompany", () => {
  it("maps symbol and optional fields", () => {
    const result = normalizeCompareCompany({ symbol: "INFY", companyName: "Infosys", score: 75 });
    expect(result.symbol).toBe("INFY");
    expect(result.companyName).toBe("Infosys");
    expect(result.score).toBe(75);
  });

  it("defaults missing fields to null", () => {
    const result = normalizeCompareCompany({ symbol: "INFY" });
    expect(result.companyName).toBeNull();
    expect(result.score).toBeNull();
  });

  it("does not fabricate extra fields", () => {
    const result = normalizeCompareCompany({ symbol: "INFY", score: 70 });
    expect(Object.keys(result)).toEqual(["symbol", "companyName", "score"]);
  });
});

describe("normalizeWatchlistCompany", () => {
  it("maps symbol and optional fields", () => {
    const result = normalizeWatchlistCompany({ symbol: "WIPRO", companyName: "Wipro Ltd", score: 65 });
    expect(result.symbol).toBe("WIPRO");
    expect(result.companyName).toBe("Wipro Ltd");
    expect(result.score).toBe(65);
  });

  it("defaults missing fields to null", () => {
    const result = normalizeWatchlistCompany({ symbol: "WIPRO" });
    expect(result.companyName).toBeNull();
    expect(result.score).toBeNull();
  });

  it("does not fabricate extra fields", () => {
    const result = normalizeWatchlistCompany({ symbol: "WIPRO", score: 60 });
    expect(Object.keys(result)).toEqual(["symbol", "companyName", "score"]);
  });
});
