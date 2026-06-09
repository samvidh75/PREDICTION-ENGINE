import type { FastifyInstance } from "fastify";

/**
 * PersistenceCoordinator
 * - single place to wire clients + domain repositories
 * - strict separation: repositories must not reach into scheduling/realtime/render.
 * - consumes app.userDb (PostgreSQL-only, never SQLite fallback).
 */
export class PersistenceCoordinator {
  private db: {
    query(
      text: string,
      params?: unknown[]
    ): Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>;
  } | null;

  constructor(
    db: {
      query(
        text: string,
        params?: unknown[]
      ): Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>;
    } | null
  ) {
    this.db = db;
  }

  getUserDb(): {
    query(
      text: string,
      params?: unknown[]
    ): Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>;
  } | null {
    return this.db;
  }
}

/**
 * Builds coordinator from Fastify instance decorations.
 * Uses app.userDb — PostgreSQL-only, never SQLite fallback.
 */
export function createPersistenceCoordinator(
  app: FastifyInstance
): PersistenceCoordinator {
  return new PersistenceCoordinator(app.userDb ?? null);
}
