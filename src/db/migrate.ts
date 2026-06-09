/**
 * TRACK-P4B-P3D — Migration CLI Wrapper (shutdown-guaranteed)
 *
 * Thin wrapper around MigrationRunner. Only runs pending migrations.
 * Always shuts down the adapter on success and failure.
 * Never calls process.exit() directly from normal code paths.
 */
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { dbAdapter } from "./DatabaseAdapter";
import { MigrationRunner, type MigrationStatus } from "./MigrationRunner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations(): Promise<MigrationStatus> {
  await dbAdapter.initialize();
  const migrationsDir = join(__dirname, "migrations");
  const runner = new MigrationRunner(dbAdapter, migrationsDir);

  const status = await runner.status();
  console.log(`[migrate] Applied: ${status.appliedCount}, Pending: ${status.pendingCount}`);

  if (status.checksumMismatch) {
    throw new Error(`Checksum mismatch: ${status.detail}`);
  }

  if (status.pendingCount === 0) {
    console.log("[migrate] No pending migrations. Up to date.");
    return status;
  }

  console.log("[migrate] Running pending migrations...");
  return runner.runPending();
}

// CLI entry — always runs shutdown in finally
let exitCode = 0;

(async () => {
  try {
    const result = await runMigrations();
    console.log("[migrate] Complete.");
    console.log(`  Latest: ${result.latestAppliedId}, Applied: ${result.appliedCount}`);
  } catch (err: unknown) {
    exitCode = 1;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[migrate] FAILED:", msg);
  } finally {
    await dbAdapter.shutdown();
    process.exitCode = exitCode;
  }
})();
