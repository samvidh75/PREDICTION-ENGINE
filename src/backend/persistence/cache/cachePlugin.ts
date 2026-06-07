import type { FastifyPluginAsync } from "fastify";
import type { CacheHierarchyEngine } from "./cacheHierarchyEngine";
import { CacheHierarchyEngine as CacheEngine } from "./cacheHierarchyEngine";
import { loadEnv } from "../../config/env";

let cacheEngineSingleton: CacheHierarchyEngine | null = null;

export function getCacheEngine(): CacheHierarchyEngine | null {
  return cacheEngineSingleton;
}

declare module "fastify" {
  interface FastifyInstance {
    cache?: CacheHierarchyEngine;
  }
}

export const cachePlugin: FastifyPluginAsync = async (app) => {
  const env = app.env ?? loadEnv();

  const engine: CacheHierarchyEngine = new CacheEngine({ env });
  cacheEngineSingleton = engine;

  // Fastify decoration (kept for future use)
  app.decorate("cache", engine);
};
