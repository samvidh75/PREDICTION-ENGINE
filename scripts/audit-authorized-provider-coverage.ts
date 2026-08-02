import 'dotenv/config';
import { dbAdapter } from '../src/db/DatabaseAdapter';

const FINANCIAL_FIELDS = [
  'market_cap', 'pe_ratio', 'pb_ratio', 'eps', 'roe',
  'debt_to_equity', 'revenue_growth', 'profit_growth',
  'operating_margin', 'net_margin', 'dividend_yield', 'beta',
] as const;

interface CoverageRow {
  symbol: string;
  provider_name: string;
  dataset_type: string;
  row_count: number;
  last_ingested: string;
}

interface FieldCoverage {
  field: string;
  populatedCount: number;
  totalCount: number;
  percentage: number;
  providerContributions: Record<string, number>;
}

interface StaleSymbol {
  symbol: string;
  provider_name: string;
  last_ingested: string;
  hours_since: number;
}

function argValue(args: string[], name: string): string | undefined {
  for (const arg of args) {
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return undefined;
}

function parseArgs(argv: string[]): { json: boolean; thresholdHours: number; provider?: string } {
  const json = argv.includes('--json');
  const thresholdRaw = argValue(argv, '--threshold-hours');
  const provider = argValue(argv, '--provider');
  return {
    json,
    thresholdHours: thresholdRaw ? parseInt(thresholdRaw, 10) : 24,
    provider,
  };
}

async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await dbAdapter.query(text, params);
  return result.rows as T[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  await dbAdapter.initialize();

  const output: Record<string, unknown> = {};

  // 1. Coverage by provider from financial_snapshots
  console.log('=== Authorized Provider Coverage Audit ===\n');

  let providerFilter = '';
  const providerParams: unknown[] = [];
  if (args.provider) {
    providerFilter = ' AND pir.provider_name = $1';
    providerParams.push(args.provider);
  }

  const coverageByProvider = await query<CoverageRow>(
    `SELECT pir.provider_name, pir.dataset_type, COUNT(DISTINCT pfl.symbol) as row_count, MAX(pfl.retrieved_at) as last_ingested
     FROM provider_field_lineage pfl
     JOIN provider_ingestion_runs pir ON pir.id = pfl.run_id
     WHERE pir.dataset_type IN ('financials', 'shareholding', 'corporate_actions', 'quotes')
     ${providerFilter}
     GROUP BY pir.provider_name, pir.dataset_type
     ORDER BY pir.provider_name, pir.dataset_type`,
    providerParams,
  );

  if (coverageByProvider.length === 0) {
    console.log('No authorized provider coverage data found in provider_field_lineage.\n');
  } else {
    console.log('Coverage by Provider:');
    console.log(`${'Provider'.padEnd(18)} ${'Dataset'.padEnd(22)} ${'Symbols'.padEnd(10)} ${'Last Ingested'.padEnd(22)}`);
    console.log('-'.repeat(72));
    for (const row of coverageByProvider) {
      console.log(`${row.provider_name.padEnd(18)} ${row.dataset_type.padEnd(22)} ${String(row.row_count).padEnd(10)} ${(row.last_ingested || 'N/A').padEnd(22)}`);
    }
    console.log('');
  }

  output.coverageByProvider = coverageByProvider;

  // 2. Field-level coverage per provider (from financial_snapshots)
  console.log('Field-Level Coverage per Provider:\n');

  const allSymbols = await query<{ symbol: string }>('SELECT DISTINCT symbol FROM financial_snapshots');
  const totalSymbols = allSymbols.length;
  output.totalSymbols = totalSymbols;

  if (totalSymbols > 0) {
    for (const field of FINANCIAL_FIELDS) {
      const populated = await query<{ symbol: string }>(
        `SELECT symbol FROM financial_snapshots WHERE ${field} IS NOT NULL GROUP BY symbol`,
      );
      const count = populated.length;
      const pct = Math.round((count / totalSymbols) * 100);
      const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(Math.max(0, 20 - Math.floor(pct / 5)));
      console.log(`  ${field.padEnd(22)} ${String(count).padStart(5)}/${String(totalSymbols).padStart(5)} ${String(pct).padStart(3)}% ${bar}`);
    }

    // Provider-specific field contributions via lineage
    const providers = [...new Set(coverageByProvider.map(c => c.provider_name))];
    const fieldCoverageDetails: FieldCoverage[] = [];

    for (const field of FINANCIAL_FIELDS) {
      const totalPopulated = await query<{ count: number }>(
        `SELECT COUNT(DISTINCT symbol) as count FROM financial_snapshots WHERE ${field} IS NOT NULL`,
      );
      const fieldCoverage: FieldCoverage = {
        field,
        populatedCount: totalPopulated[0]?.count ?? 0,
        totalCount: totalSymbols,
        percentage: Math.round(((totalPopulated[0]?.count ?? 0) / totalSymbols) * 100),
        providerContributions: {},
      };

      for (const provider of providers) {
        const contrib = await query<{ count: number }>(
          `SELECT COUNT(DISTINCT pfl.symbol) as count
           FROM provider_field_lineage pfl
           JOIN provider_ingestion_runs pir ON pir.id = pfl.run_id
           WHERE pir.provider_name = $1 AND pfl.field_name = $2`,
          [provider, field],
        );
        fieldCoverage.providerContributions[provider] = contrib[0]?.count ?? 0;
      }

      fieldCoverageDetails.push(fieldCoverage);
    }

    output.fieldCoverage = fieldCoverageDetails;
    console.log('');
  } else {
    console.log('  No symbols found in financial_snapshots.\n');
  }

  // 3. Stale data (> threshold hours since last ingestion)
  const thresholdHours = args.thresholdHours;
  console.log(`Stale Data (>${thresholdHours}h since last ingestion):\n`);

  const staleSymbols = await query<StaleSymbol>(
    `SELECT pfl.symbol, pir.provider_name, MAX(pfl.retrieved_at) as last_ingested
     FROM provider_field_lineage pfl
     JOIN provider_ingestion_runs pir ON pir.id = pfl.run_id
     ${providerFilter ? `WHERE pir.provider_name = $1` : ''}
     GROUP BY pfl.symbol, pir.provider_name
     HAVING MAX(pfl.retrieved_at) < datetime('now', '-${thresholdHours} hours')
     ORDER BY last_ingested ASC
     LIMIT 50`,
    providerParams,
  );

  output.staleSymbols = staleSymbols;

  if (staleSymbols.length === 0) {
    console.log('  No stale data found.\n');
  } else {
    console.log(`${'Symbol'.padEnd(14)} ${'Provider'.padEnd(18)} ${'Last Ingested'.padEnd(24)} ${'Hours Ago'.padEnd(10)}`);
    console.log('-'.repeat(66));
    for (const row of staleSymbols) {
      const hoursSince = Math.round((Date.now() - new Date(row.last_ingested).getTime()) / 3_600_000);
      console.log(`${row.symbol.padEnd(14)} ${row.provider_name.padEnd(18)} ${row.last_ingested.padEnd(24)} ${String(hoursSince).padEnd(10)}`);
    }
    console.log(`\n  Total stale symbols: ${staleSymbols.length}\n`);
  }

  // 4. Symbols ingested via authorized provider vs total
  const symbolsWithAuthorizedData = await query<{ symbol: string }>(
    `SELECT DISTINCT pfl.symbol FROM provider_field_lineage pfl
     JOIN provider_ingestion_runs pir ON pir.id = pfl.run_id
     WHERE pir.provider_name IN ('screener', 'moneycontrol')`,
  );

  const unauthorizedSymbols = totalSymbols - symbolsWithAuthorizedData.length;
  output.symbolsWithAuthorizedData = symbolsWithAuthorizedData.length;
  output.symbolsWithoutAuthorizedData = Math.max(0, unauthorizedSymbols);

  console.log(`Symbols with authorized provider data: ${symbolsWithAuthorizedData.length}/${totalSymbols}`);
  if (unauthorizedSymbols > 0) {
    console.log(`Symbols missing authorized provider data: ${unauthorizedSymbols}`);
  }
  console.log('');

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  }

  await dbAdapter.shutdown();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
