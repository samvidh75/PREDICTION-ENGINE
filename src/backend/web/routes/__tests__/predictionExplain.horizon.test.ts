import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { predictionExplainRoutes } from "../predictions/explain";
import pool from "../../../../db/index";
import { predictionExplanationEngine } from "../../../../intelligence/PredictionExplanationEngine";

vi.mock("../../../../db/index", () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock("../../../../intelligence/PredictionExplanationEngine", () => ({
  predictionExplanationEngine: {
    explain: vi.fn(),
  },
}));

const mockedQuery = vi.mocked(pool.query);
const mockedExplain = vi.mocked(predictionExplanationEngine.explain);

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(predictionExplainRoutes);
  await app.ready();
  return app;
}

describe("predictionExplainRoutes horizon handling", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    mockedQuery.mockReset();
    mockedExplain.mockReset();
    if (app) await app.close();
    app = null;
  });

  it("rejects unsupported horizons with a clear 400", async () => {
    app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/predictions/explain/TCS?horizon=14" });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INVALID_PREDICTION_HORIZON" });
    expect(mockedExplain).not.toHaveBeenCalled();
  });

  it("passes selected horizon into explanation engine and freshness query", async () => {
    mockedExplain.mockResolvedValue({
      horizonDays: 180,
      summary: "180 day explanation",
      drivers: [],
      positives: [],
      negatives: [],
      healthScore: { previous: 70, current: 80, delta: 10 },
      classification: { from: "Healthy", to: "Excellent", changed: true },
      factorContributions: [],
      historicalReliability: {
        signalType: "Healthy -> Excellent",
        successRate: 60,
        sampleSize: 42,
        avgAlphaPct: 2.4,
        predictivePower: "Moderate",
      },
    });
    mockedQuery.mockResolvedValue({ rows: [{ prediction_date: "2026-06-10" }], rowCount: 1 });
    app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/predictions/explain/TCS?horizon=180&today=2026-06-10" });

    expect(res.statusCode).toBe(200);
    expect(mockedExplain).toHaveBeenCalledWith("TCS", {
      todayDate: "2026-06-10",
      previousDate: undefined,
      horizonDays: 180,
    });
    expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining("prediction_horizon = $3"), ["TCS", "2026-06-10", 180]);
    expect(res.json().data.horizon).toBe(180);
    expect(res.json().data.historicalReliability.sampleSize).toBe(42);
  });
});
