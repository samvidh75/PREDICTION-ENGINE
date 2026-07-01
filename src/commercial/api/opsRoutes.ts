/**
 * commercial/api/opsRoutes — Ops dashboard telemetry API.
 *
 * Password-gated endpoint that exposes internal LLM usage, subscription
 * distribution, pipeline run history, and system health data.
 *
 * Routes:
 *   POST /api/ops/telemetry  — Return aggregated telemetry (password required)
 *   GET  /api/ops/health     — Lightweight uptime / db check (no password)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";

interface TelemetryBody {
  password: string;
}

export async function registerOpsRoutes(fastify: FastifyInstance): Promise<void> {
  const expectedHash = process.env.OPS_DASHBOARD_PASSWORD_HASH || "";

  // ── POST /api/ops/telemetry ──────────────────────────────────
  fastify.post("/api/ops/telemetry", async (req: FastifyRequest<{ Body: TelemetryBody }>, reply: FastifyReply) => {
    const { password } = req.body;

    // Password gate
    if (!expectedHash) {
      return reply.status(503).send({ error: "Ops dashboard not configured (OPS_DASHBOARD_PASSWORD_HASH unset)" });
    }

    if (!password) {
      return reply.status(401).send({ error: "Password required" });
    }

    const inputHash = crypto.createHash("sha256").update(password).digest("hex");
    if (inputHash !== expectedHash) {
      return reply.status(403).send({ error: "Invalid password" });
    }

    try {
      const { dbAdapter } = await import("../../db/DatabaseAdapter");

      // ── LLM call logs (last 24h) ──────────────────────────
      const llmResult = await dbAdapter.query(
        `SELECT
           COUNT(*)::int AS total_calls,
           COALESCE(AVG(latency_ms)::int, 0) AS avg_latency_ms,
           COALESCE(SUM(input_tokens), 0)::int AS total_input_tokens,
           COALESCE(SUM(output_tokens), 0)::int AS total_output_tokens
         FROM llm_call_logs
         WHERE created_at > NOW() - INTERVAL '24 hours'`,
      );

      // ── LLM call breakdown by service ─────────────────────
      const llmByService = await dbAdapter.query(
        `SELECT service, COUNT(*)::int AS count
         FROM llm_call_logs
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY service
         ORDER BY count DESC`,
      );

      // ── Subscription distribution ─────────────────────────
      const subsResult = await dbAdapter.query(
        `SELECT status, COUNT(*)::int AS count
         FROM user_subscriptions
         GROUP BY status
         ORDER BY count DESC`,
      );

      // ── Total users ───────────────────────────────────────
      const usersResult = await dbAdapter.query(
        "SELECT COUNT(*)::int AS total FROM user_profiles",
      );

      // ── Pipeline runs (last 7 days) ───────────────────────
      const pipelineResult = await dbAdapter.query(
        `SELECT status, COUNT(*)::int AS count
         FROM pipeline_health
         WHERE started_at > NOW() - INTERVAL '7 days'
         GROUP BY status
         ORDER BY count DESC`,
      );

      // ── Recent pipeline runs (last 10) ────────────────────
      const recentPipelines = await dbAdapter.query(
        `SELECT phase, status, started_at, completed_at, symbols_attempted, symbols_succeeded
         FROM pipeline_health
         ORDER BY started_at DESC
         LIMIT 10`,
      );

      // ── Billing revenue ───────────────────────────────────
      const billingResult = await dbAdapter.query(
        `SELECT
           COUNT(*)::int AS total_transactions,
           COALESCE(SUM(amount), 0)::int AS total_revenue_paise
         FROM billing_transactions
         WHERE created_at > datetime('now', '-30 days')`,
      );

      return reply.send({
        server: {
          uptime: Math.floor(process.uptime()),
          node: process.version,
          env: process.env.NODE_ENV || "development",
          memory: process.memoryUsage(),
        },
        llm: {
          last24h: (llmResult.rows as Array<Record<string, number>>)[0] || { total_calls: 0, avg_latency_ms: 0, total_input_tokens: 0, total_output_tokens: 0 },
          byService: llmByService.rows,
        },
        subscriptions: {
          distribution: subsResult.rows,
        },
        users: {
          total: (usersResult.rows as Array<Record<string, number>>)[0]?.total || 0,
        },
        pipelines: {
          summary: pipelineResult.rows,
          recent: recentPipelines.rows,
        },
        billing: (billingResult.rows as Array<Record<string, number>>)[0] || { total_transactions: 0, total_revenue_paise: 0 },
      });
    } catch (err) {
      req.log.error({ err }, "Ops telemetry query failed");
      return reply.status(500).send({ error: "Failed to gather telemetry" });
    }
  });

  // ── GET /api/ops/health ──────────────────────────────────────
  // Lightweight public health check with basic uptime info.
  fastify.get("/api/ops/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { dbAdapter } = await import("../../db/DatabaseAdapter");
      await dbAdapter.query("SELECT 1");
      return reply.send({ ok: true, uptime: Math.floor(process.uptime()), db: "connected" });
    } catch {
      return reply.send({ ok: true, uptime: Math.floor(process.uptime()), db: "disconnected" });
    }
  });
}
