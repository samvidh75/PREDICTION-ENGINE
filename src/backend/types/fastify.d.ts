/**
 * TRACK-P4B-P3E — Fastify type augmentation for userDb.
 *
 * Private user-state persistence is PostgreSQL-only.
 * Never falls back to SQLite. Exposed as app.userDb.
 *
 * Analytical persistence uses app.db or the canonical dbAdapter.
 */
import 'fastify';
import type { AppEnv } from '../config/env';
import type { CacheHierarchyEngine } from '../persistence/cache/cacheHierarchyEngine';

declare module 'fastify' {
  interface FastifyInstance {
    /** Typed runtime configuration loaded from process env. */
    env: AppEnv;

    /** Cache hierarchy used by stale-while-revalidate flows. */
    cache?: CacheHierarchyEngine;

    /** PostgreSQL-only private user-state database. */
    userDb?: {
      query(
        text: string,
        params?: unknown[],
      ): Promise<{
        rows: Record<string, unknown>[];
        rowCount?: number;
      }>;
    };

    /** Canonical analytical persistence adapter (postgres or sqlite). */
    db?: {
      query(
        text: string,
        params?: unknown[],
      ): Promise<{
        rows: Record<string, unknown>[];
        rowCount?: number;
      }>;
      ping?: () => Promise<{ ok: boolean; detail?: string }>;
      kind?: string;
      diagnostics?: () => import('../../db/DatabasePolicy').DatabaseDiagnostics;
    };
  }

  interface FastifyRequest {
    /** Correlation ID assigned at request ingress. */
    requestId?: string;
  }
}
