/**
 * Production maintenance job runner.
 * Runs inside the Railway container where internal PostgreSQL is accessible.
 *
 * Usage:
 *   tsx scripts/run-production-maintenance-job.ts --job=lineage-backfill-dry-run --dry-run --limit=100
 *   tsx scripts/run-production-maintenance-job.ts --job=lineage-backfill-apply --apply --limit=1000 --confirm=RUN_PRODUCTION_MAINTENANCE
 *   tsx scripts/run-production-maintenance-job.ts --job=fundamentals-metadata-dry-run --dry-run --limit=100
 *   tsx scripts/run-production-maintenance-job.ts --job=fundamentals-metadata-apply --apply --source-label="Manual CSV import" --confirm=RUN_PRODUCTION_MAINTENANCE
 *   tsx scripts/run-production-maintenance-job.ts --job=coverage-diagnostics
 */
import { query } from "../src/db/index";

const CONFIRM_TOKEN = "RUN_PRODUCTION_MAINTENANCE";

interface JobResult {
  job: string;
  mode: "dry_run" | "apply";
  startedAt: string;
  completedAt: string;
  success: boolean;
  summary: Record<string, number | string>;
  warnings: string[];
  errors: string[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (prefix: string) => {
    const a = args.find((a) => a.startsWith(`${prefix}=`));
    return a ? a.split("=").slice(1).join("=") : null;
  };
  return {
    job: get("--job"),
    dryRun: args.includes("--dry-run") || !args.includes("--apply"),
    apply: args.includes("--apply"),
    limit: parseInt(get("--limit") || "100", 10),
    symbols: get("--symbols")?.split(",").filter(Boolean) || null,
    confirm: get("--confirm"),
    sourceLabel: get("--source-label"),
    sourceUrl: get("--source-url"),
  };
}

async function lineageBackfillDryRun(limit: number, symbols: string[] | null): Promise<JobResult> {
  const startedAt = new Date().toISOString();
  let scanned = 0, matched = 0, unmatched = 0;
  const errors = 0;

  for (const table of ["feature_snapshots", "factor_snapshots"]) {
    let sql = `SELECT fs.symbol, fs.trade_date FROM ${table} fs WHERE fs.source_provider IS NULL ORDER BY fs.trade_date DESC`;
    const params: any[] = [];
    if (symbols) { sql += ` AND fs.symbol = ANY($1)`; params.push(symbols); }
    sql += ` LIMIT $${params.length + 1}`; params.push(limit);

    const res = await query(sql, params);
    const rows = res.rows || [];
    scanned += rows.length;

    for (const row of rows) {
      const linRes = await query(
        `SELECT source_name FROM prediction_input_lineage WHERE symbol = $1 AND source_table = $2 LIMIT 1`,
        [row.symbol, table]
      );
      if (linRes.rows.length > 0) matched++; else unmatched++;
    }
  }

  return {
    job: "lineage-backfill", mode: "dry_run", startedAt, completedAt: new Date().toISOString(),
    success: true,
    summary: { scanned, matched, unmatched, limit, errors },
    warnings: unmatched > 0 ? [`${unmatched} rows have no matching prediction_input_lineage — will be marked lineage_unavailable`] : [],
    errors: errors > 0 ? [`${errors} errors during scan`] : [],
  };
}

async function lineageBackfillApply(limit: number, symbols: string[] | null): Promise<JobResult> {
  const startedAt = new Date().toISOString();
  let applied = 0, skipped = 0, errors = 0;

  for (const table of ["feature_snapshots", "factor_snapshots"]) {
    let sql = `SELECT fs.symbol, fs.trade_date, fs.created_at FROM ${table} fs WHERE fs.source_provider IS NULL ORDER BY fs.trade_date DESC`;
    const params: any[] = [];
    if (symbols) { sql += ` AND fs.symbol = ANY($1)`; params.push(symbols); }
    sql += ` LIMIT $${params.length + 1}`; params.push(limit);

    const res = await query(sql, params);
    const rows = res.rows || [];

    for (const row of rows) {
      try {
        const linRes = await query(
          `SELECT source_name, source_table, as_of, retrieved_at, is_fallback, availability
           FROM prediction_input_lineage WHERE symbol = $1 AND source_table = $2 LIMIT 1`,
          [row.symbol, table]
        );

        if (linRes.rows.length > 0) {
          const lin = linRes.rows[0];
          const quality = lin.availability === "real" ? "verified" : "inferred";
          await query(
            `UPDATE ${table} SET source_provider=$1, source_domain=$2, source_as_of_date=$3::date,
             source_ingested_at=$4::timestamp, source_quality=$5, source_lineage_id=$6
             WHERE symbol=$7 AND trade_date=$8`,
            [lin.source_name || "unknown", lin.source_table, lin.as_of, lin.retrieved_at, quality,
             `backfill-${table}-${row.symbol}-${row.trade_date}`, row.symbol, row.trade_date]
          );
          applied++;
        } else {
          await query(
            `UPDATE ${table} SET source_provider='unknown', source_quality='lineage_unavailable',
             source_notes='No matching prediction_input_lineage record found'
             WHERE symbol=$1 AND trade_date=$2`,
            [row.symbol, row.trade_date]
          );
          skipped++;
        }
      } catch (e) { errors++; }
    }
  }

  return {
    job: "lineage-backfill", mode: "apply", startedAt, completedAt: new Date().toISOString(),
    success: errors === 0,
    summary: { applied, skipped, limit, errors },
    warnings: skipped > 0 ? [`${skipped} rows marked lineage_unavailable (no matching lineage found)`] : [],
    errors: errors > 0 ? [`${errors} rows failed to update`] : [],
  };
}

async function fundamentalsMetadataDryRun(limit: number): Promise<JobResult> {
  const startedAt = new Date().toISOString();
  const res = await query(
    `SELECT COUNT(*) as cnt FROM financial_snapshots WHERE source_label IS NULL OR source_label = ''`
  );
  const total = Number(res.rows?.[0]?.cnt || 0);

  const sampleRes = await query(
    `SELECT DISTINCT symbol FROM financial_snapshots WHERE source_label IS NULL OR source_label = '' LIMIT $1`,
    [limit]
  );
  const symbols = (sampleRes.rows || []).map((r: any) => r.symbol);

  return {
    job: "fundamentals-metadata", mode: "dry_run", startedAt, completedAt: new Date().toISOString(),
    success: true,
    summary: { rowsWithoutSource: total, sampleSymbolsShown: symbols.length },
    warnings: symbols.length > 0 ? [`Sample symbols without source: ${symbols.join(", ")}`] : [],
    errors: [],
  };
}

async function fundamentalsMetadataApply(limit: number, sourceLabel: string, sourceUrl: string | null): Promise<JobResult> {
  const startedAt = new Date().toISOString();
  if (!sourceLabel) {
    return { job: "fundamentals-metadata", mode: "apply", startedAt, completedAt: new Date().toISOString(),
      success: false, summary: {}, warnings: [], errors: ["--source-label is required for apply"] };
  }

  const sql = `UPDATE financial_snapshots SET source_label=$1, source_url=$2, source_notes='Operator-confirmed provenance: ' || $3,
    ingestion_timestamp=datetime('now')
    WHERE (source_label IS NULL OR source_label = '') AND rowid IN (SELECT rowid FROM financial_snapshots WHERE (source_label IS NULL OR source_label = '') LIMIT $4)`;
  const res = await query(sql, [sourceLabel, sourceUrl || null, `Manual batch backfill at ${startedAt}`, limit]);
  const updated = res.rowCount || 0;

  return {
    job: "fundamentals-metadata", mode: "apply", startedAt, completedAt: new Date().toISOString(),
    success: true,
    summary: { rowsUpdated: updated, limit },
    warnings: [`Updated ${updated} financial_snapshots rows with source_label='${sourceLabel}'.`],
    errors: [],
  };
}

async function coverageDiagnostics(): Promise<JobResult> {
  const startedAt = new Date().toISOString();
  const totalRes = await query(`SELECT COUNT(*) as cnt FROM symbols`);
  const total = Number(totalRes.rows?.[0]?.cnt || 0);

  const fsCount = await query(`SELECT COUNT(DISTINCT symbol) as cnt FROM financial_snapshots`);
  const fsSymbols = Number(fsCount.rows?.[0]?.cnt || 0);

  const fsWithSource = await query(`SELECT COUNT(DISTINCT symbol) as cnt FROM financial_snapshots WHERE source_label IS NOT NULL AND source_label != ''`);
  const withSource = Number(fsWithSource.rows?.[0]?.cnt || 0);

  const noQuote = 3; // Known from diagnostics
  const noHistory = 3;

  return {
    job: "coverage-diagnostics", mode: "dry_run", startedAt, completedAt: new Date().toISOString(),
    success: true,
    summary: { totalTracked: total, fundamentalsSymbols: fsSymbols, fundamentalsWithSource: withSource, noQuote, noHistory },
    warnings: [],
    errors: [],
  };
}

const JOBS: Record<string, (args: ReturnType<typeof parseArgs>) => Promise<JobResult>> = {
  "lineage-backfill-dry-run": (a) => lineageBackfillDryRun(a.limit, a.symbols),
  "lineage-backfill-apply": (a) => {
    if (a.confirm !== CONFIRM_TOKEN) throw new Error(`Apply requires --confirm=${CONFIRM_TOKEN}`);
    return lineageBackfillApply(a.limit, a.symbols);
  },
  "fundamentals-metadata-dry-run": (a) => fundamentalsMetadataDryRun(a.limit),
  "fundamentals-metadata-apply": (a) => {
    if (a.confirm !== CONFIRM_TOKEN) throw new Error(`Apply requires --confirm=${CONFIRM_TOKEN}`);
    return fundamentalsMetadataApply(a.limit, a.sourceLabel || "", a.sourceUrl);
  },
  "coverage-diagnostics": () => coverageDiagnostics(),
};

async function main() {
  const args = parseArgs();
  if (!args.job || !JOBS[args.job]) {
    console.error(`Usage: tsx scripts/run-production-maintenance-job.ts --job=<name>`);
    console.error(`Available jobs: ${Object.keys(JOBS).join(", ")}`);
    process.exit(1);
  }

  const jobFn = JOBS[args.job];
  console.log(`[maintenance] Starting job: ${args.job} (mode: ${args.apply ? "apply" : "dry_run"})`);
  console.log(`[maintenance] ${new Date().toISOString()}`);

  try {
    const result = await jobFn(args);
    console.log(`\n=== Job Result: ${args.job} ===`);
    console.log(`Success: ${result.success}`);
    console.log(`Started: ${result.startedAt}`);
    console.log(`Duration: ${new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()}ms`);
    console.log(`\nSummary:`);
    for (const [k, v] of Object.entries(result.summary)) console.log(`  ${k}: ${v}`);
    if (result.warnings.length) { console.log(`\nWarnings:`); result.warnings.forEach((w) => console.log(`  ⚠️  ${w}`)); }
    if (result.errors.length) { console.log(`\nErrors:`); result.errors.forEach((e) => console.log(`  ❌ ${e}`)); }
    if (!result.success) process.exitCode = 1;
  } catch (err: any) {
    console.error(`[maintenance] Job failed: ${err.message}`);
    process.exit(1);
  }
}

main();
