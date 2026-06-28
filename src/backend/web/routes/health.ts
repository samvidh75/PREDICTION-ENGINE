/**
 * Fastify health routes — /healthz and /readyz
 *
 * Single source of truth for health checks used by:
 * - postgres-readiness.integration.test.ts (PostgreSQL mode)
 * - readiness.integration.test.ts (SQLite mode)
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { dbAdapter } from '../../../db/DatabaseAdapter';
import { MigrationRunner } from '../../../db/MigrationRunner';
import path from 'path';

const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // -------------------------------------------------------------------
  // GET /healthz — lightweight liveness probe
  // -------------------------------------------------------------------
  app.get('/healthz', async (_req, reply) => {
    reply.status(200).send({ ok: true });
  });

  // -------------------------------------------------------------------
  // GET /readyz — readiness probe (database + migrations)
  // -------------------------------------------------------------------
  app.get('/readyz', async (_req, reply) => {
    const diagnostics = dbAdapter.diagnostics();
    const dbKind = dbAdapter.kind; // "postgres" | "sqlite" | "unavailable"

    // Build base payload
    const payload: Record<string, unknown> = {
      ok: dbKind !== 'unavailable',
      service: 'stockstory',
      db_kind: dbKind,
      database: {
        kind: dbKind,
        fallbackUsed: diagnostics.fallbackUsed || false,
        requestedAdapter: diagnostics.requestedAdapter,
        ready: diagnostics.ready,
      },
    };

    // If DB is unavailable, return 503 immediately
    if (dbKind === 'unavailable') {
      payload.ok = false;
      payload.detail = diagnostics.detail || 'Database unavailable';
      return reply.status(503).send(payload);
    }

    // Check migration status (only if DB is available)
    try {
      const migrationsDir = process.env.MIGRATIONS_DIR
        || path.join(process.cwd(), 'src', 'db', 'migrations');
      const runner = new MigrationRunner(dbAdapter, migrationsDir);
      const migStatus = await runner.status();

      payload.migrations = {
        applied: migStatus.appliedCount,
        pending: migStatus.pendingCount,
        checksumMismatch: migStatus.checksumMismatch,
        ready: migStatus.ready,
      };

      if (migStatus.checksumMismatch) {
        payload.ok = false;
        payload.detail = migStatus.detail || 'Migration checksum mismatch';
        return reply.status(503).send(payload);
      }
    } catch {
      // Migration check failed — still return 200 if DB is up,
      // but mark migrations as unavailable
      payload.migrations = {
        applied: 0,
        pending: 0,
        checksumMismatch: false,
        ready: false,
        error: 'Migration status unavailable',
      };
    }

    const statusCode = payload.ok ? 200 : 503;
    return reply.status(statusCode).send(payload);
  });
};

export default healthRoutes;
