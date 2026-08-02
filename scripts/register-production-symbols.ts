import pool from '../src/db/index';
import { MasterCompanyRegistry } from '../src/services/data/MasterCompanyRegistry';

const registry = MasterCompanyRegistry.getInstance();
const registryLookup = registry.lookup.bind(registry);

const SYMBOLS_TO_REGISTER = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL',
  'SBIN', 'ITC', 'LT', 'AXISBANK', 'KOTAKBANK', 'HINDUNILVR',
  'MARUTI', 'SUNPHARMA', 'BAJFINANCE', 'HCLTECH', 'WIPRO',
  'ASIANPAINT', 'ULTRACEMCO', 'TITAN', 'NTPC', 'POWERGRID',
  'M&M', 'ADANIENT', 'ADANIPORTS', 'TATASTEEL', 'JSWSTEEL',
  'COALINDIA', 'ONGC', 'NESTLEIND', 'TECHM',
  'CHENNPETRO',
];

interface RegisterOptions {
  symbols: string[];
  apply: boolean;
}

function parseArgs(): RegisterOptions {
  const args = process.argv.slice(2);
  const opts: RegisterOptions = { symbols: [...SYMBOLS_TO_REGISTER], apply: false };
  for (const arg of args) {
    if (arg === '--apply') opts.apply = true;
    else if (arg.startsWith('--symbols=')) {
      opts.symbols = arg.replace('--symbols=', '').split(',').map(s => s.trim().toUpperCase());
    }
    else if (arg.startsWith('--symbol=')) {
      opts.symbols = [arg.replace('--symbol=', '').trim().toUpperCase()];
    }
  }
  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs();
  console.log(`Symbol registration (${opts.apply ? 'APPLY' : 'DRY-RUN'})`);
  console.log(`Symbols: ${opts.symbols.join(', ')}`);
  console.log('');

  let registered = 0;
  let skipped = 0;
  let failed = 0;

  for (const symbol of opts.symbols) {
    try {
      const existing = await pool.query('SELECT symbol FROM symbols WHERE symbol = $1', [symbol]);
      if (existing.rows.length > 0) {
        console.log(`  ${symbol}: already registered`);
        skipped++;
        continue;
      }

      const entry = registryLookup(symbol);
      if (!entry) {
        console.log(`  ${symbol}: not found in MasterCompanyRegistry, skipping`);
        skipped++;
        continue;
      }

      if (!opts.apply) {
        console.log(`  [DRY-RUN] ${symbol}: ${entry.companyName} (${entry.sector}/${entry.industry})`);
        registered++;
        continue;
      }

      await pool.query(
        `INSERT INTO symbols (symbol, exchange, isin, company_name, sector, industry, listing_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Active')
         ON CONFLICT (symbol) DO UPDATE SET
           exchange = COALESCE(NULLIF(EXCLUDED.exchange, ''), symbols.exchange),
           company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), symbols.company_name),
           sector = COALESCE(NULLIF(EXCLUDED.sector, ''), symbols.sector),
           industry = COALESCE(NULLIF(EXCLUDED.industry, ''), symbols.industry),
           listing_status = 'Active'`,
        [symbol, entry.exchange || 'NSE', entry.isin || null, entry.companyName, entry.sector || null, entry.industry || null]
      );
      console.log(`  ${symbol}: registered — ${entry.companyName}`);
      registered++;
    } catch (err: any) {
      console.error(`  ${symbol}: FAILED — ${err.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Results: ${registered} registered, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exitCode = 1;
});
