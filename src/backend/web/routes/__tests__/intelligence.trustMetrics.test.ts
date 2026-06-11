import { describe, it, expect, vi, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { intelligenceRoutes } from "../intelligence";
import { query } from "../../../../db/index";

vi.mock("../../../../db/index", () => ({
  query: vi.fn(),
  pool: {},
}));

vi.mock("../../../../services/CompanyIntelligenceEngine", () => ({
  CompanyIntelligenceEngine: vi.fn(function CompanyIntelligenceEngine() {
    return {};
  }),
}));

vi.mock("../../../../services/PortfolioIntelligenceEngine", () => ({
  PortfolioIntelligenceEngine: vi.fn(function PortfolioIntelligenceEngine() {
    return {};
  }),
}));

vi.mock("../../../../services/NarrativeEngine", () => ({
  NarrativeEngine: vi.fn(function NarrativeEngine() {
    return {};
  }),
}));

vi.mock("../../../../services/InsightEngine", () => ({
  InsightEngine: vi.fn(function InsightEngine() {
    return {};
  }),
}));

vi.mock("../../../../services/MarketIntelligenceEngine", () => ({
  MarketIntelligenceEngine: vi.fn(function MarketIntelligenceEngine() {
    return {};
  }),
}));

vi.mock("../../../../services/intelligence/IntelligenceCache", () => ({
  intelligenceCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("../../../../intelligence/SignalFeedEngine", () => ({
  generateSignalFeed: vi.fn(),
}));

const mockedQuery = vi.mocked(query);

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(intelligenceRoutes);
  await app.ready();
  return app;
}

describe("GET /api/intelligence/trust-metrics", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    mockedQuery.mockReset();
    if (app) await app.close();
    app = null;
  });

  it("returns an honest successful analytical envelope", async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total_predictions: 3 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { alpha: 0.10, confidence_score: 80, future_return: 0.12, validated_at: "2026-06-10" },
          { alpha: -0.02, confidence_score: 30, future_return: -0.01, validated_at: "2026-06-11" },
          { alpha: 0.04, confidence_score: 70, future_return: 0.05, validated_at: "2026-06-09" },
        ],
        rowCount: 3,
      });
    app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/intelligence/trust-metrics" });
    const body = res.json();

    expect(res.statusCode).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      asOf: "2026-06-11",
      missingInputs: [],
      isSynthetic: false,
      isFallback: false,
      dataState: { availability: "available", asOf: "2026-06-11" },
    });
    expect(body.lineage[0]).toMatchObject({
      sourceTable: "prediction_registry",
      isFallback: false,
      isSynthetic: false,
    });
    expect(body.data.total_predictions).toBe(3);
    expect(body.data.total_outcomes).toBe(3);
    expect(body.data.hit_rate).toBe(66.67);
  });

  it("returns partial data when analytical fields cannot be computed", async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total_predictions: 2 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { alpha: null, confidence_score: null, future_return: null, validated_at: "2026-06-10" },
        ],
        rowCount: 1,
      });
    app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/intelligence/trust-metrics" });
    const body = res.json();

    expect(body.status).toBe("partial");
    expect(body.data.alpha).toBeNull();
    expect(body.data.hit_rate).toBeNull();
    expect(body.data.sharpe_ratio).toBeNull();
    expect(body.data.calibration_score).toBeNull();
    expect(body.missingInputs).toEqual(expect.arrayContaining([
      "alpha",
      "hit_rate",
      "sharpe_ratio",
      "calibration_score",
    ]));
    expect(body.isSynthetic).toBe(false);
    expect(body.isFallback).toBe(false);
  });

  it("returns error envelope without fallback data when the query fails", async () => {
    mockedQuery.mockRejectedValueOnce(new Error("database unavailable"));
    app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/intelligence/trust-metrics" });
    const body = res.json();

    expect(body.status).toBe("error");
    expect(body.data).toEqual({
      alpha: null,
      hit_rate: null,
      sharpe_ratio: null,
      calibration_score: null,
      total_predictions: null,
      total_outcomes: null,
    });
    expect(body.missingInputs).toEqual(expect.arrayContaining(["prediction_registry"]));
    expect(body.isSynthetic).toBe(false);
    expect(body.isFallback).toBe(false);
  });
});
