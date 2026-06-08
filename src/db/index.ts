// src/db/index.ts
// Canonical database adapter: PostgreSQL first, SQLite fallback, explicit health state.

import dotenv from "dotenv";
dotenv.config();

export type DatabaseKind = "postgres" | "sqlite" | "unavailable";

export interface DatabaseAdapter {
  kind: DatabaseKind;
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount?: number }>;
  ping(): Promise<{ ok: boolean; detail: string | null }>;
  shutdown(): Promise<void>;
}

let pool: any;
let activeKind: DatabaseKind = "unavailable";
let lastDetail: string | null = null;

async function initPool(): Promise<any> {
  const pgUrl = process.env.DATABASE_URL;

  if (pgUrl) {
    try {
      const { default: pg } = await import("pg");
      const { Pool } = pg;
      pool = new Pool({
        connectionString: pgUrl,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 20,
      });
      activeKind = "postgres";
      lastDetail = null;
      console.log("[db] PostgreSQL configured");
      return pool;
    } catch (err: any) {
      activeKind = "unavailable";
      lastDetail = err?.message ?? "POSTGRES_POOL_CREATION_FAILED";
      console.warn(`[db] PostgreSQL pool creation failed: ${lastDetail}. Falling back to SQLite.`);
    }
  } else {
    console.log("[db] DATABASE_URL not set. Using SQLite fallback.");
  }

  try {
    const { pool: sqlitePool } = await import("./SQLiteAdapter.js");
    pool = sqlitePool;
    activeKind = "sqlite";
    lastDetail = null;
    console.log("[db] SQLite fallback active");
    return pool;
  } catch (err: any) {
    activeKind = "unavailable";
    lastDetail = err?.message ?? "SQLITE_FALLBACK_FAILED";
    console.error(`[db] SQLite fallback failed: ${lastDetail}`);
    pool = {
      query: async (text: string) => {
        throw new Error(`NO_DATABASE_AVAILABLE: ${text.substring(0, 100)}`);
      },
      end: async () => {},
      ping: async () => ({ ok: false, detail: lastDetail ?? "NO_DATABASE_AVAILABLE" }),
      shutdown: async () => {},
    };
    return pool;
  }
}

const initPromise = initPool();

const lazyPool = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === "then") return undefined;
    return async (...args: any[]) => {
      const realPool = await initPromise;
      if (typeof realPool[prop] === "function") {
        return realPool[prop](...args);
      }
      return realPool[prop];
    };
  },
});

export const query = async (text: string, params?: any[]) => {
  const p = await initPromise;
  return p.query(text, params);
};

export const getDatabaseAdapter = async (): Promise<DatabaseAdapter> => {
  const p = await initPromise;
  return {
    kind: activeKind,
    query: (text: string, params?: any[]) => p.query(text, params),
    ping: async () => {
      if (typeof p.ping === "function") return p.ping();
      try {
        await p.query("select 1 as one");
        return { ok: true, detail: null };
      } catch (err: any) {
        return { ok: false, detail: err?.message ?? lastDetail ?? "DATABASE_PING_FAILED" };
      }
    },
    shutdown: async () => {
      if (typeof p.shutdown === "function") return p.shutdown();
      if (typeof p.end === "function") return p.end();
    },
  };
};

export default lazyPool;
