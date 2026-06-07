// src/db/index.ts
// Production database configuration — PostgreSQL with SQLite fallback.

import dotenv from "dotenv";
dotenv.config();

let pool: any;

// Try PostgreSQL first
const pgUrl = process.env.DATABASE_URL;
if (pgUrl) {
  try {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: pgUrl,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20,
    });
    console.log("✅ Database: PostgreSQL configured");
  } catch (err: any) {
    console.warn(`⚠️ PostgreSQL pool creation failed: ${err.message}. Falling back to SQLite.`);
    pool = null;
  }
} else {
  console.log("ℹ️  DATABASE_URL not set. Using SQLite fallback.");
  pool = null;
}

// If no PostgreSQL pool, use SQLite
if (!pool) {
  try {
    const { pool: sqlitePool } = require("./SQLiteAdapter");
    pool = sqlitePool;
    console.log("✅ Database: SQLite fallback active (data/stockstory.db)");
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
  }
}

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
