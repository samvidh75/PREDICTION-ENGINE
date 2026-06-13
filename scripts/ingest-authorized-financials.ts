import 'dotenv/config';
import { dbAdapter } from '../src/db/DatabaseAdapter';
import { loadAuthorizedProviderConfig, authorizeProviderIngestion } from '../src/services/providers/authorization/ProviderAuthorization';
import type { AuthorizationGateResult } from '../src/services/providers/authorization/types';
import { getSharedProviderRequestBroker } from '../src/services/providers/broker/createProviderRequestBroker';

const TRACKED_FIELDS = [
  'marketCap',
  'peRatio',
  'pbRatio',
  'eps',
  'roe',
  'debtToEquity',
  'revenueGrowth',
  'earningsGrowth',
  'operatingMargin',
  'netMargin',
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

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
  provider: string;
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
  const provider = argValue(argv, '--provider') || 'both';
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

  if (!['screener', 'moneycontrol', 'both'].includes(provider)) {
    throw new Error(`Invalid provider "${provider}". Use screener, moneycontrol, or both.`);
  }

  return { provider, symbols, limit, format, apply };
}

function authorizationClassSymbol(cls: string): string {
  switch (cls) {
    case 'AUTHORIZED_AUTOMATED_INGESTION': return '✓';
    case 'DISABLED': return '✘';
    case 'AUTHORIZATION_RECORD_MISSING': return '✘';
    case 'AUTHORIZATION_SCOPE_INSUFFICIENT': return '⚠';
    default: return '?';
  }
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
  console.log('\n=== Authorized Provider Financials Ingestion Summary ===\n');
  console.log(`${'Symbol'.padEnd(14)} ${'Provider'.padEnd(16)} ${'Status'.padEnd(8)} ${'Fields'.padEnd(10)} ${'Quality'.padEnd(8)} Error`);
  console.log('-'.repeat(80));
  for (const r of results) {
    const fields = `${r.fieldsPopulated}/${r.totalFields}`;
    const qual = r.qualityScore > 0 ? `${r.qualityScore}%` : '-';
    const err = r.error ? r.error.slice(0, 40) : '';
    console.log(`${r.symbol.padEnd(14)} ${r.provider.padEnd(16)} ${statusSymbol(r.status).padEnd(8)} ${fields.padEnd(10)} ${qual.padEnd(8)} ${err}`);
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
  const providers = options.provider === 'both' ? ['screener', 'moneycontrol'] as const : [options.provider as 'screener' | 'moneycontrol'];

  await dbAdapter.initialize();

  const config = loadAuthorizedProviderConfig();
  const allResults: SymbolSummary[] = [];
  const totals = { total: 0, succeeded: 0, partial: 0, failed: 0, quotaRejected: 0, schemaDrift: 0 };

  const broker = await getSharedProviderRequestBroker();

  for (const provider of providers) {
    const authConfig = provider === 'screener' ? config.screener : config.moneycontrol;
    const authResult: AuthorizationGateResult = authorizeProviderIngestion(provider, authConfig);

    if (!authResult.passed) {
      console.warn(`[${authorizationClassSymbol(authResult.authorizationClass)}] ${authResult.reason}`);
      if (!options.apply) {
        console.log(`  (dry-run — skipping ${provider} symbols)`);
        continue;
      }
    }

    if (!options.apply) {
      console.log(`[DRY-RUN] Would ingest ${symbols.length} symbols via ${provider}`);
    }

    for (const symbol of symbols) {
      totals.total++;
      try {
        const result = await broker.execute(
          provider, 'financials', symbol, {},
          async () => {
            const ScreenerProvider = (await import('../src/services/providers/ScreenerProvider')).ScreenerProvider;
            let screener: InstanceType<typeof ScreenerProvider> | null = null;
            try {
              screener = new ScreenerProvider();
            } catch {
              // ScreenerProvider is quarantined — will fall through
            }

            if (provider === 'screener' && !screener) {
              throw new Error('QUARANTINED: ScreenerProvider is disabled');
            }

            // For now, screener/moneycontrol both fallback to a simulated response;
            // actual provider implementations to be connected when unquarantined.
            if (options.apply) {
              // Persist to database when provider becomes available
            }

            const data = { symbol, provider, fields: {} as Record<string, unknown>, asOf: new Date().toISOString() };
            return { data, status: 200, sourceAsOf: data.asOf };
          },
        );

        const fieldsPopulated = result.data ? Object.keys((result.data as {fields?: Record<string,unknown>}).fields || {}).length : 0;
        const qualityScore = Math.round((fieldsPopulated / TRACKED_FIELDS.length) * 100);
        const status: SymbolSummary['status'] = fieldsPopulated === TRACKED_FIELDS.length ? 'ok' : fieldsPopulated > 0 ? 'partial' : 'error';

        if (status === 'ok') totals.succeeded++;
        else if (status === 'partial') totals.partial++;
        else totals.failed++;

        allResults.push({
          symbol,
          provider,
          status,
          fieldsPopulated,
          totalFields: TRACKED_FIELDS.length,
          qualityScore,
          error: null,
        });

        if (options.apply) {
          // TODO: write to provider_field_lineage, provider_ingestion_runs
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        totals.failed++;
        allResults.push({
          symbol,
          provider,
          status: 'error',
          fieldsPopulated: 0,
          totalFields: TRACKED_FIELDS.length,
          qualityScore: 0,
          error: message,
        });
      }
    }
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
