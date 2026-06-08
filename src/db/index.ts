// src/db/index.ts
// Production database configuration — PostgreSQL with SQLite fallback.
// ESM-compatible: uses dynamic import() instead of require().

import dotenv from "dotenv";
dotenv.config();

let pool: any;

// Try PostgreSQL first via dynamic import
const pgUrl = process.env.DATABASE_URL;

async function initPool(): Promise<any> {
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
      console.log("✅ Database: PostgreSQL configured");
      return pool;
    } catch (err: any) {
      console.warn(`⚠️ PostgreSQL pool creation failed: ${err.message}. Falling back to SQLite.`);
    }
  } else {
    console.log("ℹ️  DATABASE_URL not set. Using SQLite fallback.");
  }

  // Fall back to SQLite via dynamic import
  try {
    const { pool: sqlitePool } = await import("./SQLiteAdapter.js");
    pool = sqlitePool;
    console.log("✅ Database: SQLite fallback active (data/stockstory.db)");
    return pool;
  } catch (err: any) {
    console.error(`❌ SQLite fallback failed: ${err.message}`);
    // Create a no-op pool that logs errors but doesn't crash
    pool = {
      query: async (text: string, params?: any[]) => {
        console.error(`❌ No database available. Query rejected: ${text.substring(0, 100)}`);
        return { rows: [], rowCount: 0 };
      },
      end: async () => {},
    };
    return pool;
  }
}

// Initialize synchronously-equivalent async
// For imports, we provide the pool synchronously via a top-level await wrapper
const _initPromise = initPool();

// Wrap the pool so that query() works even before init completes
// (pool.query is set once initPromise resolves)
const lazyPool = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === 'then') return undefined; // prevent await confusion
    return async (...args: any[]) => {
      const realPool = await _initPromise;
      if (typeof realPool[prop] === 'function') {
        return realPool[prop](...args);
      }
      return realPool[prop];
    };
  },
});

export const query = async (text: string, params?: any[]) => {
  const p = await _initPromise;
  return p.query(text, params);
};

export default lazyPool;
