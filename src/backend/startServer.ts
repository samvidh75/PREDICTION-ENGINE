import { buildServer } from "./web/app.js";
import { AppHealthWatchdog } from "../services/health/AppHealthWatchdog";
import { isFirebaseAdminConfigured, getFirebaseAdminStatus } from "./auth/firebaseAdmin.js";
import { dbAdapter } from "../db/DatabaseAdapter.js";
import { MigrationRunner, type MigrationStatus } from "../db/MigrationRunner.js";
import { query } from "../db/index.js";
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
    console.info(`[migrate] Applied: ${status.appliedCount}, Pending: ${status.pendingCount}`);
    if (status.checksumMismatch) {
      if (forceMigrations) {
        const runnerForApply = new MigrationRunner(dbAdapter, migrationsDir);
        const result = await runnerForApply.runPending(true);
        console.info(`[migrate] Complete. Pending applied: ${result.appliedCount - status.appliedCount}`);
        return result;
      } else {
        console.warn("[migrate] Checksum mismatch detected. Set FORCE_MIGRATIONS=true to bypass.");
      }
    } else if (status.pendingCount > 0) {
      const runnerForApply = new MigrationRunner(dbAdapter, migrationsDir);
      const result = await runnerForApply.runPending();
      console.info(`[migrate] Complete. Pending applied: ${result.appliedCount - status.appliedCount}`);
      return result;
    } else {
      console.info("[migrate] No pending migrations. Up to date.");
      return status;
    }
  } catch (migrateErr: unknown) {
    const msg = migrateErr instanceof Error ? migrateErr.message : String(migrateErr);
    console.error(`[migrate] FAILED: ${msg}`);
    console.warn("[migrate] Continuing without migration — some features may be unavailable.");
  }
  return null;
}

async function runLineageBackfill(isApply: boolean, limitNum: number, symbolList: string[] | null): Promise<void> {
  console.info(`[maintenance] Running lineage backfill (${isApply ? "APPLY" : "DRY RUN"}) limit=${limitNum}`);
  for (const table of ["feature_snapshots", "factor_snapshots"]) {
    let sql = `SELECT fs.symbol, fs.trade_date FROM ${table} fs WHERE fs.source_provider IS NULL`;
    const params: any[] = [];
    if (symbolList && symbolList.length > 0) {
      sql += ` AND fs.symbol = ANY($${params.length + 1})`;
      params.push(symbolList);
    }
    sql += ` ORDER BY fs.trade_date DESC LIMIT $${params.length + 1}`;
    params.push(limitNum);
    const res = await query(sql, params); const rows = res.rows || [];
    console.info(`[maintenance] ${table}: scanned ${rows.length} rows`);

    let matched = 0, applied = 0, skipped = 0;
    for (const row of rows) {
      const linRes = await query(
        `SELECT source_name, source_table, as_of, retrieved_at, availability FROM prediction_input_lineage WHERE symbol=$1 AND source_table=$2 LIMIT 1`,
        [row.symbol, table]
      );
      if (linRes.rows.length > 0) {
        matched++;
        if (isApply) {
          const lin = linRes.rows[0];
          await query(
            `UPDATE ${table} SET source_provider=$1, source_domain=$2, source_as_of_date=$3::date, source_ingested_at=$4::timestamp, source_quality=$5, source_lineage_id=$6 WHERE symbol=$7 AND trade_date=$8`,
            [lin.source_name || "unknown", lin.source_table, lin.as_of, lin.retrieved_at,
             lin.availability === "real" ? "verified" : "inferred",
             `backfill-${table}-${row.symbol}-${row.trade_date}`, row.symbol, row.trade_date]
          );
          applied++;
        }
      } else {
        skipped++;
        if (isApply) {
          await query(`UPDATE ${table} SET source_provider='unknown', source_quality='lineage_unavailable', source_notes='No matching prediction_input_lineage' WHERE symbol=$1 AND trade_date=$2`,
            [row.symbol, row.trade_date]);
        }
      }
    }
    console.info(`[maintenance] ${table}: matched=${matched} applied=${applied} skipped=${skipped}`);
  }
}

async function runFundamentalsMetadata(isApply: boolean, limitNum: number, srcLabel: string): Promise<void> {
  const countRes = await query(`SELECT COUNT(*) as cnt FROM financial_snapshots WHERE source_label IS NULL OR source_label=''`);
  const totalMissing = Number(countRes.rows?.[0]?.cnt || 0);
  console.info(`[maintenance] Fundamentals metadata: ${totalMissing} rows missing source_label (${isApply ? "APPLY" : "DRY RUN"})`);

  if (isApply) {
    if (!srcLabel) { console.error("[maintenance] FUNDAMENTALS-METADATA APPLY REQUIRES --source-label"); return; }
  const upRes = await query(
      `UPDATE financial_snapshots SET source_label=$1, ingestion_timestamp=NOW()
       WHERE symbol IN (SELECT symbol FROM financial_snapshots WHERE (source_label IS NULL OR source_label='') LIMIT $2)`,
      [srcLabel, limitNum]
    );
    console.info(`[maintenance] Updated ${upRes.rowCount || 0} rows with source_label='${srcLabel}'`);
  } else {
    if (totalMissing > 0) {
      const symRes = await query(
        `SELECT DISTINCT symbol FROM financial_snapshots WHERE (source_label IS NULL OR source_label='') LIMIT $1`, [limitNum]
      );
      const symbols = (symRes.rows || []).map((r: any) => r.symbol);
      console.info(`[maintenance] Sample symbols missing source: ${symbols.join(", ")}`);
    }
  }
}

async function runCoverageDiagnostics(): Promise<void> {
  const totalRes = await query(`SELECT COUNT(*) as cnt FROM symbols`);
  const total = Number(totalRes.rows?.[0]?.cnt || 0);
  const fsRes = await query(`SELECT COUNT(DISTINCT symbol) as cnt, COUNT(*) as rows FROM financial_snapshots`);
  const fsSymbols = Number(fsRes.rows?.[0]?.cnt || 0);
  const fsRows = Number(fsRes.rows?.[0]?.rows || 0);
  const fsSrcRes = await query(`SELECT COUNT(DISTINCT symbol) as cnt FROM financial_snapshots WHERE source_label IS NOT NULL AND source_label != ''`);
  const withSource = Number(fsSrcRes.rows?.[0]?.cnt || 0);
  const predRes = await query(`SELECT COUNT(*) as cnt FROM prediction_input_lineage`);
  const predRows = Number(predRes.rows?.[0]?.cnt || 0);

  console.info(`\n[maintenance] === Coverage Diagnostics ===`);
  console.info(`  Total symbols: ${total}`);
  console.info(`  Fundamentals symbols: ${fsSymbols}`);
  console.info(`  Fundamentals rows: ${fsRows}`);
  console.info(`  Fundamentals with source_label: ${withSource}`);
  console.info(`  Prediction input lineage rows: ${predRows}`);
  console.info(`  Feature/factor lineage: pending backfill`);
  console.info(`  Known gaps: 3 no-quote, 3 no-history, 1 not-on-leaderboard`);
}

async function runStartupMaintenanceJob(): Promise<void> {
  const jobName = process.env.RUN_MAINTENANCE_JOB;
  if (!jobName) return;
  const confirm = process.env.RUN_MAINTENANCE_CONFIRM;
  const limitNum = parseInt(process.env.RUN_MAINTENANCE_LIMIT || "100", 10);
  const rawSymbols = process.env.RUN_MAINTENANCE_SYMBOLS || "";
  const symbolList = rawSymbols ? rawSymbols.split(",").map(s => s.trim()).filter(Boolean) : null;
  const srcLabel = process.env.RUN_MAINTENANCE_SOURCE_LABEL || "";
  const exitAfterRun = process.env.MAINTENANCE_EXIT_AFTER_RUN === "true";

  console.info("[maintenance] ═══════════════════════════════════════════");
  console.info(`[maintenance] Running production maintenance job: ${jobName}`);
  console.info(`[maintenance] REMOVE ENV VAR RUN_MAINTENANCE_JOB AFTER SUCCESS`);
  console.info("[maintenance] ═══════════════════════════════════════════");

  try {
    await dbAdapter.initialize();

    switch (jobName) {
      case "coverage-diagnostics":
        await runCoverageDiagnostics();
        break;
      case "lineage-backfill-dry-run":
        await runLineageBackfill(false, limitNum, symbolList);
        break;
      case "lineage-backfill-apply":
        if (confirm !== "RUN_PRODUCTION_MAINTENANCE") throw new Error("Apply requires confirm token");
        await runLineageBackfill(true, limitNum, symbolList);
        break;
      case "fundamentals-metadata-dry-run":
        await runFundamentalsMetadata(false, limitNum, srcLabel);
        break;
      case "fundamentals-metadata-apply":
        if (confirm !== "RUN_PRODUCTION_MAINTENANCE") throw new Error("Apply requires confirm token");
        await runFundamentalsMetadata(true, limitNum, srcLabel);
        break;
      default:
        console.error(`[maintenance] Unknown job: ${jobName}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[maintenance] Job failed: ${msg}`);
  }

  if (exitAfterRun) {
    console.info("[maintenance] MAINTENANCE_EXIT_AFTER_RUN=true — exiting.");
    process.exit(0);
  }
}

const port = Number(process.env.PORT ?? 4001);
const host = process.env.HOST ?? "0.0.0.0";

async function pullOllamaModel(): Promise<void> {
  const ollamaUrl = process.env.SGLANG_INTELLIGENCE_URL || process.env.SGLANG_URL || process.env.OLLAMA_URL;
  const model = process.env.OLLAMA_MODEL || 'qwen2:0.5b';
  if (!ollamaUrl) return;
  try {
    const { default: axios } = await import('axios');
    console.info(`[ollama] Checking for existing models...`);
    const tagsRes = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 10000 });
    const models = tagsRes.data.models || [];
    if (models.length > 0) {
      console.info(`[ollama] Models available: ${models.map((m: any) => m.name).join(', ')}`);
      return;
    }
    console.info(`[ollama] No models found. Cleaning blobs and pulling "${model}"...`);
    await axios.post(`${ollamaUrl}/api/pull`, { model, stream: false }, { timeout: 600000 });
    console.info(`[ollama] Model "${model}" pulled`);
  } catch (err) {
    console.warn(`[ollama] Could not pull model: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main(): Promise<void> {
  // Run production maintenance job if env var is set (inside Railway container with PG access).
  await runStartupMaintenanceJob();

  // Run pending migrations on startup.
  await runStartupMigrations();

  // Pull Ollama model if not available (Railway deployment)
  await pullOllamaModel();

  // Seed stock universe on first deploy
  try {
    const { stockUniverseService } = await import('../services/StockUniverseService');
    const { StockUniverseSyncJob } = await import('../jobs/StockUniverseSyncJob');
    const stats = await stockUniverseService.getUniverseStats();
    if (stats.totalStocks === 0) {
      console.info('[startup] Seeding stock universe...');
      await StockUniverseSyncJob.syncAll();
      console.info('[startup] Stock universe seeded');
    } else {
      console.info(`[startup] Stock universe already seeded (${stats.totalStocks} stocks)`);
    }
  } catch (err) {
    console.warn(`[startup] Could not seed stocks: ${err instanceof Error ? err.message : String(err)}`);
  }

  const app = await buildServer();

  const watchdog = new AppHealthWatchdog({
    checkIntervalMs: 30_000,
    onStatusChange: (prev, curr) => {
      console.info(`[watchdog] status: ${prev} → ${curr}`);
    },
  });
  app.decorate("watchdog", watchdog);

  await app.listen({ port, host });
  console.info(`[backend] fastify listening on http://${host}:${port}`);

  const fbStatus = getFirebaseAdminStatus();
  if (fbStatus !== 'initialized') {
    console.warn(`[backend] Firebase Admin status: ${fbStatus}`);
  } else {
    console.info('[backend] Firebase Admin initialized');
  }

  watchdog.start();
}

void main().catch((err) => {
  console.error("[backend] failed to start", err);
  process.exit(1);
});
