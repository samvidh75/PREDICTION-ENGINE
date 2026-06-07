import type { FastifyPluginAsync } from "fastify";
import { PostgresClient } from "./postgresClient";

export const postgresPlugin: FastifyPluginAsync = async (app) => {
  if (!app.env?.postgres) {
    // No DATABASE_URL configured. Keep persistence safe+optional.
    app.decorate("postgres", undefined);
    return;
  }

  const client = new PostgresClient(app.env);
  app.decorate("postgres", client);
};
