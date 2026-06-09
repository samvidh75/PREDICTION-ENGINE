import type { FastifyInstance } from "fastify";

/**
 * UserDb — PostgreSQL-only private user-state interface consumed by routes.
 * Matches the app.userDb decoration type from fastify.d.ts.
 */
export interface UserDbClient {
  query(
    text: string,
    params?: unknown[],
  ): Promise<{
    rows: Record<string, unknown>[];
    rowCount?: number;
  }>;
}

/**
 * PersistenceCoordinator
 * - single place to wire clients + domain repositories
 * - strict separation: repositories must not reach into scheduling/realtime/render.
 * - consumes app.userDb (PostgreSQL-only, never SQLite fallback).
 */
export class PersistenceCoordinator {
  private db: UserDbClient | null;

  constructor(db: UserDbClient | null) {
    this.db = db;
  }

  getUserDb(): UserDbClient | null {
    return this.db;
  }
}

/**
 * Builds coordinator from Fastify instance decorations.
 * Uses app.userDb — PostgreSQL-only, never SQLite fallback.
 */
export function createPersistenceCoordinator(app: FastifyInstance): PersistenceCoordinator {
  return new PersistenceCoordinator(app.userDb?.query ? (app.userDb as unknown as UserDbClient) : null);
}
