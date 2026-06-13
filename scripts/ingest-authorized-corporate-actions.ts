import 'dotenv/config';
import { dbAdapter } from '../src/db/DatabaseAdapter';
import { loadAuthorizedProviderConfig, authorizeProviderIngestion } from '../src/services/providers/authorization/ProviderAuthorization';
import type { AuthorizationGateResult } from '../src/services/providers/authorization/types';
import { getSharedProviderRequestBroker } from '../src/services/providers/broker/createProviderRequestBroker';

type ActionType = 'dividend' | 'split' | 'bonus' | 'rights' | 'buyback';

const VALID_ACTION_TYPES: ActionType[] = ['dividend', 'split', 'bonus', 'rights', 'buyback'];

interface CorporateActionRecord {
  symbol: string;
  action_type: ActionType;
  announcement_date: string | null;
  ex_date: string | null;
  record_date: string | null;
  value: number | null;
  ratio_text: string | null;
  source: string;
  source_url: string | null;
  source_as_of: string | null;
  retrieved_at: string;
}

interface SymbolSummary {
  symbol: string;
  provider: string;
  status: 'ok' | 'partial' | 'error' | 'quota_rejected' | 'schema_drift';
  actionsFound: number;
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
    const fs = require('node:fs');
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
  console.log('\n=== Authorized Provider Corporate Actions Ingestion Summary ===\n');
  console.log(`${'Symbol'.padEnd(14)} ${'Provider'.padEnd(16)} ${'Status'.padEnd(8)} ${'Actions'.padEnd(10)} Error`);
  console.log('-'.repeat(70));
  for (const r of results) {
    const err = r.error ? r.error.slice(0, 40) : '';
    console.log(`${r.symbol.padEnd(14)} ${r.provider.padEnd(16)} ${statusSymbol(r.status).padEnd(8)} ${String(r.actionsFound).padEnd(10)} ${err}`);
  }
}

function validateActionType(raw: string): ActionType {
  const lower = raw.toLowerCase() as ActionType;
  if (VALID_ACTION_TYPES.includes(lower)) return lower;
  return 'dividend';
}

async function insertCorporateAction(db: typeof dbAdapter, record: CorporateActionRecord): Promise<void> {
  await db.query(
    `INSERT INTO corporate_actions (symbol, action_type, announcement_date, ex_date, record_date, value, ratio_text, source, source_url, source_as_of, retrieved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [record.symbol, record.action_type, record.announcement_date, record.ex_date, record.record_date, record.value, record.ratio_text, record.source, record.source_url, record.source_as_of, record.retrieved_at],
  );
}

async function insertRunRecord(db: typeof dbAdapter, runId: string, provider: string, symbolsRequested: number, rowsWritten: number, failed: number): Promise<void> {
  const status = failed === symbolsRequested ? 'failed' : 'completed';
  await db.query(
    `INSERT INTO provider_ingestion_runs (id, provider_name, dataset_type, started_at, completed_at, status, symbols_requested, symbols_succeeded, symbols_partial, symbols_failed, rows_written)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [runId, provider, 'corporate_actions', new Date().toISOString(), new Date().toISOString(), status, symbolsRequested, symbolsRequested - failed, 0, failed, rowsWritten],
  );
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
    console.log(`[DRY-RUN] Would ingest corporate actions for ${symbols.length} symbols via ${provider}`);
    console.log(`  Set CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY=true and pass --apply to execute.`);
  }

  const allResults: SymbolSummary[] = [];
  const totals = { total: 0, succeeded: 0, partial: 0, failed: 0, quotaRejected: 0, schemaDrift: 0 };

  const broker = await getSharedProviderRequestBroker();
  const runId = options.apply ? `corp-actions-${provider}-${Date.now()}` : null;
  let totalRowsWritten = 0;

  for (const symbol of symbols) {
    totals.total++;
    try {
      const result = await broker.execute(
        provider, 'corporate_actions', symbol, {},
        async () => {
          const MoneycontrolCorporateActionsProvider = (await import('../src/services/providers/MoneycontrolCorporateActionsProvider')).MoneycontrolCorporateActionsProvider;
          const caProvider = new MoneycontrolCorporateActionsProvider();
          const data = await caProvider.getCorporateActions(symbol);
          return { data, status: 200 };
        },
      );

      const caData = result.data as { dividends?: Array<{exDate: string; dividendPerShare: number; type: string}>; splits?: Array<{exDate: string; ratio: string}>; bonuses?: Array<{exDate: string; ratio: string}> } | null;
      const allActions: CorporateActionRecord[] = [
        ...(caData?.dividends || []).map((action: any) => ({
          symbol,
          action_type: 'dividend' as const,
          announcement_date: null,
          ex_date: action.exDate,
          record_date: null,
          value: action.dividendPerShare ?? null,
          ratio_text: null,
          source: provider,
          source_url: null,
          source_as_of: null,
          retrieved_at: new Date().toISOString(),
        })),
        ...(caData?.splits || []).map((action: any) => ({
          symbol,
          action_type: 'split' as const,
          announcement_date: null,
          ex_date: action.exDate,
          record_date: null,
          value: null,
          ratio_text: action.ratio,
          source: provider,
          source_url: null,
          source_as_of: null,
          retrieved_at: new Date().toISOString(),
        })),
        ...(caData?.bonuses || []).map((action: any) => ({
          symbol,
          action_type: 'bonus' as const,
          announcement_date: null,
          ex_date: action.exDate,
          record_date: null,
          value: null,
          ratio_text: action.ratio,
          source: provider,
          source_url: null,
          source_as_of: null,
          retrieved_at: new Date().toISOString(),
        })),
      ];

      const actionsFound = allActions.length;
      const status: SymbolSummary['status'] = actionsFound > 0 ? 'ok' : 'partial';

      if (status === 'ok') totals.succeeded++;
      else totals.partial++;

      allResults.push({ symbol, provider, status, actionsFound, error: null });

      if (options.apply && runId) {
        for (const action of allActions) {
          await insertCorporateAction(dbAdapter, action);
          totalRowsWritten++;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      totals.failed++;
      allResults.push({ symbol, provider, status: 'error', actionsFound: 0, error: message });
    }
  }

  if (options.apply && runId) {
    await insertRunRecord(dbAdapter, runId, provider, symbols.length, totalRowsWritten, totals.failed);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify({ results: allResults, totals, rowsWritten: totalRowsWritten, mode: options.apply ? 'apply' : 'dry-run' }, null, 2));
  } else if (options.format === 'table') {
    printTable(allResults);
    console.log(`\nTotal: ${totals.total} | Succeeded: ${totals.succeeded} | Partial: ${totals.partial} | Failed: ${totals.failed} | Quota Rejected: ${totals.quotaRejected} | Schema Drift: ${totals.schemaDrift}`);
    console.log(`Rows written: ${totalRowsWritten} | Mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}\n`);
  }

  await dbAdapter.shutdown();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
