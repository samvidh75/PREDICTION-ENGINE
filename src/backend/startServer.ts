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

async function runStartupMaintenanceJob(): Promise<void> {
  const jobName = process.env.RUN_MAINTENANCE_JOB;
  if (!jobName) return;
  const confirm = process.env.RUN_MAINTENANCE_CONFIRM;
  const limit = process.env.RUN_MAINTENANCE_LIMIT || "100";
  const symbols = process.env.RUN_MAINTENANCE_SYMBOLS || "";
  const sourceLabel = process.env.RUN_MAINTENANCE_SOURCE_LABEL || "";
  const sourceUrl = process.env.RUN_MAINTENANCE_SOURCE_URL || "";
  const exitAfterRun = process.env.MAINTENANCE_EXIT_AFTER_RUN === "true";

  console.log("[maintenance] ═══════════════════════════════════════════");
  console.log(`[maintenance] Running production maintenance job: ${jobName}`);
  console.log(`[maintenance] REMOVE ENV VAR RUN_MAINTENANCE_JOB AFTER SUCCESS`);
  console.log("[maintenance] ═══════════════════════════════════════════");

  try {
    await dbAdapter.initialize();
    const { execSync } = await import("child_process");
    const script = join(process.cwd(), "scripts", "run-production-maintenance-job.ts");
    const args = [`--job=${jobName}`];
    if (confirm) args.push(`--confirm=${confirm}`);
    args.push(`--limit=${limit}`);
    if (symbols) args.push(`--symbols=${symbols}`);
    if (sourceLabel) args.push(`--source-label=${sourceLabel}`);
    if (sourceUrl) args.push(`--source-url=${sourceUrl}`);
    if (confirm) args.push("--apply"); else args.push("--dry-run");

    const output = execSync(`npx tsx ${script} ${args.join(" ")}`, { encoding: "utf-8", timeout: 120000 });
    console.log(output);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[maintenance] Job failed: ${msg}`);
  }

  if (exitAfterRun) {
    console.log("[maintenance] MAINTENANCE_EXIT_AFTER_RUN=true — exiting.");
    process.exit(0);
  }
}

const port = Number(process.env.PORT ?? 4001);
const host = process.env.HOST ?? "0.0.0.0";

async function main(): Promise<void> {
  // Run production maintenance job if env var is set (inside Railway container with PG access).
  await runStartupMaintenanceJob();

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
