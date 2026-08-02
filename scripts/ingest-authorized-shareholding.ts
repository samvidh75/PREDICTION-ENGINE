import 'dotenv/config';
import fs from 'node:fs';
import { dbAdapter } from '../src/db/DatabaseAdapter';
import { loadAuthorizedProviderConfig, authorizeProviderIngestion } from '../src/services/providers/authorization/ProviderAuthorization';
import type { AuthorizationGateResult } from '../src/services/providers/authorization/types';
import { getSharedProviderRequestBroker } from '../src/services/providers/broker/createProviderRequestBroker';

const TRACKED_FIELDS = [
  'promoter_holding',
  'institutional_holding',
  'public_holding',
  'pledged_promoter_holding',
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

interface ShareholdingSnapshot {
  symbol: string;
  period_end: string;
  promoter_holding: number | null;
  institutional_holding: number | null;
  public_holding: number | null;
  pledged_promoter_holding: number | null;
  source: string;
  source_url: string | null;
  retrieved_at: string;
}

interface SymbolSummary {
  symbol: string;
  provider: string;
  status: 'ok' | 'partial' | 'error' | 'quota_rejected' | 'schema_drift';
  fieldsPopulated: number;
  totalFields: number;
  qualityScore: number;
  error: string | null;
}

interface CliOptions {
  symbols: string[];
  limit: number;
  format: 'table' | 'json' | 'quiet';
  apply: boolean;
}

function argValue(args: string[], name: string): string | undefined {
  for (const arg of args) {
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return undefined;
}

function parseArgs(argv: string[]): CliOptions {
  const symbolArg = argValue(argv, '--symbols');
  const symbolFile = argValue(argv, '--symbol-file');
  const limitRaw = argValue(argv, '--limit');
  const formatRaw = argValue(argv, '--format');
  const limit = limitRaw ? parseInt(limitRaw, 10) : 10;
  const format = (formatRaw === 'json' || formatRaw === 'quiet') ? formatRaw : 'table';
  const apply = argv.includes('--apply') || process.env.CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY === 'true';

  let symbols: string[] = [];
  if (symbolArg) {
    symbols = symbolArg.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  } else if (symbolFile) {
    const content = fs.readFileSync(symbolFile, 'utf-8');
    symbols = content.split('\n').map(s => s.trim().toUpperCase()).filter(Boolean);
  }

  return { symbols, limit, format, apply };
}

function statusSymbol(status: string): string {
  switch (status) {
    case 'ok': return '✔';
    case 'partial': return '⚠';
    case 'error': return '✘';
    case 'quota_rejected': return '🚫';
    case 'schema_drift': return '⚡';
    default: return '?';
  }
}

function printTable(results: SymbolSummary[]): void {
  console.log('\n=== Authorized Provider Shareholding Ingestion Summary ===\n');
  console.log(`${'Symbol'.padEnd(14)} ${'Provider'.padEnd(16)} ${'Status'.padEnd(8)} ${'Fields'.padEnd(10)} ${'Quality'.padEnd(8)} Error`);
  console.log('-'.repeat(80));
  for (const r of results) {
    const fields = `${r.fieldsPopulated}/${r.totalFields}`;
    const qual = r.qualityScore > 0 ? `${r.qualityScore}%` : '-';
    const err = r.error ? r.error.slice(0, 40) : '';
    console.log(`${r.symbol.padEnd(14)} ${r.provider.padEnd(16)} ${statusSymbol(r.status).padEnd(8)} ${fields.padEnd(10)} ${qual.padEnd(8)} ${err}`);
  }
}

async function insertShareholdingSnapshot(db: typeof dbAdapter, snapshot: ShareholdingSnapshot): Promise<void> {
  await db.query(
    `INSERT INTO shareholding_snapshots (symbol, period_end, promoter_holding, institutional_holding, public_holding, pledged_promoter_holding, source, source_url, retrieved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (symbol, period_end) DO UPDATE SET
       promoter_holding = EXCLUDED.promoter_holding,
       institutional_holding = EXCLUDED.institutional_holding,
       public_holding = EXCLUDED.public_holding,
       pledged_promoter_holding = EXCLUDED.pledged_promoter_holding,
       source = EXCLUDED.source,
       source_url = EXCLUDED.source_url,
       retrieved_at = EXCLUDED.retrieved_at`,
    [snapshot.symbol, snapshot.period_end, snapshot.promoter_holding, snapshot.institutional_holding, snapshot.public_holding, snapshot.pledged_promoter_holding, snapshot.source, snapshot.source_url, snapshot.retrieved_at],
  );
}

async function insertRunRecord(db: typeof dbAdapter, runId: string, provider: string, symbolsRequested: number, succeeded: number, partial: number, failed: number): Promise<void> {
  const status = failed === symbolsRequested ? 'failed' : partial > 0 ? 'partial' : 'completed';
  await db.query(
    `INSERT INTO provider_ingestion_runs (id, provider_name, dataset_type, started_at, completed_at, status, symbols_requested, symbols_succeeded, symbols_partial, symbols_failed, rows_written)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [runId, provider, 'shareholding', new Date().toISOString(), new Date().toISOString(), status, symbolsRequested, succeeded, partial, failed, succeeded + partial],
  );
}

async function insertFieldLineage(db: typeof dbAdapter, runId: string, provider: string, symbol: string, snapshot: ShareholdingSnapshot): Promise<void> {
  const fields: Record<string, number | null> = {
    promoter_holding: snapshot.promoter_holding,
    institutional_holding: snapshot.institutional_holding,
    public_holding: snapshot.public_holding,
    pledged_promoter_holding: snapshot.pledged_promoter_holding,
  };
  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === null) continue;
    await db.query(
      `INSERT INTO provider_field_lineage (run_id, provider_name, symbol, field_name, source_as_of, retrieved_at, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [runId, provider, symbol, fieldName, snapshot.period_end, snapshot.retrieved_at, value !== null ? 1.0 : 0.0],
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.symbols.length === 0) {
    console.error('No symbols provided. Use --symbols=RELIANCE,TCS or --symbol-file=symbols.txt');
    process.exitCode = 1;
    return;
  }

  const symbols = options.symbols.slice(0, options.limit);
  const provider = 'moneycontrol';

  await dbAdapter.initialize();

  const config = loadAuthorizedProviderConfig();
  const moneycontrolConfig = config.moneycontrol;
  const authResult: AuthorizationGateResult = authorizeProviderIngestion('moneycontrol', moneycontrolConfig);

  if (!authResult.passed) {
    console.error(`[AUTH GATE] ${authResult.reason}`);
    if (!options.apply) {
      console.log('  (dry-run — authorization gate blocks execution)');
    } else {
      process.exitCode = 1;
      await dbAdapter.shutdown();
      return;
    }
  }

  if (!options.apply) {
    console.log(`[DRY-RUN] Would ingest ${symbols.length} symbols via ${provider}`);
    console.log(`  Set CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY=true and pass --apply to execute.`);
  }

  const allResults: SymbolSummary[] = [];
  const totals = { total: 0, succeeded: 0, partial: 0, failed: 0, quotaRejected: 0, schemaDrift: 0 };

  const broker = await getSharedProviderRequestBroker();
  const runId = options.apply ? `shareholding-${provider}-${Date.now()}` : null;

  for (const symbol of symbols) {
    totals.total++;
    try {
      const result = await broker.execute(
        provider, 'shareholding', symbol, {},
        async () => {
          const MoneycontrolShareholdingProvider = (await import('../src/services/providers/MoneycontrolShareholdingProvider')).MoneycontrolShareholdingProvider;
          const shareholdingProvider = new MoneycontrolShareholdingProvider();
          const data = await shareholdingProvider.getShareholding(symbol);
          return { data, status: 200 };
        },
      );

      const snapshot: ShareholdingSnapshot = {
        symbol,
        period_end: (result.data as {periodEnd?: string | null} | null)?.periodEnd || new Date().toISOString().slice(0, 7) + '-01',
        promoter_holding: (result.data as {promoterHolding?: number | null} | null)?.promoterHolding ?? null,
        institutional_holding: (result.data as {institutionalHolding?: number | null} | null)?.institutionalHolding ?? null,
        public_holding: (result.data as {publicHolding?: number | null} | null)?.publicHolding ?? null,
        pledged_promoter_holding: null,
        source: provider,
        source_url: null,
        retrieved_at: new Date().toISOString(),
      };

      const fieldsPopulated = [snapshot.promoter_holding, snapshot.institutional_holding, snapshot.public_holding, snapshot.pledged_promoter_holding]
        .filter(f => f !== null).length;
      const qualityScore = Math.round((fieldsPopulated / TRACKED_FIELDS.length) * 100);
      const status: SymbolSummary['status'] = fieldsPopulated === TRACKED_FIELDS.length ? 'ok' : fieldsPopulated > 0 ? 'partial' : 'error';

      if (status === 'ok') totals.succeeded++;
      else if (status === 'partial') totals.partial++;
      else totals.failed++;

      allResults.push({ symbol, provider, status, fieldsPopulated, totalFields: TRACKED_FIELDS.length, qualityScore, error: null });

      if (options.apply && runId) {
        await insertShareholdingSnapshot(dbAdapter, snapshot);
        await insertFieldLineage(dbAdapter, runId, provider, symbol, snapshot);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      totals.failed++;
      allResults.push({ symbol, provider, status: 'error', fieldsPopulated: 0, totalFields: TRACKED_FIELDS.length, qualityScore: 0, error: message });
    }
  }

  if (options.apply && runId) {
    await insertRunRecord(dbAdapter, runId, provider, symbols.length, totals.succeeded, totals.partial, totals.failed);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify({ results: allResults, totals, mode: options.apply ? 'apply' : 'dry-run' }, null, 2));
  } else if (options.format === 'table') {
    printTable(allResults);
    console.log(`\nTotal: ${totals.total} | Succeeded: ${totals.succeeded} | Partial: ${totals.partial} | Failed: ${totals.failed} | Quota Rejected: ${totals.quotaRejected} | Schema Drift: ${totals.schemaDrift}`);
    console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}\n`);
  }

  await dbAdapter.shutdown();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
