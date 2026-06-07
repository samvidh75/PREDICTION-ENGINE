import type { FastifyInstance } from "fastify";
import type { PostgresClient } from "./postgres/postgresClient";

/**
 * PersistenceCoordinator
 * - single place to wire clients + domain repositories
 * - strict separation: repositories must not reach into scheduling/realtime/render.
 */
export class PersistenceCoordinator {
  private db: PostgresClient | null;

  constructor(db: PostgresClient | null) {
    this.db = db;
  }

  getPostgres(): PostgresClient | null {
    return this.db;
  }
}

/**
 * Builds coordinator from Fastify instance decorations.
 */
export function createPersistenceCoordinator(app: FastifyInstance): PersistenceCoordinator {
  return new PersistenceCoordinator(app.postgres ?? null);
}
