// src/db/index.ts
// Production database configuration — pure PostgreSQL pool, no simulator fallbacks.

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("❌ Critical Error: DATABASE_URL is not configured in the environment");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Configure appropriate timeouts and limits for production
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
