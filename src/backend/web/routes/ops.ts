/**
 * TRACK-84 Phase 4 — Production Monitoring Endpoint
 * Exposes /api/ops/health with live dashboard metrics.
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { loadEnv } from "../../config/env";
import { query } from "../../../db/index";

interface FreshnessRow extends Record<string, unknown> {
  latest: Date | string | number | null;
}

const opsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const env = loadEnv();

  app.get("/api/ops/health", async (_request, reply) => {
    const metrics: Record<string, any> = {};
    const start = Date.now();

    // Predictions today
    try {
      const today = new Date().toISOString().split("T")[0];
      const predRes = await query(
        "SELECT COUNT(DISTINCT symbol) as symbols, COUNT(*) as total FROM prediction_registry WHERE prediction_date = $1",
        [today]
      );
      metrics.predictions_today = Number(predRes.rows[0]?.total ?? 0);
      metrics.symbols_covered = Number(predRes.rows[0]?.symbols ?? 0);
    } catch {
      metrics.predictions_today = -1;
      metrics.symbols_covered = -1;
    }

    // Hit rate (validated predictions with alpha > 0)
    try {
      const hitRes = await query(
        "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE alpha > 0) as hits FROM prediction_registry WHERE validation_status = 'validated'"
      );
      const total = Number(hitRes.rows[0]?.total ?? 1);
      const hits = Number(hitRes.rows[0]?.hits ?? 0);
      metrics.hit_rate = total > 0 ? ((hits / total) * 100).toFixed(1) + "%" : "N/A";
    } catch {
      metrics.hit_rate = "N/A";
    }

    // Data freshness
    try {
      const freshRes = await query<FreshnessRow>(
        "SELECT MAX(trade_date) as latest FROM daily_prices"
      );
      const latest = freshRes.rows[0]?.latest;
      if (latest !== null && latest !== undefined) {
        const latestDate = new Date(latest);
        const daysAgo = Math.floor((Date.now() - latestDate.getTime()) / 86400000);
        metrics.pipeline_freshness = `${daysAgo}d ago`;
      } else {
        metrics.pipeline_freshness = "never";
      }
    } catch {
      metrics.pipeline_freshness = "error";
    }

    // Scheduler health
    try {
      const schedRes = await query(
        "SELECT status, phase FROM pipeline_health ORDER BY started_at DESC LIMIT 6"
      );
      const phases = schedRes.rows.map((r: any) => `${r.phase}:${r.status}`);
      metrics.scheduler_health = phases.length > 0 ? phases.join(", ") : "no runs";
    } catch {
      metrics.scheduler_health = "error";
    }

    // DB health
    try {
      await query("SELECT 1");
      metrics.db_health = "connected";
    } catch {
      metrics.db_health = "error";
    }

    // Additional info
    metrics.response_ms = Date.now() - start;
    metrics.environment = env.nodeEnv;
    metrics.uptime_seconds = Math.floor(process.uptime());
    metrics.node_version = process.version;

    return reply.send({
      status: "ok",
      timestamp: new Date().toISOString(),
      metrics,
    });
  });

  app.get("/api/ops/data-coverage", async (_request, reply) => {
    const generatedAt = new Date().toISOString();
    
    // Check DB status
    let dbStatus: "ready" | "unavailable" = "ready";
    let dbError: string | null = null;
    try {
      await query("SELECT 1");
    } catch (err: any) {
      dbStatus = "unavailable";
      dbError = err.message || "database connection failed";
    }

    // Helper to run aggregate queries safely
    const fetchTableStats = async (
      tableName: string,
      dateCol: string,
      isDateUnix: boolean = false
    ) => {
      try {
        const rowRes = await query(`SELECT COUNT(*) as row_count, COUNT(DISTINCT symbol) as symbol_count FROM ${tableName}`);
        const dateRes = await query(`SELECT MAX(${dateCol}) as latest_date FROM ${tableName}`);
        
        let latestDate: string | null = null;
        const rawDate = dateRes.rows[0]?.latest_date;
        if (rawDate !== null && rawDate !== undefined) {
          if (isDateUnix) {
            // Check if unix timestamp (number or string representation of a number)
            const num = Number(rawDate);
            if (!isNaN(num)) {
              // Convert to milliseconds if standard seconds or milliseconds
              const ms = num < 10000000000 ? num * 1000 : num;
              latestDate = new Date(ms).toISOString().split("T")[0];
            } else {
              latestDate = new Date(rawDate).toISOString().split("T")[0];
            }
          } else {
            // Ensure parseable date format
            latestDate = new Date(rawDate).toISOString().split("T")[0];
          }
        }

        return {
          rowCount: Number(rowRes.rows[0]?.row_count ?? 0),
          symbolCount: Number(rowRes.rows[0]?.symbol_count ?? 0),
          latestSnapshotDate: latestDate,
          status: "available"
        };
      } catch (err: any) {
        return {
          rowCount: 0,
          symbolCount: 0,
          latestSnapshotDate: null,
          status: "unavailable"
        };
      }
    };

    // Symbols is slightly different structure
    let symbolsCount = 0;
    let symbolsLatest: string | null = null;
    let symbolsStatus = "available";
    try {
      const symRes = await query("SELECT COUNT(*) as count FROM symbols");
      symbolsCount = Number(symRes.rows[0]?.count ?? 0);
      
      // Look in predictions for latest update or default to current date
      const latestRes = await query("SELECT MAX(prediction_date) as max_date FROM prediction_registry");
      symbolsLatest = latestRes.rows[0]?.max_date ? new Date(latestRes.rows[0]?.max_date).toISOString().split("T")[0] : null;
    } catch {
      symbolsStatus = "unavailable";
    }

    // Run table queries
    const dailyPrices = await fetchTableStats("daily_prices", "trade_date");
    const financialSnapshots = await fetchTableStats("financial_snapshots", "snapshot_date", true);
    const featureSnapshots = await fetchTableStats("feature_snapshots", "snapshot_date");
    const factorSnapshots = await fetchTableStats("factor_snapshots", "snapshot_date");
    const predictionRegistry = await fetchTableStats("prediction_registry", "prediction_date");

    // Masked provider environment checks
    const providers = {
      FINNHUB_KEY: env.finnhubKey ? "present" : "missing",
      INDIANAPI_KEY: env.indianApiKey ? "present" : "missing",
      UPSTOX_ACCESS_TOKEN: process.env.UPSTOX_ACCESS_TOKEN ? "present" : "missing",
      UPSTOX_API_KEY: process.env.UPSTOX_API_KEY ? "present" : "missing",
      UPSTOX_CLIENT_SECRET: process.env.UPSTOX_CLIENT_SECRET ? "present" : "missing",
      REDIS_URL: process.env.REDIS_URL ? "present" : "missing",
    };

    return reply.send({
      ok: true,
      generatedAt,
      database: {
        status: dbStatus,
        migrationsReady: dbStatus === "ready",
        error: dbError
      },
      coverage: {
        symbols: {
          count: symbolsCount,
          latestUpdatedAt: symbolsLatest,
          status: symbolsStatus
        },
        dailyPrices: {
          rowCount: dailyPrices.rowCount,
          symbolCount: dailyPrices.symbolCount,
          latestPriceDate: dailyPrices.latestSnapshotDate,
          status: dailyPrices.status
        },
        financialSnapshots: {
          rowCount: financialSnapshots.rowCount,
          symbolCount: financialSnapshots.symbolCount,
          latestSnapshotDate: financialSnapshots.latestSnapshotDate,
          status: financialSnapshots.status
        },
        featureSnapshots: {
          rowCount: featureSnapshots.rowCount,
          symbolCount: featureSnapshots.symbolCount,
          latestSnapshotDate: featureSnapshots.latestSnapshotDate,
          status: featureSnapshots.status
        },
        factorSnapshots: {
          rowCount: factorSnapshots.rowCount,
          symbolCount: factorSnapshots.symbolCount,
          latestSnapshotDate: factorSnapshots.latestSnapshotDate,
          status: factorSnapshots.status
        },
        predictionRegistry: {
          rowCount: predictionRegistry.rowCount,
          symbolCount: predictionRegistry.symbolCount,
          latestPredictionDate: predictionRegistry.latestSnapshotDate,
          status: predictionRegistry.status
        }
      },
      providers
    });
  });

  app.post("/api/ops/ingest-quotes", async (request, reply) => {
    const { symbols: rawSymbols, apply: rawApply } = request.query as Record<string, string | undefined>;
    const symbols = (rawSymbols || "RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK")
      .split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 10);
    const applyMode = rawApply === "true";
    const results: Array<{ symbol: string; ok: boolean; price: number | null; error: string | null }> = [];
    for (const symbol of symbols) {
      try {
        const yahooSymbol = `${symbol}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        const resp = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) {
          results.push({ symbol, ok: false, price: null, error: `Yahoo HTTP ${resp.status}` });
          continue;
        }
        const data = await resp.json() as any;
        const meta = data?.chart?.result?.[0]?.meta;
        const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
        const ok = price !== null && price > 0;
        if (ok && applyMode) {
          const today = new Date().toISOString().slice(0, 10);
          await query(
            `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (symbol, trade_date) DO UPDATE SET
               close = EXCLUDED.close, volume = EXCLUDED.volume`,
            [symbol, today, price, price, price, price, null]
          );
        }
        results.push({ symbol, ok, price, error: ok ? null : "Yahoo returned no price data" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}${err.cause ? " cause=" + String(err.cause) : ""}` : String(err);
        results.push({ symbol, ok: false, price: null, error: msg });
      }
    }
    return reply.send({
      ok: true,
      mode: applyMode ? "apply" : "dry-run",
      symbols: results.length,
      succeeded: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  });
};

export default opsRoutes;
