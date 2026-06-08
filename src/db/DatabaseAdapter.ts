/**
 * Canonical DatabaseAdapter — single persistence abstraction for the entire app.
 *
 * Replaces the fragmented pattern where:
 *   - src/db/index.ts provided a global pg Pool with SQLite fallback
 *   - postgresClient.ts provided a separate Fastify-decorated PostgresClient
 *   - /healthz checked one adapter while routes used another
 *
 * Usage:
 *   const db = adapter.query(sql, params)
 *   const ok = await adapter.ping()
 *   await adapter.shutdown()
 *   adapter.kind // "postgres" | "sqlite" | "unavailable"
 */
import type * as pg from "pg";

export type DbKind = "postgres" | "sqlite" | "unavailable";

export interface DbQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SQLitePoolLike = { query: (text: string, params?: any[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>; end?: () => Promise<void> };

export class DatabaseAdapter {
  private _kind: DbKind = "unavailable";
  private pool: pg.Pool | null = null;
  private sqlitePool: SQLitePoolLike | null = null;
  private _initialized = false;

  get kind(): DbKind {
    return this._kind;
  }

  /**
   * Initialize the adapter. Prefers PostgreSQL when DATABASE_URL is set and
   * a connection can be established. Falls back to SQLite otherwise.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;

    const pgUrl = process.env.DATABASE_URL;

    if (pgUrl) {
      try {
        const { default: pgMod } = await import("pg");
        const { Pool } = pgMod;
        this.pool = new Pool({
          connectionString: pgUrl,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          max: 20,
        });
        // Verify connectivity
        const res = await this.pool.query("SELECT 1 AS one");
        if (res.rows.length === 1) {
          this._kind = "postgres";
          console.log("[db] Canonical adapter: PostgreSQL connected");
          return;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[db] PostgreSQL unavailable: ${msg}. Falling back to SQLite.`);
        if (this.pool) {
          try { await this.pool.end(); } catch {}
          this.pool = null;
        }
      }
    }

    // SQLite fallback
    try {
      const sqliteMod = await import("./SQLiteAdapter");
      this.sqlitePool = sqliteMod.pool;
      this._kind = "sqlite";
      console.log("[db] Canonical adapter: SQLite fallback active");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[db] SQLite fallback failed: ${msg}`);
      this._kind = "unavailable";
    }
  }

  /**
   * Execute a query against the active database.
   * Auto-initializes if not yet initialized (safe for lazy-loading scenarios).
   */
  async query(text: string, params?: unknown[]): Promise<DbQueryResult> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._kind === "postgres" && this.pool) {
      const result = await this.pool.query(text, params as unknown[]);
      return { rows: result.rows as Record<string, unknown>[], rowCount: result.rowCount ?? 0 };
    }

    if (this._kind === "sqlite" && this.sqlitePool) {
      return this.sqlitePool.query(text, params as unknown[]);
    }

    throw new Error("DATABASE_UNAVAILABLE: No database adapter is active");
  }

  /**
   * Ping the active database.
   */
  async ping(): Promise<{ ok: boolean; detail?: string }> {
    if (this._kind === "unavailable") {
      return { ok: false, detail: "DATABASE_UNAVAILABLE" };
    }

    try {
      if (this._kind === "postgres" && this.pool) {
        const res = await this.pool.query("SELECT 1 AS one");
        return { ok: res.rows.length === 1 };
      }
      if (this._kind === "sqlite" && this.sqlitePool) {
        await this.sqlitePool.query("SELECT 1 AS one");
        return { ok: true };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, detail: msg };
    }

    return { ok: false, detail: "UNKNOWN_ADAPTER_STATE" };
  }

  /**
   * Gracefully close all connections.
   */
  async shutdown(): Promise<void> {
    if (this.pool) {
      try { await this.pool.end(); } catch {}
      this.pool = null;
    }
    if (this.sqlitePool) {
      try { await (this.sqlitePool as { end?: () => Promise<void> }).end?.(); } catch {}
      this.sqlitePool = null;
    }
    this._kind = "unavailable";
  }
}

/** Singleton adapter — initialized once at startup. */
export const dbAdapter = new DatabaseAdapter();
export default dbAdapter;
