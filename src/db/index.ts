// src/db/index.ts
// Canonical database adapter — single persistence abstraction for the entire app.
//
// This re-exports from DatabaseAdapter which provides:
//   - PostgreSQL when DATABASE_URL is set and reachable
//   - SQLite fallback when PostgreSQL is unavailable
//   - Explicit "unavailable" state when nothing works
//
// Legacy consumers that import `pool` or `query` from this module will
// continue to work because dbAdapter provides the same interface.

export { dbAdapter } from "./DatabaseAdapter";
export { dbAdapter as default } from "./DatabaseAdapter";
export type { DbKind, DbQueryResult } from "./DatabaseAdapter";

// Re-export query for backward compatibility with code that does:
//   import { query } from "../db/index"
import { dbAdapter } from "./DatabaseAdapter";
export async function query<T extends Record<string, any> = Record<string, any>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await dbAdapter.query(text, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount,
  };
}

// Re-export pool-like interface for backward compatibility
// Code that does `import pool from "../db/index"` gets dbAdapter
export { dbAdapter as pool } from "./DatabaseAdapter";
