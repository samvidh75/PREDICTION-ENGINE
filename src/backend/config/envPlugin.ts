import type { FastifyPluginAsync } from "fastify";
import { loadEnv } from "./env";

export const envPlugin: FastifyPluginAsync = async (app) => {
  const env = loadEnv();

  // Proper Fastify decoration so downstream plugins/routes can always read it.
  app.decorate("env", env);
};
