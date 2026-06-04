import "fastify";
import type { AppEnv } from "../config/env";
import type { PostgresClient } from "../persistence/postgres/postgresClient";
import type { PersistenceCoordinator } from "../persistence/persistenceCoordinator";
import type { MigrationManager } from "../persistence/migrations/migrationManager";
import type { CacheHierarchyEngine } from "../persistence/cache/cacheHierarchyEngine";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      uid: string;
      provider: "firebase";
    };

    requestId?: string;
  }

  interface FastifyInstance {
    env?: AppEnv;
    postgres?: PostgresClient;

    persistence?: PersistenceCoordinator;
    migrations?: MigrationManager | null;

    cache?: CacheHierarchyEngine;
  }
}
