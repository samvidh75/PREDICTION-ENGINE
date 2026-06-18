import { buildServer } from "./web/app.js";
import { AppHealthWatchdog } from "../services/health/AppHealthWatchdog";
import { isFirebaseAdminConfigured, getFirebaseAdminStatus } from "./auth/firebaseAdmin.js";
import { dbAdapter } from "../db/DatabaseAdapter.js";
import { MigrationRunner, type MigrationStatus } from "../db/MigrationRunner.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runStartupMigrations(): Promise<MigrationStatus | null> {
  const forceMigrations = process.env.FORCE_MIGRATIONS === "true" || process.env.FORCE_MIGRATIONS === "1";
  // Use source path (consistent with health check route) since dist doesn't contain migration files.
  // In production, process.cwd() is the project root, so src/db/migrations/ is accessible.
  const migrationsDir = join(process.cwd(), "src", "db", "migrations");
  try {
    await dbAdapter.initialize();
    const runner = new MigrationRunner(dbAdapter, migrationsDir);
    const status = await runner.status();
    console.log(`[migrate] Applied: ${status.appliedCount}, Pending: ${status.pendingCount}`);
    if (status.checksumMismatch) {
      if (forceMigrations) {
        const runnerForApply = new MigrationRunner(dbAdapter, migrationsDir);
        const result = await runnerForApply.runPending(true);
        console.log(`[migrate] Complete. Pending applied: ${result.appliedCount - status.appliedCount}`);
        return result;
      } else {
        console.warn("[migrate] Checksum mismatch detected. Set FORCE_MIGRATIONS=true to bypass.");
      }
    } else if (status.pendingCount > 0) {
      const runnerForApply = new MigrationRunner(dbAdapter, migrationsDir);
      const result = await runnerForApply.runPending();
      console.log(`[migrate] Complete. Pending applied: ${result.appliedCount - status.appliedCount}`);
      return result;
    } else {
      console.log("[migrate] No pending migrations. Up to date.");
      return status;
    }
  } catch (migrateErr: unknown) {
    const msg = migrateErr instanceof Error ? migrateErr.message : String(migrateErr);
    console.error(`[migrate] FAILED: ${msg}`);
    console.warn("[migrate] Continuing without migration — some features may be unavailable.");
  }
  return null;
}

const port = Number(process.env.PORT ?? 4001);
const host = process.env.HOST ?? "0.0.0.0";

async function main(): Promise<void> {
  // Run pending migrations on startup.
  await runStartupMigrations();

  const app = await buildServer();

  const watchdog = new AppHealthWatchdog({
    checkIntervalMs: 30_000,
    onStatusChange: (prev, curr) => {
      console.log(`[watchdog] status: ${prev} → ${curr}`);
    },
  });
  app.decorate("watchdog", watchdog);

  await app.listen({ port, host });
  console.log(`[backend] fastify listening on http://${host}:${port}`);

  const fbStatus = getFirebaseAdminStatus();
  if (fbStatus !== 'initialized') {
    console.warn(`[backend] Firebase Admin status: ${fbStatus}`);
  } else {
    console.log('[backend] Firebase Admin initialized');
  }

  watchdog.start();
}

void main().catch((err) => {
  console.error("[backend] failed to start", err);
  process.exit(1);
});
