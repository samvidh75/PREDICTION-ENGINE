/**
 * TRACK-P4B-P3G — Private User DB Plugin
 *
 * userDb is PostgreSQL-only. Never SQLite fallback.
 * Returns 503 when PostgreSQL is unavailable.
 *
 * app.postgres legacy alias is removed.
 * Private user-state persistence boundary: app.userDb only.
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
};
