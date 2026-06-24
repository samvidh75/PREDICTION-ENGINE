import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
const { getCompanyMock, getQuoteMock } = vi.hoisted(() => ({
  getCompanyMock: vi.fn(),
  getQuoteMock: vi.fn(),
}));
const { buildCompanyResearchMock } = vi.hoisted(() => ({ buildCompanyResearchMock: vi.fn() }));
const { runScannerMock } = vi.hoisted(() => ({ runScannerMock: vi.fn() }));
const { compareCompaniesMock } = vi.hoisted(() => ({ compareCompaniesMock: vi.fn() }));
const { trackThesisMock } = vi.hoisted(() => ({ trackThesisMock: vi.fn() }));
const { monitorPortfolioMock } = vi.hoisted(() => ({ monitorPortfolioMock: vi.fn() }));
const { generateAlertsMock } = vi.hoisted(() => ({ generateAlertsMock: vi.fn() }));

vi.mock("../../../../db/index", () => ({
  default: { query: queryMock },
  query: queryMock,
}));

vi.mock("../../../../services/data/MarketDataGateway", () => ({
  MarketDataGateway: {
    getCompany: getCompanyMock,
    getQuote: getQuoteMock,
  },
}));

vi.mock("../../../../research/engine/companyResearchEngine", () => ({
  buildCompanyResearch: buildCompanyResearchMock,
}));

vi.mock("../../../../research/scanner/scannerEngine", () => ({
  runScanner: runScannerMock,
  SCANNER_PRESETS: { "Quality compounders": {}, "High growth": {}, "Value picks": {} },
}));

vi.mock("../../../../research/compare/compareEngine", () => ({
  compareCompanies: compareCompaniesMock,
}));

vi.mock("../../../../research/watchlist/watchlistEngine", () => ({
  trackThesis: trackThesisMock,
}));

vi.mock("../../../../research/portfolio/portfolioEngine", () => ({
  monitorPortfolio: monitorPortfolioMock,
}));

vi.mock("../../../../research/alerts/alertsEngine", () => ({
  generateAlerts: generateAlertsMock,
}));

import researchRoutes from "../research";

afterEach(() => {
  queryMock.mockReset();
  getCompanyMock.mockReset();
  getQuoteMock.mockReset();
  buildCompanyResearchMock.mockReset();
  runScannerMock.mockReset();
  compareCompaniesMock.mockReset();
  trackThesisMock.mockReset();
  monitorPortfolioMock.mockReset();
  generateAlertsMock.mockReset();
});

describe("GET /api/research/company/:symbol", () => {
  const mockResearchResult = {
    symbol: "RELIANCE",
    companyName: "Reliance Industries",
    sector: "Oil & Gas",
    industry: "Refineries",
    fundamentals: null,
    quote: null,
    candles: [],
    factorScores: [],
    thesis: null,
    risk: null,
    history: [],
    investContext: [],
  };

  it("gracefully handles DB failure and returns fallback data", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Test Corp", sector: "Tech", industry: "Software" });
    queryMock.mockRejectedValueOnce(new Error("DB down")).mockResolvedValue({ rows: [] });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/company/RELIANCE" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
  });

  it("returns product-safe response for known symbol", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Reliance Industries", sector: "Oil & Gas", industry: "Refineries" });
    getQuoteMock.mockResolvedValue({
      symbol: "RELIANCE", lastPrice: 2850, change: 12.5, changePercent: 0.44,
      marketCap: 1925000, week52High: 3100, week52Low: 2200, open: 2838,
      high: 2862, low: 2835, close: 2850, volume: 8500000,
      timestamp: "2026-06-18T10:00:00Z", sourceSuccess: true, providerCount: 2,
    });
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          symbol: "RELIANCE", snapshot_date: "2026-06-15", pe_ratio: 22.5,
          pb_ratio: 3.1, roe: 14.2, roa: 8.1, roce: 12.3, operating_margin: 18.5,
          revenue_growth: 12.3, eps_growth: 15.1, debt_to_equity: 0.45,
          current_ratio: 1.8, beta: 1.1, fcf_yield: 3.2, ev_ebitda: 14.8,
          market_cap: 1925000, profit_growth: 11.2, gross_margin: 36.5,
          book_value: 920, eps: 126, dividend_yield: 0.8, sales: 850000,
          net_profit: 85000, operating_profit: 120000, total_assets: 1800000,
          total_debt: 450000, equity: 1000000, cash_flow: 95000, free_cash_flow: 65000,
        }],
      })
      .mockResolvedValueOnce({ rows: Array.from({ length: 10 }, (_, i) => ({
        trade_date: `2025-07-${String(i + 1).padStart(2, "0")}`,
        close: 2800 + i, high: 2820 + i, low: 2780 + i, volume: 5000000,
      })) })
      .mockResolvedValueOnce({ rows: [{ quality_factor: 65, value_factor: 55, growth_factor: 60, momentum_factor: 58, risk_factor: 35, sector_strength_factor: 50 }] })
      .mockResolvedValueOnce({ rows: [{ volatility: 0.18, momentum: 1.2, rsi: 62, trend_strength: 0.6 }] })
      .mockResolvedValueOnce({ rows: [{ ranking_score: 72, classification: "Good", confidence_score: 75, confidence_level: "High" }] });
    buildCompanyResearchMock.mockReturnValue(mockResearchResult);
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/company/RELIANCE" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.profile.symbol).toBe("RELIANCE");
    expect(body.data.profile.companyName).toBe("Reliance Industries");
  });

  it("handles missing fundamental snaps gracefully", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Unknown Corp", sector: null, industry: null });
    getQuoteMock.mockResolvedValue(null);
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    buildCompanyResearchMock.mockReturnValue({ ...mockResearchResult, symbol: "UNKNOWN", companyName: "Unknown Corp" });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/company/UNKNOWN" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.profile.companyName).toBe("Unknown Corp");
  });
});

describe("GET /api/research/scanner", () => {
  it("returns empty result when no symbols have scores", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    runScannerMock.mockReturnValue([]);
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/scanner?preset=Quality%20compounders&limit=10" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.preset).toBe("Quality compounders");
  });

  it("returns 400 on bad preset", async () => {
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/scanner?preset=INVALID_PRESET&limit=10" });
    expect(res.statusCode).toBe(400);
  });

  it("returns scored results for top symbols", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ symbol: "RELIANCE" }, { symbol: "TCS" }] });
    getCompanyMock.mockResolvedValueOnce({ companyName: "Reliance Industries", sector: "Oil & Gas", industry: "Refineries" });
    queryMock.mockResolvedValueOnce({ rows: [{ pe_ratio: 24, pb_ratio: 3.5, roe: 16, roa: 9, roce: 13, debt_to_equity: 0.35, current_ratio: 2.1, gross_margin: 38, operating_margin: 20, revenue_growth: 12, profit_growth: 10, eps_growth: 14, beta: 1.05, sales: 800000, net_profit: 80000 }] });
    getCompanyMock.mockResolvedValueOnce({ companyName: "Tata Consultancy Services", sector: "IT", industry: "Software" });
    queryMock.mockResolvedValueOnce({ rows: [{ pe_ratio: 30, pb_ratio: 8, roe: 28, roa: 18, roce: 25, debt_to_equity: 0.1, current_ratio: 3.5, gross_margin: 46, operating_margin: 28, revenue_growth: 8, profit_growth: 7, eps_growth: 10, beta: 0.85, sales: 250000, net_profit: 50000 }] });
    runScannerMock.mockReturnValue([{ symbol: "RELIANCE", companyName: "Reliance Industries", score: 0.8 }]);
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/scanner?preset=Quality%20compounders&limit=10" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.preset).toBe("Quality compounders");
  });
});

describe("POST /api/research/compare", () => {
  it("returns 400 when less than 2 symbols", async () => {
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({
      method: "POST", url: "/api/research/compare",
      payload: { symbols: ["RELIANCE"] },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("returns comparison data for valid symbols", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ pe_ratio: 24, pb_ratio: 3.5, roe: 16, roa: 9, roce: 13, debt_to_equity: 0.35, current_ratio: 2.1, gross_margin: 38, operating_margin: 20, revenue_growth: 12, profit_growth: 10, eps_growth: 14, beta: 1.05, sales: 800000, net_profit: 80000 }] });
    getCompanyMock.mockResolvedValueOnce({ companyName: "Reliance Industries", sector: "Oil & Gas", industry: "Refineries" });
    queryMock.mockResolvedValueOnce({ rows: [{ pe_ratio: 30, pb_ratio: 8, roe: 28, roa: 18, roce: 25, debt_to_equity: 0.1, current_ratio: 3.5, gross_margin: 46, operating_margin: 28, revenue_growth: 8, profit_growth: 7, eps_growth: 10, beta: 0.85, sales: 250000, net_profit: 50000 }] });
    getCompanyMock.mockResolvedValueOnce({ companyName: "Tata Consultancy Services", sector: "IT", industry: "Software" });
    compareCompaniesMock.mockReturnValue({ factors: [], symbols: ["RELIANCE", "TCS"], summary: "" });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({
      method: "POST", url: "/api/research/compare",
      payload: { symbols: ["RELIANCE", "TCS"] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
  });
});

describe("GET /api/research/watchlist/:symbol/thesis", () => {
  it("returns thesis for a symbol with a ranking score", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Reliance Industries", sector: "Oil & Gas", industry: "Refineries" });
    queryMock.mockResolvedValueOnce({ rows: [{ ranking_score: 0.75, prediction_date: "2026-06-18" }] });
    trackThesisMock.mockReturnValue({ symbol: "RELIANCE", companyName: "Reliance Industries", status: "tracking", conviction: "Moderate", thesis: "" });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/watchlist/RELIANCE/thesis" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.symbol).toBe("RELIANCE");
  });

  it("returns thesis for a symbol without a ranking score", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Unknown Corp", sector: null, industry: null });
    queryMock.mockResolvedValueOnce({ rows: [] });
    trackThesisMock.mockReturnValue({ symbol: "UNKNOWN", companyName: "Unknown Corp", status: "no_data", conviction: null, thesis: "Tracking begins now" });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/watchlist/UNKNOWN/thesis" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.symbol).toBe("UNKNOWN");
  });
});

describe("POST /api/research/portfolio", () => {
  it("returns clean empty response when no holdings provided", async () => {
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({
      method: "POST", url: "/api/research/portfolio",
      payload: { holdings: [] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.holdings).toEqual([]);
    expect(body.data.summary).toContain("Monitor companies");
  });

  it("returns portfolio review for provided holdings", async () => {
    getCompanyMock.mockResolvedValueOnce({ companyName: "Reliance Industries", sector: "Oil & Gas", industry: "Refineries" });
    queryMock.mockResolvedValueOnce({ rows: [{ pe_ratio: 24, pb_ratio: 3.5, roe: 16, debt_to_equity: 0.35, gross_margin: 38, revenue_growth: 12, profit_growth: 10 }] });
    queryMock.mockResolvedValueOnce({ rows: [{ ranking_score: 0.75, prediction_date: "2026-06-18" }] });
    getCompanyMock.mockResolvedValueOnce({ companyName: "Tata Consultancy Services", sector: "IT", industry: "Software" });
    queryMock.mockResolvedValueOnce({ rows: [{ pe_ratio: 30, pb_ratio: 8, roe: 28, debt_to_equity: 0.1, gross_margin: 46, revenue_growth: 8, profit_growth: 7 }] });
    queryMock.mockResolvedValueOnce({ rows: [{ ranking_score: 0.82, prediction_date: "2026-06-18" }] });
    monitorPortfolioMock.mockReturnValue({ holdings: [{ symbol: "RELIANCE", conviction: "Moderate" }, { symbol: "TCS", conviction: "Strong" }], reviewPriority: [], summary: "" });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({
      method: "POST", url: "/api/research/portfolio",
      payload: { holdings: [{ symbol: "RELIANCE" }, { symbol: "TCS" }] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.holdings).toHaveLength(2);
  });
});

describe("GET /api/research/alerts/:symbol", () => {
  it("returns empty alerts when no ranking history", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Unknown Corp", sector: null, industry: null });
    getQuoteMock.mockResolvedValue({ symbol: "UNKNOWN", lastPrice: 100, changePercent: 0, change: 0 });
    queryMock.mockResolvedValueOnce({ rows: [] });
    generateAlertsMock.mockReturnValue([]);
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/alerts/UNKNOWN" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.symbol).toBe("UNKNOWN");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("returns alerts when score change detected", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Reliance Industries", sector: "Oil & Gas", industry: "Refineries" });
    getQuoteMock.mockResolvedValue({ symbol: "RELIANCE", lastPrice: 2850, changePercent: 2.5, change: 70 });
    queryMock.mockResolvedValueOnce({ rows: [{ ranking_score: 0.75, prediction_date: "2026-06-18" }, { ranking_score: 0.70, prediction_date: "2026-06-11" }] });
    generateAlertsMock.mockReturnValue([{ type: "score_change", message: "Score changed", severity: "info" }]);
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/alerts/RELIANCE" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.symbol).toBe("RELIANCE");
  });
});

describe("GET /api/research/invest/:symbol", () => {
  it("returns invest context for known symbol", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Reliance Industries", sector: "Oil & Gas", industry: "Refineries" });
    queryMock.mockResolvedValueOnce({ rows: [{ pe_ratio: 24, pb_ratio: 3.5, roe: 16, roa: 9, roce: 13, debt_to_equity: 0.35, current_ratio: 2.1, gross_margin: 38, operating_margin: 20, revenue_growth: 12, profit_growth: 10, eps_growth: 14, beta: 1.05, sales: 800000, net_profit: 80000 }] });
    queryMock.mockResolvedValueOnce({ rows: [{ ranking_score: 0.75, prediction_date: "2026-06-18" }] });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/invest/RELIANCE" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.symbol).toBe("RELIANCE");
    expect(body.data.companyName).toBe("Reliance Industries");
    expect(Array.isArray(body.data.keyRisks)).toBe(true);
    expect(Array.isArray(body.data.keyStrengths)).toBe(true);
    expect(Array.isArray(body.data.whatToWatch)).toBe(true);
  });

  it("returns invest context for unknown symbol (no data)", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Unknown Corp", sector: null, industry: null });
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/invest/UNKNOWN" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.symbol).toBe("UNKNOWN");
    expect(body.data.conviction).toBe("Research signals pending");
  });

  it("returns 502 on DB failure", async () => {
    getCompanyMock.mockResolvedValue({ companyName: "Test Corp", sector: "Tech", industry: "Software" });
    queryMock.mockRejectedValueOnce(new Error("DB down"));
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/invest/RELIANCE" });
    expect(res.statusCode).toBe(502);
    const body = res.json();
    expect(body.code).toBe("INVEST_CONTEXT_UNAVAILABLE");
  });
});

describe("GET /api/research/fundamentals-coverage", () => {
  it("returns coverage stats", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ symbol: "RELIANCE" }, { symbol: "TCS" }, { symbol: "INFY" }] });
    queryMock.mockResolvedValueOnce({ rows: [{ symbol: "RELIANCE" }, { symbol: "TCS" }] });
    queryMock.mockResolvedValueOnce({ rows: [{ symbol: "RELIANCE", latest_date: "2026-06-15", latest_ingestion: "2026-06-15T10:00:00Z" }, { symbol: "TCS", latest_date: "2026-06-14", latest_ingestion: "2026-06-14T10:00:00Z" }] });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/fundamentals-coverage" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(3);
    expect(body.covered).toBe(2);
    expect(body.missing).toBe(1);
    expect(body.missingSymbols).toEqual(["INFY"]);
    expect(body.coveredSymbols).toEqual(["RELIANCE", "TCS"]);
    expect(body.latestSnapshots.RELIANCE).toBeDefined();
    expect(body.latestSnapshots.TCS).toBeDefined();
  });
});

describe("GET /api/research/lineage/:symbol", () => {
  it("returns lineage for symbol with fs and price coverage", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ metric: "pe_ratio", source_table: "financial_snapshots", source_field: "pe_ratio", source_name: "Yahoo", source_url: null, as_of: "2026-06-15", retrieved_at: "2026-06-15T10:00:00Z", freshness_days: 0, availability: "available", is_fallback: false, is_synthetic: false, rejection_reason: null }] });
    queryMock.mockResolvedValueOnce({ rows: [{ source_label: "Yahoo", source_url: null, ingestion_timestamp: "2026-06-15T10:00:00Z", snapshot_date: "2026-06-15" }] });
    queryMock.mockResolvedValueOnce({ rows: [{ cnt: 252, latest_date: "2026-06-18" }] });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/lineage/RELIANCE" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.symbol).toBe("RELIANCE");
    expect(body.entryCount).toBeGreaterThan(0);
    expect(body.priceCoverage).toBeDefined();
    expect(body.priceCoverage.rowCount).toBe(252);
  });

  it("returns empty lineage for unknown symbol", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    const app = Fastify({ logger: false });
    await app.register(researchRoutes);
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/research/lineage/UNKNOWN" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.symbol).toBe("UNKNOWN");
    expect(body.entries).toEqual([]);
    expect(body.entryCount).toBe(0);
  });
});
