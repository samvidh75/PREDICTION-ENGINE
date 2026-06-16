import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../../../../db/index", () => ({
  default: { query: queryMock },
  query: queryMock,
}));

import opsRoutes from "../ops";

afterEach(() => {
  queryMock.mockReset();
});

describe("Ops Data Coverage Endpoint Route", () => {
  it("GET /api/ops/data-coverage returns successful aggregate stats and masked environment", async () => {
    // We mock query calls in sequence:
    // 1. SELECT 1 for db readiness
    // 2. COUNT(*) as count for symbols
    // 3. MAX(prediction_date) for symbols latest
    // 4. daily_prices stats (count, symbol_count)
    // 5. daily_prices date
    // 6. financial_snapshots stats
    // 7. financial_snapshots date
    // 8. feature_snapshots stats
    // 9. feature_snapshots date
    // 10. factor_snapshots stats
    // 11. factor_snapshots date
    // 12. prediction_registry stats
    // 13. prediction_registry date
    queryMock
      .mockResolvedValueOnce({ rows: [{ "1": 1 }] }) // db check
      .mockResolvedValueOnce({ rows: [{ count: 116 }] }) // symbols count
      .mockResolvedValueOnce({ rows: [{ max_date: "2026-06-08" }] }) // symbols latest
      // daily_prices
      .mockResolvedValueOnce({ rows: [{ row_count: 38775, symbol_count: 110 }] })
      .mockResolvedValueOnce({ rows: [{ latest_date: "2026-06-07" }] })
      // financial_snapshots
      .mockResolvedValueOnce({ rows: [{ row_count: 61, symbol_count: 5 }] })
      .mockResolvedValueOnce({ rows: [{ latest_date: 1780783086 }] }) // unix timestamp
      // feature_snapshots
      .mockResolvedValueOnce({ rows: [{ row_count: 35735, symbol_count: 105 }] })
      .mockResolvedValueOnce({ rows: [{ latest_date: "2026-06-05" }] })
      // factor_snapshots
      .mockResolvedValueOnce({ rows: [{ row_count: 38395, symbol_count: 105 }] })
      .mockResolvedValueOnce({ rows: [{ latest_date: "2026-06-05" }] })
      // prediction_registry
      .mockResolvedValueOnce({ rows: [{ row_count: 107485, symbol_count: 116 }] })
      .mockResolvedValueOnce({ rows: [{ latest_date: "2026-06-08" }] });

    const app = Fastify({ logger: false });
    await app.register(opsRoutes);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/ops/data-coverage",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.database.status).toBe("ready");
    expect(body.database.migrationsReady).toBe(true);

    expect(body.coverage.symbols).toEqual({
      count: 116,
      latestUpdatedAt: "2026-06-08",
      status: "available",
    });

    expect(body.coverage.dailyPrices).toEqual({
      rowCount: 38775,
      symbolCount: 110,
      latestPriceDate: "2026-06-07",
      status: "available",
    });

    expect(body.coverage.financialSnapshots).toEqual({
      rowCount: 61,
      symbolCount: 5,
      latestSnapshotDate: "2026-06-06", // 1780783086 converted to YYYY-MM-DD
      status: "available",
    });

    expect(body.providers).toHaveProperty("FINNHUB_KEY");
    expect(body.providers).toHaveProperty("REDIS_URL");
    // Ensure actual secrets are not visible in keys/values
    Object.values(body.providers).forEach((val) => {
      expect(val).toMatch(/^(present|missing)$/);
    });

    await app.close();
  });

  it("handles db query failure by returning unavailable stats gracefully without crashing", async () => {
    queryMock.mockRejectedValue(new Error("Database disconnected"));

    const app = Fastify({ logger: false });
    await app.register(opsRoutes);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/ops/data-coverage",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.database.status).toBe("unavailable");
    expect(body.coverage.symbols.status).toBe("unavailable");
    expect(body.coverage.dailyPrices.status).toBe("unavailable");
    expect(body.coverage.dailyPrices.rowCount).toBe(0);

    await app.close();
  });
});
