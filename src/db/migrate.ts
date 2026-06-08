/**
 * TRACK-P4B-P3 — Migration CLI Wrapper
 *
 * Thin wrapper around MigrationRunner. Only runs pending migrations.
 * Does NOT replay already-applied migrations.
 */
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { dbAdapter } from "./DatabaseAdapter";
import { MigrationRunner } from "./MigrationRunner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  try {
    console.log("[migrate] Initializing adapter...");
    await dbAdapter.initialize();

    const migrationsDir = join(__dirname, "migrations");
    const runner = new MigrationRunner(dbAdapter, migrationsDir);

    console.log("[migrate] Checking migration status...");
    const status = await runner.status();
    console.log(`  Applied: ${status.appliedCount}, Pending: ${status.pendingCount}`);

    if (status.checksumMismatch) {
      console.error("[migrate] ERROR: Checksum mismatch detected.");
      console.error(status.detail);
      process.exit(1);
    }

    if (status.pendingCount === 0) {
      console.log("[migrate] No pending migrations. Up to date.");
      process.exit(0);
    }

    console.log("[migrate] Running pending migrations...");
    const result = await runner.runPending();

    console.log("[migrate] Complete.");
    console.log(`  Latest: ${result.latestAppliedId}, Applied: ${result.appliedCount}`);
    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[migrate] FAILED:", msg);
    process.exit(1);
  }
})();
