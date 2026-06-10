/**
 * Canonical DatabaseAdapter — single persistence abstraction for the entire app.
 *
 * Replaces the fragmented pattern where:
 *   - src/db/index.ts provided a global pg Pool with SQLite fallback
 *   - postgresClient.ts provided a separate Fastify-decorated PostgresClient
 *   - /healthz checked one adapter while routes used another
 *
 * TASK 1: Uses DatabasePolicy to make adapter selection explicit and auditable.
 *         No silent fallback when policy disallows it.
 *
 * Usage:
 *   const db = adapter.query(sql, params)
 *   const ok = await adapter.ping()
 *   await adapter.shutdown()
 *   adapter.kind // "postgres" | "sqlite" | "unavailable"
 *   adapter.diagnostics() // DatabaseDiagnostics
 *   adapter.reset() // for tests
 */
import type * as pg from "pg";
import {
  loadDatabasePolicy,
  resolveAdapter,
  buildDiagnostics,
} from "./DatabasePolicy";
import type {
  DatabasePolicy,
  DatabaseDiagnostics,
} from "./DatabasePolicy";

export type DbKind = "postgres" | "sqlite" | "unavailable";

export interface DbQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

 
type SQLitePoolLike = {
  query: (text: string, params?: any[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;

  executeScript?: (
    sql: string
  ) => Promise<void>;

  end?: () => Promise<void>;
};

export class DatabaseAdapter {
  private _kind: DbKind = "unavailable";
  private pool: pg.Pool | null = null;
  private sqlitePool: SQLitePoolLike | null = null;
  private _initialized = false;
  private _diagnostics: DatabaseDiagnostics = {
    kind: "unavailable",
    requestedAdapter: "auto",
    fallbackUsed: false,
    fallbackAllowed: true,
    ready: false,
    detail: "Not initialized",
  };
  private _policy: DatabasePolicy | null = null;

  get kind(): DbKind {
    return this._kind;
  }

  /**
   * Diagnostics describing the current adapter state.
   */
  diagnostics(): DatabaseDiagnostics {
    return { ...this._diagnostics };
  }

  /**
   * Reset the adapter for testing.
   * Closes connections and clears initialization state.
   */
  async reset(): Promise<void> {
    await this.shutdown();
    this._initialized = false;
    this._diagnostics = {
      kind: "unavailable",
      requestedAdapter: "auto",
      fallbackUsed: false,
      fallbackAllowed: true,
      ready: false,
      detail: "Reset for testing",
    };
    this._policy = null;
  }

  /**
   * Initialize the adapter using DatabasePolicy.
   * No longer silently falls back to SQLite when policy disallows it.
   * Never logs connection strings or secrets.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;

    // Load policy
    const policy = loadDatabasePolicy();
    this._policy = policy;

    const pgUrl = process.env.DATABASE_URL;

    // Determine if PostgreSQL should be attempted:
    // - Explicit sqlite requested → skip PostgreSQL
    // - No DATABASE_URL → skip PostgreSQL
    const shouldTryPostgres =
      policy.requestedAdapter !== "sqlite" && !!pgUrl;

    let postgresAvailable = false;
    let postgresError: string | null = null;

    if (shouldTryPostgres) {
      try {
        const { default: pgMod } = await import("pg");
        pgMod.types.setTypeParser(1082, (val) => val); // Return DATE as string (same as SQLite)
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
          postgresAvailable = true;
        }
      } catch (err: unknown) {
        postgresError = err instanceof Error ? err.message : String(err);
        // Close the failed pool if it was created
        if (this.pool) {
          try { await this.pool.end(); } catch { /* ignore */ }
          this.pool = null;
        }
      }
    }

    // Use the policy to resolve which adapter to actually use
    const resolved = resolveAdapter(policy, postgresAvailable, postgresError);

    this._kind = resolved.kind;

    // If resolution says sqlite but we don't have a SQLite pool yet, create one
    if (resolved.kind === "sqlite") {
      try {
        const sqliteMod = await import("./SQLiteAdapter");
        this.sqlitePool = sqliteMod.pool;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // SQLite failed — treat as unavailable
        this._kind = "unavailable";
        this._diagnostics = buildDiagnostics(policy, "unavailable", false, `SQLite failed: ${msg}`);
        return;
      }
    }

    // Clean up PostgreSQL pool if we're not using it
    if (resolved.kind !== "postgres" && this.pool) {
      try { await this.pool.end(); } catch { /* ignore */ }
      this.pool = null;
    }

    // Build diagnostics
    this._diagnostics = buildDiagnostics(policy, resolved.kind, resolved.fallbackUsed, resolved.detail);

    if (this._kind === "postgres") {
      console.log("[db] Canonical adapter: PostgreSQL connected");
    } else if (this._kind === "sqlite") {
      if (resolved.fallbackUsed) {
        console.warn(`[db] Canonical adapter: SQLite fallback (${resolved.detail ?? "PostgreSQL unavailable"})`);
      } else {
        console.log("[db] Canonical adapter: SQLite configured");
      }
    } else {
      console.error(`[db] Canonical adapter: unavailable (${resolved.detail ?? "No database available"})`);
    }
  }

  /**
   * Execute a multi-statement SQL script on the active database.
   * SQLite delegates to db.exec(). PostgreSQL delegates to pool.query().
   * Unavailable mode throws. Never silently falls back during script execution.
   * Never logs credentials or connection strings.
   */
  async executeScript(sql: string): Promise<void> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._kind === "sqlite" && this.sqlitePool?.executeScript) {
      await this.sqlitePool.executeScript(sql);
      return;
    }

    if (this._kind === "postgres" && this.pool) {
      // Translate SQLite dialect to PostgreSQL on the fly
      let pgSql = sql
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, "SERIAL PRIMARY KEY")
        .replace(/datetime\('now'\)/g, "CURRENT_TIMESTAMP")
        .replace(/date\('now'\)/g, "CURRENT_DATE")
        .replace(/INSERT OR IGNORE INTO (\w+)/gi, "INSERT INTO $1");

      if (sql.includes("INSERT OR IGNORE INTO subscription_plans")) {
        pgSql = pgSql.replace(/;\s*$/, " ON CONFLICT (id) DO NOTHING;");
      }

      // NON-DESTRUCTIVE COMPATIBILITY: Historical migration 009 attempts to create indices on
      // snapshot_date, roce, and net_margin columns on financial_snapshots table. However, since
      // financial_snapshots was already created in migration 001, CREATE TABLE IF NOT EXISTS in 009 is a no-op,
      // leaving these columns missing. To avoid migration failure without modifying historical migrations
      // 001-011 or using destructive DROP TABLE, we add these missing columns non-destructively on the fly.
      if (sql.includes("CREATE TABLE IF NOT EXISTS financial_snapshots")) {
        const tableCheck = await this.pool.query(`
          SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_snapshots'
        `);
        if (tableCheck.rows.length > 0) {
          await this.pool.query(`
            ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS snapshot_date DATE DEFAULT CURRENT_DATE;
            ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS roce NUMERIC(8,4);
            ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS net_margin NUMERIC(8,4);
          `);
        }
      }

      await this.pool.query(pgSql);
      return;
    }

    throw new Error("DATABASE_UNAVAILABLE: Cannot execute migration script");
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
   * Get a client connection (for transactions).
   * Works for PostgreSQL; SQLite uses a simplified wrapper.
   */
  async connect(): Promise<{
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
    release: () => void;
  }> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._kind === "postgres" && this.pool) {
      const client = await this.pool.connect();
      return {
        query: async (text: string, params?: unknown[]) => {
          const result = await client.query(text, params as unknown[]);
          return { rows: result.rows as Record<string, unknown>[], rowCount: result.rowCount ?? 0 };
        },
        release: () => client.release(),
      };
    }

    // SQLite fallback: no real transactions, but provide compatible interface
    if (this._kind === "sqlite" && this.sqlitePool) {
      return {
        query: async (text: string, params?: unknown[]) =>
          this.sqlitePool!.query(text, params as unknown[]),
        release: () => { /* no-op for SQLite */ },
      };
    }

    throw new Error("DATABASE_UNAVAILABLE: Cannot get client connection");
  }

  /**
   * Gracefully close all connections.
   */
  async shutdown(): Promise<void> {
    if (this.pool) {
      try { await this.pool.end(); } catch { /* ignore */ }
      this.pool = null;
    }
    if (this.sqlitePool) {
      try { await (this.sqlitePool as { end?: () => Promise<void> }).end?.(); } catch { /* ignore */ }
      this.sqlitePool = null;
    }
    this._kind = "unavailable";
  }
}

/** Singleton adapter — initialized once at startup. */
export const dbAdapter = new DatabaseAdapter();
export default dbAdapter;
