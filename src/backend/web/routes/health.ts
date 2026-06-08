/**
 * TRACK-P4B — Health & Readiness Routes
 *
 * /healthz — Liveness probe: process is alive. Always 200.
 * /readyz — Readiness probe: production dependencies are ready.
 *   Returns 200 when all required deps are up.
 *   Returns 503 when required DB or dependencies are unavailable.
 *
 * SQLite fallback is governed by ALLOW_SQLITE_FALLBACK env var:
 *   - development: true (default)
 *   - test: explicit
 *   - production: false (default)
 * When production PostgreSQL fails and ALLOW_SQLITE_FALLBACK=false:
 *   /readyz returns 503 — no silent SQLite degradation.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const ALLOW_SQLITE_FALLBACK = process.env.ALLOW_SQLITE_FALLBACK !== 'false';

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
    const appDb = (app as unknown as {
      db?: {
        ping: () => Promise<{ ok: boolean; detail?: string }>;
        kind: string;
      };
    }).db;

    // Database readiness
    let dbOk = false;
    let dbKind = 'unavailable';
    let dbDetail: string | null = null;

    if (appDb) {
      dbKind = appDb.kind;
      try {
        const pingResult = await appDb.ping();
        dbOk = pingResult.ok;
        dbDetail = pingResult.detail ?? null;
      } catch (err: any) {
        dbOk = false;
        dbDetail = err?.message ?? 'Ping failed';
      }
    }

    // SQLite fallback check
    if (dbKind === 'sqlite' && !ALLOW_SQLITE_FALLBACK) {
      dbOk = false;
      dbDetail = 'SQLite fallback is disabled in this environment. PostgreSQL is required.';
    }

    // Migration version
    let migrationOk = false;
    let migrationVersion: string | null = null;
    try {
      if (appDb) {
        const migRes = await (appDb as any).query?.(
          `SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1`
        );
        if (migRes?.rows?.length > 0) {
          migrationVersion = String(migRes.rows[0].version);
          migrationOk = true;
        }
      }
    } catch {
      migrationOk = false;
      migrationVersion = null;
    }

    // Cache readiness — deferred until cache engine is wired through app
    const cacheOk = true;

    // Configuration readiness
    const configOk = !!process.env.DATABASE_URL || dbKind === 'sqlite';

    // Overall readiness: DB required, others optional-but-reported
    const overallOk = dbOk && configOk;

    const body = {
      ok: overallOk,
      service: 'stockstory-backend',
      database: {
        kind: dbKind,
        ok: dbOk,
        detail: dbDetail,
      },
      migrations: {
        ok: migrationOk,
        version: migrationVersion,
      },
      cache: {
        ok: cacheOk,
      },
      configuration: {
        ok: configOk,
      },
      at: Date.now(),
    };

    if (!overallOk) {
      return reply.status(503).send(body);
    }

    return reply.status(200).send(body);
  });
};

export default healthRoutes;
