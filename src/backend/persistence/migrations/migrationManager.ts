import type { FastifyInstance } from "fastify";

export type MigrationStatus = "pending" | "applied" | "failed";

type MigrationRecord = {
  id: string;
  status: MigrationStatus;
  appliedAt?: number;
};

type UserDb = {
  query(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>;
};

export class MigrationManager {
  private db: UserDb;

  constructor(db: UserDb) {
    this.db = db;
  }

  /**
   * Ensures the schema_migrations bookkeeping table exists.
   * This is the discipline layer: migrations must be repeatable and auditable.
   */
  async ensureMigrationsTable(): Promise<void> {
    await this.db.query(
      `
      create table if not exists schema_migrations (
        id text primary key,
        applied_at bigint not null default (extract(epoch from now()) * 1000)
      );
    `,
    );
  }

  async listAppliedMigrations(): Promise<Set<string>> {
    const { rows } = await this.db.query(
      `select id from schema_migrations;`,
    );

    return new Set(rows.map((r) => String(r.id)));
  }

  /**
   * Runs migrations safely (skeleton only).
   * - in production, provide ordered migration steps (SQL or query builder)
   * - keep each migration idempotent
   */
  async runMigrations(args: { migrations: Array<{ id: string; upSql: string }> }): Promise<void> {
    await this.ensureMigrationsTable();
    const applied = await this.listAppliedMigrations();

    for (const m of args.migrations) {
      if (applied.has(m.id)) continue;

      await this.db.query(m.upSql);
      await this.db.query(`insert into schema_migrations(id) values($1) on conflict do nothing;`, [m.id]);
    }
  }
}

/**
 * Helper for app integration.
 */
export function createMigrationManager(app: FastifyInstance): MigrationManager | null {
  const db = app.userDb;
  if (!db) return null;
  return new MigrationManager(db);
}
