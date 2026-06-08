/**
 * TRACK-P4B-P3 — Database Policy Engine
 *
 * Single source of truth for database adapter selection.
 * No other module may independently decide PostgreSQL vs SQLite.
 *
 * Environment variables:
 *   DB_ADAPTER           = auto | postgres | sqlite
 *   ALLOW_SQLITE_FALLBACK = true | false
 *   ALLOW_SQLITE_IN_PRODUCTION = true | false
 *   SQLITE_DB_PATH        = path (default: data/stockstory.db)
 *   NODE_ENV              = development | test | production
 *   DATABASE_URL          = PostgreSQL connection string
 */

export type RequestedDbAdapter = 'auto' | 'postgres' | 'sqlite';

export interface DatabasePolicy {
  requestedAdapter: RequestedDbAdapter;
  allowSqliteFallback: boolean;
  sqliteProductionAllowed: boolean;
  allowSqliteInProduction: boolean;
  sqliteDbPath: string;
  nodeEnv: string;
}

const DEFAULT_SQLITE_PATH = 'data/stockstory.db';

export function loadDatabasePolicy(
  env: NodeJS.ProcessEnv = process.env,
): DatabasePolicy {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  // Requested adapter
  const rawAdapter = (env.DB_ADAPTER ?? '').toLowerCase();
  let requestedAdapter: RequestedDbAdapter = 'auto';
  if (rawAdapter === 'postgres' || rawAdapter === 'sqlite') {
    requestedAdapter = rawAdapter;
  }

  // SQLite fallback
  const allowSqliteFallback = env.ALLOW_SQLITE_FALLBACK !== 'false';

  // SQLite in production
  const allowSqliteInProduction = env.ALLOW_SQLITE_IN_PRODUCTION === 'true';
  const sqliteProductionAllowed = isProduction ? allowSqliteInProduction : true;

  // SQLite DB path
  const sqliteDbPath = env.SQLITE_DB_PATH ?? DEFAULT_SQLITE_PATH;

  return {
    requestedAdapter,
    allowSqliteFallback,
    sqliteProductionAllowed,
    allowSqliteInProduction,
    sqliteDbPath,
    nodeEnv,
  };
}

/**
 * Resolve the actual adapter to use based on policy and PostgreSQL availability.
 */
export function resolveAdapter(
  policy: DatabasePolicy,
  postgresAvailable: boolean,
  postgresError?: string | null,
): {
  kind: 'postgres' | 'sqlite' | 'unavailable';
  fallbackUsed: boolean;
  detail: string | null;
} {
  const { requestedAdapter, allowSqliteFallback, sqliteProductionAllowed, nodeEnv } = policy;
  const isProduction = nodeEnv === 'production';

  // Explicit PostgreSQL requested
  if (requestedAdapter === 'postgres') {
    if (postgresAvailable) {
      return { kind: 'postgres', fallbackUsed: false, detail: null };
    }
    // PostgreSQL unavailable — check if SQLite fallback is allowed
    if (allowSqliteFallback && sqliteProductionAllowed) {
      return {
        kind: 'sqlite',
        fallbackUsed: true,
        detail: postgresError ?? 'PostgreSQL unavailable; fell back to SQLite',
      };
    }
    return {
      kind: 'unavailable',
      fallbackUsed: false,
      detail: postgresError ?? 'PostgreSQL is required but unavailable',
    };
  }

  // Explicit SQLite requested
  if (requestedAdapter === 'sqlite') {
    if (isProduction && !sqliteProductionAllowed) {
      return {
        kind: 'unavailable',
        fallbackUsed: false,
        detail: 'SQLite is not allowed in production',
      };
    }
    return { kind: 'sqlite', fallbackUsed: false, detail: null };
  }

  // Auto — try PostgreSQL first, fall back to SQLite if allowed
  if (postgresAvailable) {
    return { kind: 'postgres', fallbackUsed: false, detail: null };
  }

  if (allowSqliteFallback && sqliteProductionAllowed) {
    return {
      kind: 'sqlite',
      fallbackUsed: true,
      detail: postgresError ?? 'PostgreSQL unavailable; fell back to SQLite',
    };
  }

  return {
    kind: 'unavailable',
    fallbackUsed: false,
    detail: postgresError ?? 'No database adapter available',
  };
}

export interface DatabaseDiagnostics {
  kind: 'postgres' | 'sqlite' | 'unavailable';
  requestedAdapter: 'auto' | 'postgres' | 'sqlite';
  fallbackUsed: boolean;
  fallbackAllowed: boolean;
  ready: boolean;
  detail: string | null;
}

export function buildDiagnostics(
  policy: DatabasePolicy,
  resolvedKind: 'postgres' | 'sqlite' | 'unavailable',
  fallbackUsed: boolean,
  detail: string | null,
): DatabaseDiagnostics {
  return {
    kind: resolvedKind,
    requestedAdapter: policy.requestedAdapter,
    fallbackUsed,
    fallbackAllowed: policy.allowSqliteFallback,
    ready: resolvedKind !== 'unavailable',
    detail,
  };
}
