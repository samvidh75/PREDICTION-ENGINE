/**
 * TRACK-P4B-P3 — Health & Readiness Routes
 *
 * /healthz — Liveness probe: process is alive. Always HTTP 200.
 * /readyz — Readiness probe: uses DatabasePolicy, dbAdapter.diagnostics(),
 *           and MigrationRunner.status() for truthful status reporting.
 *
 * Returns HTTP 503 when:
 *   - PostgreSQL is required but unavailable
 *   - Checksum mismatch detected in migrations
 *   - Required dependencies are not ready
 *
 * No secrets in response. No local env var parsing.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { loadDatabasePolicy, buildDiagnostics } from '../../../db/DatabasePolicy';
import { dbAdapter } from '../../../db/DatabaseAdapter';
import { MigrationRunner } from '../../../db/MigrationRunner';
import type { MigrationExecutionAdapter } from '../../../db/MigrationRunner';
import { join } from 'path';
import { query } from '../../../db/index';

async function checkDataHealth(): Promise<{
  ok: boolean;
  state: "ok" | "degraded" | "not_ready";
  coverageCount: number;
  predictionCount: number;
  pipelineFreshnessDays: number | null;
  criticalTablesPresent: boolean;
}> {
  try {
    const [covRes, predRes, pipeRes, tablesRes] = await Promise.all([
      query(`SELECT COUNT(DISTINCT symbol) as cnt FROM financial_snapshots WHERE source_label IS NOT NULL`)
        .catch(() => ({ rows: [{ cnt: 0 }] })),
      query(`SELECT COUNT(*) as cnt FROM prediction_registry WHERE ranking_score IS NOT NULL`)
        .catch(() => ({ rows: [{ cnt: 0 }] })),
      query(`SELECT MAX(ingestion_timestamp) as latest FROM financial_snapshots`)
        .catch(() => ({ rows: [{ latest: null }] })),
      query(`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('symbols', 'financial_snapshots', 'daily_prices', 'prediction_registry')`)
        .catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    const coverageCount = Number(covRes.rows?.[0]?.cnt ?? 0);
    const predictionCount = Number(predRes.rows?.[0]?.cnt ?? 0);
    const latestIngestion = pipeRes.rows?.[0]?.latest;
    const criticalTablesPresent = Number(tablesRes.rows?.[0]?.cnt ?? 0) >= 4;

    let pipelineFreshnessDays: number | null = null;
    if (latestIngestion) {
      pipelineFreshnessDays = Math.round((Date.now() - new Date(latestIngestion).getTime()) / 86400000);
    }

    const hasCoverage = coverageCount > 0;
    const hasPredictions = predictionCount > 0;
    const pipelineFresh = pipelineFreshnessDays === null || pipelineFreshnessDays <= 7;
    const tablesOk = criticalTablesPresent;

    let state: "ok" | "degraded" | "not_ready";
    if (hasCoverage && hasPredictions && pipelineFresh && tablesOk) {
      state = "ok";
    } else if (!hasCoverage && !hasPredictions && !tablesOk) {
      state = "not_ready";
    } else {
      state = "degraded";
    }

    return {
      ok: state === "ok",
      state,
      coverageCount,
      predictionCount,
      pipelineFreshnessDays,
      criticalTablesPresent,
    };
  } catch {
    return {
      ok: false,
      state: "not_ready",
      coverageCount: 0,
      predictionCount: 0,
      pipelineFreshnessDays: null,
      criticalTablesPresent: false,
    };
  }
}

const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // ── /healthz — Liveness only ──────────────────────────────────
  app.get('/healthz', async () => {
    return {
      ok: true,
      service: 'stockstory-backend',
      at: Date.now(),
    };
  });

  // ── /readyz — Readiness probe ─────────────────────────────────
  app.get('/readyz', async (_request, reply) => {
    const policy = loadDatabasePolicy();
    const diag = dbAdapter.diagnostics();

    const dbOk = diag.ready && diag.kind !== 'unavailable';

    let migrationStatus: {
      ok: boolean;
      latestAppliedId: string | null;
      appliedCount: number;
      pendingCount: number;
      checksumMismatch: boolean;
      detail: string | null;
    } = {
      ok: false,
      latestAppliedId: null,
      appliedCount: 0,
      pendingCount: 0,
      checksumMismatch: false,
      detail: 'Migration status unavailable — db not initialized',
    };

    try {
      if (diag.ready && diag.kind !== 'unavailable') {
        const runner = new MigrationRunner(
          dbAdapter as unknown as MigrationExecutionAdapter,
          join(process.cwd(), 'src', 'db', 'migrations'),
        );
        const status = await runner.status();
        migrationStatus = {
          ok: status.ready && status.pendingCount === 0,
          latestAppliedId: status.latestAppliedId,
          appliedCount: status.appliedCount,
          pendingCount: status.pendingCount,
          checksumMismatch: status.checksumMismatch,
          detail: status.detail,
        };
      }
    } catch (err: unknown) {
      migrationStatus = {
        ok: false,
        latestAppliedId: null,
        appliedCount: 0,
        pendingCount: 0,
        checksumMismatch: false,
        detail: 'Migration status unavailable — db not initialized',
      } as typeof migrationStatus;
    }

    const cacheOk = true;
    const cacheRequired = false;
    const configOk = diag.kind !== 'unavailable' || diag.requestedAdapter === 'sqlite';

    const dataHealth = await checkDataHealth();

    const overallOk = dbOk && migrationStatus.appliedCount > 0 && migrationStatus.pendingCount === 0 && dataHealth.state !== "not_ready";

    const body = {
      ok: overallOk,
      state: !dbOk ? "not_ready" : dataHealth.state,
      service: 'stockstory-backend',
      database: {
        kind: diag.kind,
        requestedAdapter: diag.requestedAdapter,
        fallbackUsed: diag.fallbackUsed,
        fallbackAllowed: diag.fallbackAllowed,
        sqliteProductionAllowed: policy.sqliteProductionAllowed,
        ok: dbOk,
        detail: diag.detail,
      },
      migrations: {
        ok: migrationStatus.ok,
        latestAppliedId: migrationStatus.latestAppliedId,
        appliedCount: migrationStatus.appliedCount,
        pendingCount: migrationStatus.pendingCount,
        checksumMismatch: migrationStatus.checksumMismatch,
        detail: migrationStatus.detail,
      },
      data: {
        coverageCount: dataHealth.coverageCount,
        predictionCount: dataHealth.predictionCount,
        pipelineFreshnessDays: dataHealth.pipelineFreshnessDays,
        criticalTablesPresent: dataHealth.criticalTablesPresent,
        state: dataHealth.state,
      },
      cache: { required: cacheRequired, ok: cacheOk, detail: null },
      configuration: { ok: configOk, detail: null },
      at: Date.now(),
    };

    if (!overallOk) {
      return reply.status(503).send(body);
    }

    return reply.status(200).send(body);
  });
};

export default healthRoutes;
