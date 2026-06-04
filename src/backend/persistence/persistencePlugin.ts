import type { FastifyPluginAsync } from "fastify";
import type { MigrationManager } from "./migrations/migrationManager";
import { createMigrationManager } from "./migrations/migrationManager";
import { createPersistenceCoordinator } from "./persistenceCoordinator";

export const persistencePlugin: FastifyPluginAsync = async (app) => {
  const persistence = createPersistenceCoordinator(app);
  const migrations: MigrationManager | null = createMigrationManager(app);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app as any).persistence = persistence;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app as any).migrations = migrations;
};
