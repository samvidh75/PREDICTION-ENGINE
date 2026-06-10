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
};

export default opsRoutes;
