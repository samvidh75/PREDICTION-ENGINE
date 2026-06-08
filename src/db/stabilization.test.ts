import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

let query: (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number }>;
let shutdown: () => Promise<void>;

beforeAll(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stockstory-p0-"));
  process.env.NODE_ENV = "test";
  delete process.env.DATABASE_URL;
  process.env.STOCKSTORY_SQLITE_PATH = path.join(dir, "stockstory.db");
  process.env.COOKIE_SECRET = "test-secret";

  const db = await import("./index");
  query = db.query;
  shutdown = async () => (await db.getDatabaseAdapter()).shutdown();
});

afterAll(async () => {
  await shutdown?.();
});

async function columns(table: string): Promise<string[]> {
  const result = await query(`PRAGMA table_info(${table})`);
  return result.rows.map((row) => row.name);
}

async function seedReliancePredictions() {
  await query(
    `INSERT INTO prediction_registry (
      symbol, prediction_date, ranking_score, classification, confidence_score, confidence_level,
      quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
      price_at_prediction, benchmark_level, prediction_horizon
    ) VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15),
      ($16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)`,
    [
      "RELIANCE", "2026-06-06", 70, "Good", 68, "Medium", 71, 64, 55, 60, 42, 73, 2800, 22500, 30,
      "RELIANCE", "2026-06-07", 82, "Excellent", 84, "High", 80, 76, 60, 75, 35, 79, 2850, 22600, 30,
    ],
  );
}

describe("TRACK-P0 SQLite schema contract", () => {
  it("creates canonical feature, factor, and prediction registry columns", async () => {
    await expect(columns("feature_snapshots")).resolves.toEqual(expect.arrayContaining([
      "symbol", "trade_date", "rsi", "macd", "macd_signal", "macd_histogram", "adx", "atr",
      "bollinger_width", "momentum", "volatility", "relative_strength", "moving_average_distance", "trend_strength",
    ]));

    await expect(columns("factor_snapshots")).resolves.toEqual(expect.arrayContaining([
      "symbol", "trade_date", "quality_factor", "value_factor", "growth_factor", "momentum_factor",
      "risk_factor", "sector_strength_factor", "factor_score", "explanations",
    ]));

    await expect(columns("prediction_registry")).resolves.toEqual(expect.arrayContaining([
      "symbol", "prediction_date", "ranking_score", "classification", "confidence_score", "confidence_level",
      "quality_score", "growth_score", "value_score", "momentum_score", "risk_score", "sector_score", "prediction_horizon",
    ]));
  });
});

describe("TRACK-P0 engine writes", () => {
  it("persists FeatureEngine rows using trade_date", async () => {
    await query(`INSERT OR IGNORE INTO symbols (symbol, company_name, sector) VALUES ($1, $2, $3)`, ["RELIANCE", "Reliance", "Energy"]);
    for (let i = 1; i <= 80; i += 1) {
      const date = `2026-03-${String(i).padStart(2, "0")}`;
      const close = 100 + i + Math.sin(i / 5) * 3;
      await query(
        `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        ["RELIANCE", date, close - 1, close + 2, close - 3, close, close, 100000 + i],
      );
    }

    const { FeatureEngine } = await import("../services/FeatureEngine");
    await new FeatureEngine().calculateAndStoreFeatures("RELIANCE");

    const rows = await query(`SELECT trade_date, rsi, macd FROM feature_snapshots WHERE symbol = $1 AND rsi IS NOT NULL AND macd IS NOT NULL LIMIT 1`, ["RELIANCE"]);
    expect(rows.rows.length).toBeGreaterThan(0);
    expect(rows.rows[0].trade_date).toBeTruthy();
    expect(Number(rows.rows[0].rsi)).not.toBeNaN();
    expect(Number(rows.rows[0].macd)).not.toBeNaN();
  });

  it("persists FactorEngine rows using trade_date and explanations", async () => {
    await query(
      `INSERT OR REPLACE INTO financial_snapshots (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      ["RELIANCE", "2026-03-31", 1000000, 22, 50, 1.2, 0.9],
    );

    const { FactorEngine } = await import("../services/FactorEngine");
    await new FactorEngine().calculateAndStoreFactors("RELIANCE");

    const rows = await query(`SELECT trade_date, factor_score, explanations FROM factor_snapshots WHERE symbol = $1 LIMIT 1`, ["RELIANCE"]);
    expect(rows.rows.length).toBeGreaterThan(0);
    expect(rows.rows[0].trade_date).toBeTruthy();
    expect(Number(rows.rows[0].factor_score)).not.toBeNaN();
    expect(rows.rows[0].explanations).toContain("topPositiveDrivers");
  });
});

describe("TRACK-P0 routes and health", () => {
  it("serves stockstory, signals, explainability, and honest health from SQLite", async () => {
    await seedReliancePredictions();
    const { buildServer } = await import("../backend/web/app");
    const app = await buildServer();

    const health = await app.inject({ method: "GET", url: "/healthz" });
    expect(health.statusCode).toBe(200);
    expect(health.json().database).toMatchObject({ kind: "sqlite", ok: true });

    const stockstory = await app.inject({ method: "GET", url: "/api/stockstory/RELIANCE" });
    expect(stockstory.statusCode).toBe(200);
    expect(stockstory.json()).toMatchObject({
      classification: "Excellent",
      confidence: { level: "High" },
      lineage: { sourceTable: "prediction_registry" },
      lastUpdated: "2026-06-07",
    });

    const signals = await app.inject({ method: "GET", url: "/api/predictions/signals" });
    expect(signals.statusCode).toBe(200);
    expect(signals.json().symbolsAnalyzed).toBe(1);
    expect(signals.json().signals.some((signal: any) => signal.symbol === "RELIANCE")).toBe(true);

    const explain = await app.inject({ method: "GET", url: "/api/predictions/explain/RELIANCE" });
    expect(explain.statusCode).toBe(200);
    expect(explain.json().classification).toMatchObject({ from: "Good", to: "Excellent", changed: true });
    expect(explain.json().healthScore.delta).toBe(12);
    expect(explain.json().generatedAt).toBeTruthy();

    await app.close();
  }, 15_000);
});
