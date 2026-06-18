/**
 * TRACK-P4B-P3 — Canonical Migration Runner
 * 
 * Single versioned migration system. Replace split migration implementations.
 * Maintains schema_migrations table for tracking applied migrations.
 * Supports both PostgreSQL and SQLite.
 * 
 * P4B-P3D: listApplied() no longer silently returns [] on DB failure.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

export interface MigrationExecutionAdapter {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
  executeScript?(sql: string): Promise<void>;
}

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

export class MigrationRunner {
  private db: MigrationExecutionAdapter;
  private migrationsDir: string;

  constructor(db: MigrationExecutionAdapter, migrationsDir: string) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  async ensureTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);
  }

  /** listApplied throws on DB failure — no silent empty-array fallback */
  async listApplied(): Promise<MigrationRecord[]> {
    const result = await this.db.query(
      `SELECT id, checksum, applied_at FROM schema_migrations ORDER BY id ASC`
    );
    return (result.rows as Record<string, unknown>[]).map(r => ({
      id: String(r.id),
      checksum: String(r.checksum),
      appliedAt: String(r.applied_at),
    }));
  }

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

  async status(): Promise<MigrationStatus> {
    await this.ensureTable();
    const applied = await this.listApplied();
    const available = await this.listAvailable();
    const appliedIds = new Set(applied.map(a => a.id));
    const pending = available.filter(a => !appliedIds.has(a.id));

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
        ? 'Migration checksum mismatch — previously applied migration file has changed.'
        : null,
    };
  }

  async listMismatched(): Promise<{ id: string; storedChecksum: string; fileChecksum: string }[]> {
    const applied = await this.listApplied();
    const available = await this.listAvailable();
    const mismatched: { id: string; storedChecksum: string; fileChecksum: string }[] = [];
    for (const a of applied) {
      const matching = available.find(av => av.id === a.id);
      if (matching && a.checksum !== matching.checksum) {
        mismatched.push({ id: a.id, storedChecksum: a.checksum, fileChecksum: matching.checksum });
      }
    }
    return mismatched;
  }

  async runPending(force?: boolean): Promise<MigrationStatus> {
    await this.ensureTable();
    const statusResult = await this.status();
    if (statusResult.checksumMismatch) {
      if (force) {
        const mismatched = await this.listMismatched();
        console.warn('═══════════════════════════════════════════════════════════════════');
        console.warn('  ⚠️  MIGRATION CHECKSUM MISMATCH — FORCE MODE');
        console.warn('  The following applied migration files have changed on disk:');
        for (const m of mismatched) {
          console.warn(`  - ${m.id}: stored=${m.storedChecksum}  file=${m.fileChecksum}`);
        }
        console.warn('');
        console.warn('  ONLY pending migrations will be applied. Already-applied');
        console.warn('  migrations will NOT be re-run. This is safe because the');
        console.warn('  existing schema is already present in the database.');
        console.warn('═══════════════════════════════════════════════════════════════════');
      } else {
        throw new Error('Migration checksum mismatch — cannot run pending migrations safely. Use --force to bypass if you have verified safety.');
      }
    }

    const available = await this.listAvailable();
    const appliedIds = new Set((await this.listApplied()).map(a => a.id));
    const pending = available.filter(a => !appliedIds.has(a.id));

    for (const migration of pending) {
      try {
        // Use executeScript for multi-statement SQL when available (SQLite)
        if (this.db.executeScript) {
          await this.db.executeScript(migration.sql);
        } else {
          await this.db.query(migration.sql);
        }
        await this.db.query(
          `INSERT INTO schema_migrations (id, checksum, applied_at) VALUES ($1, $2, $3)`,
          [migration.id, migration.checksum, new Date().toISOString()]
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(
          `Migration "${migration.id}" failed: ${message}. ` +
          `No migrations have been applied after this failure.`,
          { cause: err },
        );
      }
    }

    return this.status();
  }
}

export default MigrationRunner;
