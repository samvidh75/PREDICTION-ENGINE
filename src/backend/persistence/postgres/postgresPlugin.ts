/**
 * TRACK-P4B-P3 — Private User DB Plugin
 *
 * userDb is PostgreSQL-only. Never SQLite fallback.
 * Returns 503 when PostgreSQL is unavailable.
 *
 * Previously named "postgres" — now renamed to "userDb" to clarify
 * the boundary between analytical persistence (app.db) and
 * private user-state persistence (app.userDb).
 */
import type { FastifyPluginAsync } from "fastify";
import { PostgresClient } from "./postgresClient";

export const postgresPlugin: FastifyPluginAsync = async (app) => {
  if (!app.env?.postgres) {
    // No DATABASE_URL configured. Private user DB is unavailable.
    app.decorate("userDb", undefined);
    return;
  }

  const client = new PostgresClient(app.env);
  // userDb is PostgreSQL-only. Never SQLite.
  // Private routes return HTTP 503 when this is unavailable.
  app.decorate("userDb", client);

  // Legacy alias — remove after all references are migrated
  app.decorate("postgres", client);
};
