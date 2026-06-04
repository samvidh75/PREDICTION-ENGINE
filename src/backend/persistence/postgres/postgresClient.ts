import type { AppEnv } from "../../config/env";

import pg from "pg";
import { pushDbDiag } from "../../monitoring/dbDiagnostics";

type QueryParams = Array<string | number | boolean | null>;

/**
 * PostgresClient
 * - lazy-initialized Pool
 * - fails safe when DATABASE_URL is missing
 * - exposes a query helper with basic retry safety hooks (no busy loops)
 */
export class PostgresClient {
  private env: AppEnv;

  private pool: pg.Pool | null = null;

  constructor(env: AppEnv) {
    this.env = env;
  }

  private ensurePool(): pg.Pool | null {
    if (this.pool) return this.pool;
    if (!this.env.postgres) return null;

    const connectionString = this.env.postgres.connectionString;

    this.pool = new pg.Pool({
      connectionString,
      // conservative defaults for responsive APIs
      max: 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 3_000,
    });

    return this.pool;
  }

  async ping(): Promise<{ ok: boolean; detail?: string }> {
    const pool = this.ensurePool();
    if (!pool) {
      pushDbDiag({ type: "ping", at: Date.now(), ok: false, detail: "POSTGRES_UNCONFIGURED" });
      return { ok: false, detail: "POSTGRES_UNCONFIGURED" };
    }

    try {
      const t0 = Date.now();
      const res = await pool.query("select 1 as one");
      const ms = Date.now() - t0;

      const ok = res.rows.length === 1;
      pushDbDiag({ type: "ping", at: Date.now(), ok, detail: ok ? undefined : "UNEXPECTED_PING_RESPONSE" });

      if (ok) return { ok: true };
      return { ok: false, detail: "UNEXPECTED_PING_RESPONSE" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN_ERROR";
      pushDbDiag({ type: "ping", at: Date.now(), ok: false, detail: msg });
      return { ok: false, detail: msg };
    }
  }

  async query<T>(
    sql: string,
    params?: QueryParams,
  ): Promise<{ rows: T[] }> {
    const pool = this.ensurePool();
    if (!pool) {
      throw new Error("POSTGRES_UNCONFIGURED");
    }

    const t0 = Date.now();

    try {
      const result = await pool.query(sql, params as unknown as unknown[]);
      const ms = Date.now() - t0;

      pushDbDiag({
        type: "query",
        at: Date.now(),
        ok: true,
        ms,
        rows: result.rows.length,
      });

      return { rows: result.rows as T[] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN_ERROR";
      const ms = Date.now() - t0;

      pushDbDiag({
        type: "query",
        at: Date.now(),
        ok: false,
        ms,
        error: msg,
      });

      throw err;
    }
  }

  async shutdown(): Promise<void> {
    const pool = this.pool;
    this.pool = null;
    if (!pool) return;
    await pool.end();
  }
}
