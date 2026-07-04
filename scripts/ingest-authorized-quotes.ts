import 'dotenv/config';
import fs from 'node:fs';
import { dbAdapter } from '../src/db/DatabaseAdapter';
import { loadAuthorizedProviderConfig, authorizeProviderIngestion } from '../src/services/providers/authorization/ProviderAuthorization';
import type { AuthorizationGateResult } from '../src/services/providers/authorization/types';
import { getSharedProviderRequestBroker } from '../src/services/providers/broker/createProviderRequestBroker';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  updatedAt?: string;
  retrievedAt?: string;
}

interface SymbolSummary {
  symbol: string;
  provider: string;
  status: 'ok' | 'partial' | 'error' | 'quota_rejected' | 'schema_drift';
  price: number | null;
  changePercent: number | null;
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
  console.log('\n=== Authorized Provider Quote Ingestion Summary ===\n');
  console.log(`${'Symbol'.padEnd(14)} ${'Provider'.padEnd(16)} ${'Status'.padEnd(8)} ${'Price'.padEnd(14)} ${'Chg%'.padEnd(10)} Error`);
  console.log('-'.repeat(80));
  for (const r of results) {
    const price = r.price !== null ? r.price.toFixed(2) : '-';
    const chg = r.changePercent !== null ? `${r.changePercent.toFixed(2)}%` : '-';
    const err = r.error ? r.error.slice(0, 40) : '';
    console.log(`${r.symbol.padEnd(14)} ${r.provider.padEnd(16)} ${statusSymbol(r.status).padEnd(8)} ${price.padEnd(14)} ${chg.padEnd(10)} ${err}`);
  }
}

async function upsertQuoteToDailyPrices(db: typeof dbAdapter, quote: StockQuote): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.query(
    `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (symbol, trade_date) DO UPDATE SET
       close = EXCLUDED.close,
       volume = EXCLUDED.volume`,
    [quote.symbol, today, quote.price, quote.price, quote.price, quote.price, quote.volume ?? null],
  );
}

async function insertRunRecord(db: typeof dbAdapter, runId: string, provider: string, symbolsRequested: number, succeeded: number, failed: number): Promise<void> {
  const status = failed === symbolsRequested ? 'failed' : 'completed';
  await db.query(
    `INSERT INTO provider_ingestion_runs (id, provider_name, dataset_type, started_at, completed_at, status, symbols_requested, symbols_succeeded, symbols_partial, symbols_failed, rows_written)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [runId, provider, 'quotes', new Date().toISOString(), new Date().toISOString(), status, symbolsRequested, succeeded, 0, failed, succeeded],
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
    console.log(`[DRY-RUN] Would fetch quotes for ${symbols.length} symbols via ${provider}`);
    console.log(`  Set CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY=true and pass --apply to execute.`);
  }

  const allResults: SymbolSummary[] = [];
  const totals = { total: 0, succeeded: 0, partial: 0, failed: 0, quotaRejected: 0, schemaDrift: 0 };

  const broker = await getSharedProviderRequestBroker();
  const runId = options.apply ? `quotes-${provider}-${Date.now()}` : null;

  for (const symbol of symbols) {
    totals.total++;
    try {
      const result = await broker.execute(
        provider, 'quote', symbol, {},
        async () => {
          const MoneycontrolQuoteProvider = (await import('../src/services/providers/MoneycontrolQuoteProvider')).MoneycontrolQuoteProvider;
          const quoteProvider = new MoneycontrolQuoteProvider();
          const quote = await quoteProvider.getQuote(symbol);
          return { data: quote, status: 200 };
        },
      );

      const quoteData = result.data as { price?: number; changePercent?: number; change?: number; volume?: number; updatedAt?: string } | null;
      const price = quoteData?.price ?? null;
      const changePercent = quoteData?.changePercent ?? null;
      const status: SymbolSummary['status'] = price !== null && price > 0 ? 'ok' : 'error';

      if (status === 'ok') totals.succeeded++;
      else totals.failed++;

      allResults.push({ symbol, provider, status, price, changePercent, error: null });

      if (options.apply) {
        const quote: StockQuote = {
          symbol,
          price: price ?? 0,
          change: quoteData?.change ?? 0,
          changePercent: changePercent ?? 0,
          volume: quoteData?.volume,
          updatedAt: quoteData?.updatedAt ?? new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
        };
        await upsertQuoteToDailyPrices(dbAdapter, quote);

        if (runId) {
          await dbAdapter.query(
            `INSERT INTO provider_field_lineage (run_id, provider_name, symbol, field_name, source_as_of, retrieved_at, confidence_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [runId, provider, symbol, 'price', quoteData?.updatedAt ?? new Date().toISOString(), quote.retrievedAt, 1.0],
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      totals.failed++;
      allResults.push({ symbol, provider, status: 'error', price: null, changePercent: null, error: message });
    }
  }

  if (options.apply && runId) {
    await insertRunRecord(dbAdapter, runId, provider, symbols.length, totals.succeeded, totals.failed);
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
