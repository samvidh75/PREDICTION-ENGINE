import 'dotenv/config';
import { dbAdapter } from '../src/db/DatabaseAdapter';

interface IngestionRun {
  id: string;
  provider_name: string;
  dataset_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  symbols_requested: number;
  symbols_succeeded: number;
  symbols_partial: number;
  symbols_failed: number;
  rows_written: number;
  schema_drift_count: number;
  quota_rejections: number;
}

interface FieldLineageRow {
  id: number;
  run_id: string;
  provider_name: string;
  symbol: string;
  field_name: string;
  source_url: string | null;
  source_as_of: string | null;
  retrieved_at: string;
  normalized_unit: string | null;
  parser_version: string | null;
  confidence_score: number;
}

interface CompletenessMatrix {
  symbol: string;
  fields: Record<string, { populated: boolean; asOf: string | null; confidence: number }>;
}

interface SchemaDriftRecord {
  run_id: string;
  provider_name: string;
  field_name: string;
  symbol: string;
  issue: string;
}

function argValue(args: string[], name: string): string | undefined {
  for (const arg of args) {
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return undefined;
}

function parseArgs(argv: string[]): { limit: number; provider?: string; json: boolean } {
  const limitRaw = argValue(argv, '--limit');
  const provider = argValue(argv, '--provider');
  const json = argv.includes('--json');
  return {
    limit: limitRaw ? parseInt(limitRaw, 10) : 10,
    provider,
    json,
  };
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await dbAdapter.query(text, params);
  return result.rows as T[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  await dbAdapter.initialize();

  let providerFilter = '';
  const providerParams: unknown[] = [];
  if (args.provider) {
    providerFilter = ' AND pir.provider_name = $1';
    providerParams.push(args.provider);
  }

  const runs = await query<IngestionRun>(
    `SELECT * FROM provider_ingestion_runs pir
     WHERE pir.dataset_type IN ('financials', 'shareholding', 'corporate_actions', 'quotes')
     ${providerFilter}
     ORDER BY pir.started_at DESC
     LIMIT $${providerParams.length + 1}`,
    [...providerParams, args.limit],
  );

  if (runs.length === 0) {
    console.log('No authorized provider ingestion runs found.');
    await dbAdapter.shutdown();
    return;
  }

  const output: Record<string, unknown> = {};

  for (const run of runs) {
    console.log(`\n=== Ingestion Run: ${run.id} ===`);
    console.log(`  Provider:     ${run.provider_name}`);
    console.log(`  Dataset:      ${run.dataset_type}`);
    console.log(`  Status:       ${run.status}`);
    console.log(`  Started:      ${run.started_at} (${timeSince(run.started_at)})`);
    console.log(`  Completed:    ${run.completed_at || 'N/A'}`);
    console.log(`  Symbols:      ${run.symbols_succeeded} succeeded, ${run.symbols_partial} partial, ${run.symbols_failed} failed`);
    console.log(`  Rows Written: ${run.rows_written}`);
    console.log(`  Schema Drift: ${run.schema_drift_count}`);
    console.log(`  Quota Rej:    ${run.quota_rejections}`);

    const lineage = await query<FieldLineageRow>(
      `SELECT * FROM provider_field_lineage WHERE run_id = $1 ORDER BY symbol, field_name`,
      [run.id],
    );

    if (lineage.length === 0) {
      console.log('  [No field lineage records for this run]\n');
      continue;
    }

    const symbols = [...new Set(lineage.map(l => l.symbol))].sort();
    const fields = [...new Set(lineage.map(l => l.field_name))].sort();

    console.log(`\n  --- Completeness Matrix: ${symbols.length} symbols x ${fields.length} fields ---\n`);

    const header = `  ${'Symbol'.padEnd(14)}${fields.map(f => f.slice(0, 8).padEnd(10)).join('')}`;
    console.log(header);
    console.log(`  ${'-'.repeat(header.length - 2)}`);

    for (const symbol of symbols) {
      const symbolLineage = lineage.filter(l => l.symbol === symbol);
      const row = `  ${symbol.padEnd(14)}${fields.map(f => {
        const entry = symbolLineage.find(l => l.field_name === f);
        if (!entry) return '  —       '.padEnd(10);
        return entry.confidence_score >= 0.5 ? '  ✔       '.padEnd(10) : '  ⚠       '.padEnd(10);
      }).join('')}`;
      console.log(row);
    }

    const completenessMatrix: CompletenessMatrix[] = symbols.map(symbol => {
      const symbolLineage = lineage.filter(l => l.symbol === symbol);
      const fieldMap: Record<string, { populated: boolean; asOf: string | null; confidence: number }> = {};
      for (const f of fields) {
        const entry = symbolLineage.find(l => l.field_name === f);
        fieldMap[f] = {
          populated: entry !== undefined && entry.confidence_score >= 0.5,
          asOf: entry?.source_as_of ?? null,
          confidence: entry?.confidence_score ?? 0,
        };
      }
      return { symbol, fields: fieldMap };
    });

    const allAsOfDates = lineage.map(l => l.source_as_of).filter(Boolean) as string[];
    let minAsOf: string | null = null;
    let maxAsOf: string | null = null;
    if (allAsOfDates.length > 0) {
      allAsOfDates.sort();
      minAsOf = allAsOfDates[0];
      maxAsOf = allAsOfDates[allAsOfDates.length - 1];
    }

    console.log(`\n  Data Freshness:`);
    console.log(`    Earliest source_as_of: ${minAsOf || 'N/A'}`);
    console.log(`    Latest source_as_of:   ${maxAsOf || 'N/A'}`);

    if (run.schema_drift_count > 0) {
      console.log(`\n  ⚡ Schema Drift Detected: ${run.schema_drift_count} occurrences`);
    }

    output[run.id] = {
      run: {
        id: run.id,
        provider: run.provider_name,
        dataset: run.dataset_type,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
      },
      symbols,
      fields,
      completenessMatrix,
      freshness: { minAsOf, maxAsOf },
      schemaDriftCount: run.schema_drift_count,
      quotaRejections: run.quota_rejections,
    };

    const schemaDriftEntries = await query<SchemaDriftRecord>(
      `SELECT run_id, provider_name, field_name, symbol, 'confidence < 0.5' as issue
       FROM provider_field_lineage
       WHERE run_id = $1 AND confidence_score < 0.5
       LIMIT 20`,
      [run.id],
    );

    if (schemaDriftEntries.length > 0) {
      console.log(`\n  Schema Drift Details (confidence < 0.5):`);
      for (const drift of schemaDriftEntries) {
        console.log(`    ${drift.symbol}.${drift.field_name} — ${drift.issue}`);
      }
    }

    console.log('');
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  }

  await dbAdapter.shutdown();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
