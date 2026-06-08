/**
 * TRACK-P4B-P3 — Canonical Migration Runner
 * 
 * Single versioned migration system. Replace split migration implementations.
 * Maintains schema_migrations table for tracking applied migrations.
 * Supports both PostgreSQL and SQLite.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

export interface MigrationRecord {
  id: string;
  checksum: string;
  appliedAt: string;
}

export interface MigrationStatus {
  latestAppliedId: string | null;
  appliedCount: number;
  pendingCount: number;
  checksumMismatch: boolean;
  ready: boolean;
  detail: string | null;
}

interface RunQuery {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
}

export class MigrationRunner {
  private db: RunQuery;
  private migrationsDir: string;

  constructor(db: RunQuery, migrationsDir: string) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  /** Create schema_migrations table if not exists */
  async ensureTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);
  }

  /** List applied migrations */
  async listApplied(): Promise<MigrationRecord[]> {
    try {
      const result = await this.db.query(
        `SELECT id, checksum, applied_at FROM schema_migrations ORDER BY id ASC`
      );
      return (result.rows as Record<string, unknown>[]).map(r => ({
        id: String(r.id),
        checksum: String(r.checksum),
        appliedAt: String(r.applied_at),
      }));
    } catch {
      return [];
    }
  }

  /** List available migration files (sorted by filename) */
  async listAvailable(): Promise<{ id: string; checksum: string; sql: string }[]> {
    if (!fs.existsSync(this.migrationsDir)) return [];

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(f => {
      const filePath = path.join(this.migrationsDir, f);
      const sql = fs.readFileSync(filePath, 'utf-8');
      const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 16);
      return { id: f, checksum, sql };
    });
  }

  /** Compute migration status */
  async status(): Promise<MigrationStatus> {
    await this.ensureTable();
    const applied = await this.listApplied();
    const available = await this.listAvailable();
    const appliedIds = new Set(applied.map(a => a.id));

    const pending = available.filter(a => !appliedIds.has(a.id));

    // Check for checksum mismatches on previously applied migrations
    let checksumMismatch = false;
    for (const a of applied) {
      const matching = available.find(av => av.id === a.id);
      if (matching && a.checksum !== matching.checksum) {
        checksumMismatch = true;
        break;
      }
    }

    return {
      latestAppliedId: applied.length > 0 ? applied[applied.length - 1].id : null,
      appliedCount: applied.length,
      pendingCount: pending.length,
      checksumMismatch,
      ready: !checksumMismatch,
      detail: checksumMismatch
        ? 'Migration checksum mismatch detected — previously applied migration file has changed.'
        : null,
    };
  }

  /** Run all pending migrations in sorted order */
  async runPending(): Promise<MigrationStatus> {
    await this.ensureTable();
    const statusResult = await this.status();
    if (statusResult.checksumMismatch) {
      throw new Error('Migration checksum mismatch — cannot run pending migrations safely.');
    }

    const available = await this.listAvailable();
    const appliedIds = new Set((await this.listApplied()).map(a => a.id));
    const pending = available.filter(a => !appliedIds.has(a.id));

    for (const migration of pending) {
      // Execute migration SQL (may contain multiple statements)
      await this.db.query(migration.sql);
      // Record migration
      await this.db.query(
        `INSERT INTO schema_migrations (id, checksum, applied_at) VALUES ($1, $2, $3)`,
        [migration.id, migration.checksum, new Date().toISOString()]
      );
    }

    return this.status();
  }
}

export default MigrationRunner;
