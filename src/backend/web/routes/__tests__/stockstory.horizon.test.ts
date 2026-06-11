import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { stockstoryRoutes } from "../stockstory";
import pool from "../../../../db/index";

vi.mock("../../../../db/index", () => ({
  default: {
    query: vi.fn(),
  },
}));

const mockedQuery = vi.mocked(pool.query);

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(stockstoryRoutes);
  await app.ready();
  return app;
}

function predictionRow(horizon: number) {
  return {
    symbol: "TCS",
    prediction_date: "2026-06-10",
    ranking_score: 82,
    classification: "Healthy",
    confidence_score: 78,
    confidence_level: "High",
    quality_score: 80,
    growth_score: 75,
    value_score: 70,
    momentum_score: 74,
    risk_score: 20,
    sector_score: 81,
    price_at_prediction: 100,
    benchmark_level: 200,
    prediction_horizon: horizon,
  };
}

describe("stockstoryRoutes horizon handling", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    mockedQuery.mockReset();
    if (app) await app.close();
    app = null;
  });

  it("rejects unsupported horizons with a clear 400", async () => {
    app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/stockstory/TCS?horizon=14" });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: "INVALID_PREDICTION_HORIZON",
    });
    expect(res.json().message).toContain("Allowed: 7, 30, 90, 180, 365");
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("queries prediction_registry with the selected supported horizon", async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ symbol: "TCS", sector: "IT" }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [predictionRow(90)], rowCount: 1 });
    app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/stockstory/TCS?horizon=90" });

    expect(res.statusCode).toBe(200);
    expect(mockedQuery).toHaveBeenNthCalledWith(2, expect.stringContaining("prediction_horizon = $2"), ["TCS", 90]);
    expect(res.json().data.predictionHorizon).toBe(90);
  });
});
